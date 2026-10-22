from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

def class_to_fdi(class_id: int):
    """Map the trained 32 segmentation classes to permanent FDI tooth numbers."""
    if 0 <= class_id <= 7:
        return 11 + class_id
    if 8 <= class_id <= 15:
        return 21 + class_id - 8
    if 16 <= class_id <= 23:
        return 31 + class_id - 16
    if 24 <= class_id <= 31:
        return 41 + class_id - 24
    return None

class DentalPipeline:
    def __init__(self, segmentation_path: Path, disease_path: Path):
        if not segmentation_path.is_file():
            raise FileNotFoundError(f"Segmentation checkpoint not found: {segmentation_path}")
        if not disease_path.is_file():
            raise FileNotFoundError(f"Disease checkpoint not found: {disease_path}")
        self.seg_model = YOLO(str(segmentation_path))
        self.disease_model = YOLO(str(disease_path))

    def analyze(self, pil_image: Image.Image):
        rgb = np.asarray(pil_image.convert("RGB"))
        height, width = rgb.shape[:2]

        seg = self.seg_model.predict(source=rgb, conf=0.25, verbose=False)[0]
        dis = self.disease_model.predict(source=rgb, conf=0.25, iou=0.3, verbose=False)[0]

        masks = []
        tooth_classes = []
        tooth_conf = []
        if seg.masks is not None and seg.boxes is not None:
            raw_masks = seg.masks.data.cpu().numpy()
            tooth_classes = seg.boxes.cls.cpu().numpy().astype(int)
            tooth_conf = seg.boxes.conf.cpu().numpy()
            for raw in raw_masks:
                mask = cv2.resize(
                    (raw > 0.5).astype(np.uint8),
                    (width, height),
                    interpolation=cv2.INTER_NEAREST
                ).astype(bool)
                masks.append(mask)

        disease_boxes = dis.boxes.xyxy.cpu().numpy() if dis.boxes is not None else np.empty((0, 4))
        disease_classes = dis.boxes.cls.cpu().numpy().astype(int) if dis.boxes is not None else []
        disease_conf = dis.boxes.conf.cpu().numpy() if dis.boxes is not None else []

        rows = []
        overlay = rgb.copy()

        # Subtle green masks with FDI labels. Labels are predictions, not verified anatomy.
        for i, mask in enumerate(masks):
            overlay[mask] = (
                0.80 * overlay[mask] + 0.20 * np.array([0, 230, 120])
            ).astype(np.uint8)
            fdi = class_to_fdi(int(tooth_classes[i]))
            ys, xs = np.where(mask)
            if fdi is not None and len(xs):
                cx, cy = int(xs.mean()), int(ys.mean())
                cv2.putText(
                    overlay, str(fdi), (cx, cy), cv2.FONT_HERSHEY_SIMPLEX,
                    0.42, (255, 255, 0), 1, cv2.LINE_AA
                )

        for idx, box in enumerate(disease_boxes):
            x1, y1, x2, y2 = [int(v) for v in box]
            x1, x2 = max(0, x1), min(width, x2)
            y1, y2 = max(0, y1), min(height, y2)
            box_mask = np.zeros((height, width), dtype=bool)
            box_mask[y1:y2, x1:x2] = True
            box_area = int(box_mask.sum())

            candidates = []
            for t_idx, mask in enumerate(masks):
                tooth_area = int(mask.sum())
                if tooth_area == 0 or box_area == 0:
                    continue
                intersection = int(np.logical_and(mask, box_mask).sum())
                union = tooth_area + box_area - intersection
                coverage = intersection / tooth_area
                iou = intersection / union if union else 0.0
                candidates.append((iou, coverage, t_idx))

            candidates.sort(reverse=True)
            best = candidates[0] if candidates else None
            disease_name = self.disease_model.names[int(disease_classes[idx])]
            dconf = float(disease_conf[idx])

            candidate_fdi = None
            candidate_conf = None
            coverage = 0.0
            iou = 0.0
            if best is not None:
                iou, coverage, t_idx = best
                candidate_fdi = class_to_fdi(int(tooth_classes[t_idx]))
                candidate_conf = float(tooth_conf[t_idx])

            # Provisional engineering flags only; not clinical confidence thresholds.
            if dconf < 0.30:
                status = "Low-confidence disease prediction; review"
            elif best is None or coverage < 0.20:
                status = "No confident tooth match; review"
                candidate_fdi = None
            elif coverage < 0.50:
                status = "Uncertain tooth match; review"
            else:
                status = "Candidate match; review required"

            cv2.rectangle(overlay, (x1, y1), (x2, y2), (255, 60, 60), 2)
            label = f"{idx + 1}: {disease_name}"
            cv2.putText(
                overlay, label, (x1, max(18, y1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 70, 70), 2, cv2.LINE_AA
            )

            rows.append({
                "Detection": idx + 1,
                "Disease": disease_name,
                "Disease confidence": round(dconf, 3),
                "Candidate FDI": candidate_fdi,
                "Tooth confidence": round(candidate_conf, 3) if candidate_conf is not None else None,
                "Mask coverage": round(coverage, 3),
                "IoU": round(iou, 3),
                "Status": status,
            })

        return Image.fromarray(overlay), rows
