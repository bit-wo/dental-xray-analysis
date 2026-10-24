"""
Flask REST API for Dental X-ray Analysis.
Wraps the existing YOLO-based pipeline for tooth segmentation and disease detection.
"""

import io
import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, PageBreak, KeepTogether
)
from ultralytics import YOLO
from werkzeug.utils import secure_filename

# Import existing pipeline logic
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from pipeline import DentalPipeline, enhance_xray, class_to_fdi


# ---------------- CONFIGURATION ----------------

MODEL_DIR = Path(__file__).parent.parent / "models"
SEG_MODEL_PATH = MODEL_DIR / "tooth-segmentation.pt"
DISEASE_MODEL_PATH = MODEL_DIR / "dental-disease.pt"

TEMP_DIR = Path(__file__).parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}

# ---------------- MODEL LOADING ----------------

pipeline: Optional[DentalPipeline] = None
startup_error: Optional[str] = None

try:
    pipeline = DentalPipeline(SEG_MODEL_PATH, DISEASE_MODEL_PATH)
except Exception as exc:
    startup_error = str(exc)

# Get disease class names from the model if available
DISEASE_CLASSES = []
if pipeline and pipeline.disease_model:
    DISEASE_CLASSES = list(pipeline.disease_model.names.values())


# ---------------- HELPER FUNCTIONS ----------------

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def validate_image_file(file_path: Path) -> tuple[bool, Optional[str]]:
    """Validate that the file is a readable image."""
    try:
        with Image.open(file_path) as img:
            img.verify()
        with Image.open(file_path) as img:
            img.load()
        return True, None
    except Exception as exc:
        return False, f"Invalid image file: {exc}"


def save_temp_image(image: Image.Image, prefix: str = "result") -> str:
    """Save an image to temp directory and return the filename."""
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.png"
    filepath = TEMP_DIR / filename
    image.save(filepath, "PNG")
    return filename


def cleanup_old_temp_files(max_age_hours: int = 24):
    """Remove temp files older than max_age_hours."""
    import time
    now = time.time()
    for file in TEMP_DIR.glob("*"):
        if file.is_file() and (now - file.stat().st_mtime) > max_age_hours * 3600:
            try:
                file.unlink()
            except OSError:
                pass


def create_overlay_images(
    original: Image.Image,
    seg_masks: list[np.ndarray],
    tooth_classes: list[int],
    tooth_conf: list[float],
    disease_boxes: np.ndarray,
    disease_classes: np.ndarray,
    disease_conf: np.ndarray,
    matches: list[dict],
) -> dict[str, str]:
    """
    Create separate overlay images for each view type.
    Returns dict of view_name -> saved filename.
    """
    rgb = np.asarray(original.convert("RGB"))
    height, width = rgb.shape[:2]
    filenames = {}

    # 1. Original (just save as-is)
    filenames["original"] = save_temp_image(original, "original")

    # 2. Enhanced (CLAHE)
    enhanced = enhance_xray(original)
    filenames["enhanced"] = save_temp_image(enhanced, "enhanced")

    # 3. Segmentation overlay only
    seg_overlay = rgb.copy()
    for i, mask in enumerate(seg_masks):
        if mask is not None and mask.any():
            seg_overlay[mask] = (
                0.80 * seg_overlay[mask] + 0.20 * np.array([0, 230, 120])
            ).astype(np.uint8)

            fdi = class_to_fdi(int(tooth_classes[i]))
            ys, xs = np.where(mask)
            if fdi is not None and len(xs):
                cx, cy = int(xs.mean()), int(ys.mean())
                cv2.putText(
                    seg_overlay,
                    str(fdi),
                    (cx, cy),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.42,
                    (255, 255, 0),
                    1,
                    cv2.LINE_AA,
                )
    filenames["segmentation"] = save_temp_image(Image.fromarray(seg_overlay), "segmentation")

    # 4. Disease detection overlay only
    disease_overlay = rgb.copy()
    for idx, box in enumerate(disease_boxes):
        x1, y1, x2, y2 = [int(v) for v in box]
        x1, x2 = max(0, x1), min(width, x2)
        y1, y2 = max(0, y1), min(height, y2)
        cv2.rectangle(disease_overlay, (x1, y1), (x2, y2), (255, 60, 60), 2)
        label = f"{idx + 1}: {disease_classes[idx]}"
        cv2.putText(
            disease_overlay,
            label,
            (x1, max(18, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 70, 70),
            2,
            cv2.LINE_AA,
        )
    filenames["disease"] = save_temp_image(Image.fromarray(disease_overlay), "disease")

    # 5. Combined annotated (segmentation + disease + matches)
    combined = rgb.copy()
    # Draw segmentation
    for i, mask in enumerate(seg_masks):
        if mask is not None and mask.any():
            combined[mask] = (
                0.80 * combined[mask] + 0.20 * np.array([0, 230, 120])
            ).astype(np.uint8)
            fdi = class_to_fdi(int(tooth_classes[i]))
            ys, xs = np.where(mask)
            if fdi is not None and len(xs):
                cx, cy = int(xs.mean()), int(ys.mean())
                cv2.putText(
                    combined,
                    str(fdi),
                    (cx, cy),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.42,
                    (255, 255, 0),
                    1,
                    cv2.LINE_AA,
                )
    # Draw disease boxes
    for idx, box in enumerate(disease_boxes):
        x1, y1, x2, y2 = [int(v) for v in box]
        x1, x2 = max(0, x1), min(width, x2)
        y1, y2 = max(0, y1), min(height, y2)
        cv2.rectangle(combined, (x1, y1), (x2, y2), (255, 60, 60), 2)
        match = matches[idx] if idx < len(matches) else {}
        label = f"{idx + 1}: {disease_classes[idx]}"
        if match.get("candidate_fdi"):
            label += f" (FDI {match['candidate_fdi']})"
        cv2.putText(
            combined,
            label,
            (x1, max(18, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 70, 70),
            2,
            cv2.LINE_AA,
        )
    filenames["combined"] = save_temp_image(Image.fromarray(combined), "combined")

    return filenames


# ---------------- FLASK APP ----------------

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint - reports backend and model readiness."""
    models_loaded = pipeline is not None
    return jsonify({
        "status": "ok" if models_loaded else "error",
        "models_loaded": models_loaded,
        "startup_error": startup_error,
        "disease_classes": DISEASE_CLASSES,
        "segmentation_classes": 32,  # Fixed: 32 FDI tooth classes
    })


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """Analyze a dental X-ray image."""
    if not pipeline:
        return jsonify({
            "success": False,
            "error": "Models not loaded",
            "details": startup_error
        }), 503

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 400

    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_FILE_SIZE:
        return jsonify({
            "success": False,
            "error": f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)} MB"
        }), 413

    # Save to temp and validate
    temp_id = uuid.uuid4().hex[:12]
    temp_filename = f"upload_{temp_id}_{secure_filename(file.filename)}"
    temp_path = TEMP_DIR / temp_filename

    try:
        file.save(temp_path)
    except Exception as exc:
        return jsonify({"success": False, "error": f"Failed to save upload: {exc}"}), 500

    try:
        valid, error = validate_image_file(temp_path)
        if not valid:
            return jsonify({"success": False, "error": error}), 400

        # Load image
        original_image = Image.open(temp_path).convert("RGB")
        width, height = original_image.size

        # Run analysis using enhanced image for inference
        enhanced_image = enhance_xray(original_image)
        rgb = np.asarray(enhanced_image)

        # Run segmentation
        seg = pipeline.seg_model.predict(
            source=rgb, conf=0.25, verbose=False
        )[0]

        # Run disease detection
        dis = pipeline.disease_model.predict(
            source=rgb, conf=0.25, iou=0.3, verbose=False
        )[0]

        # Extract segmentation results
        masks = []
        tooth_classes = []
        tooth_conf = []

        if seg.masks is not None and seg.boxes is not None:
            raw_masks = seg.masks.data.cpu().numpy()
            tooth_classes = seg.boxes.cls.cpu().numpy().astype(int).tolist()
            tooth_conf = seg.boxes.conf.cpu().numpy().tolist()

            for raw in raw_masks:
                mask = cv2.resize(
                    (raw > 0.5).astype(np.uint8),
                    (width, height),
                    interpolation=cv2.INTER_NEAREST
                ).astype(bool)
                masks.append(mask)

        # Extract disease results
        disease_boxes = (
            dis.boxes.xyxy.cpu().numpy()
            if dis.boxes is not None
            else np.empty((0, 4))
        )
        disease_class_ids = (
            dis.boxes.cls.cpu().numpy().astype(int)
            if dis.boxes is not None
            else np.array([])
        )
        disease_conf = (
            dis.boxes.conf.cpu().numpy()
            if dis.boxes is not None
            else np.array([])
        )

        disease_class_names = [
            pipeline.disease_model.names[int(cid)] for cid in disease_class_ids
        ]

        # Match diseases to teeth
        matches = []
        rows = []

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

            dconf = float(disease_conf[idx]) if idx < len(disease_conf) else 0.0

            candidate_fdi = None
            candidate_conf = None
            coverage = 0.0
            iou = 0.0

            if best is not None:
                iou, coverage, t_idx = best
                candidate_fdi = class_to_fdi(int(tooth_classes[t_idx]))
                candidate_conf = float(tooth_conf[t_idx])

            if dconf < 0.30:
                status = "Low-confidence disease prediction; review"
            elif best is None or coverage < 0.20:
                status = "No confident tooth match; review"
                candidate_fdi = None
            elif coverage < 0.50:
                status = "Uncertain tooth match; review"
            else:
                status = "Candidate match; review required"

            match_info = {
                "detection_index": idx + 1,
                "disease": disease_class_names[idx],
                "disease_confidence": round(dconf, 3),
                "candidate_fdi": candidate_fdi,
                "tooth_confidence": round(candidate_conf, 3) if candidate_conf else None,
                "mask_coverage": round(coverage, 3),
                "iou": round(iou, 3),
                "status": status,
            }
            matches.append(match_info)

            rows.append({
                "detection": idx + 1,
                "disease": disease_class_names[idx],
                "disease_confidence": round(dconf, 3),
                "candidate_fdi": candidate_fdi,
                "tooth_confidence": round(candidate_conf, 3) if candidate_conf else None,
                "mask_coverage": round(coverage, 3),
                "iou": round(iou, 3),
                "status": status,
            })

        # Generate overlay images
        image_files = create_overlay_images(
            original_image,
            masks,
            tooth_classes,
            tooth_conf,
            disease_boxes,
            np.array(disease_class_names),
            disease_conf,
            matches,
        )

        # Build response
        response = {
            "success": True,
            "image": {
                "width": width,
                "height": height,
            },
            "segmentation": {
                "teeth_count": len(masks),
                "teeth": [
                    {
                        "class_id": tooth_classes[i],
                        "fdi": class_to_fdi(int(tooth_classes[i])),
                        "confidence": round(tooth_conf[i], 3),
                    }
                    for i in range(len(masks))
                ],
            },
            "detections": rows,
            "summary": {
                "total_teeth_segmented": len(masks),
                "total_detections": len(rows),
                "detection_categories": list(set(r["disease"] for r in rows)) if rows else [],
                "matched_detections": sum(
                    1 for r in rows if r["candidate_fdi"] is not None
                ),
            },
            "images": {
                "original": f"/api/images/{image_files['original']}",
                "enhanced": f"/api/images/{image_files['enhanced']}",
                "segmentation": f"/api/images/{image_files['segmentation']}",
                "disease": f"/api/images/{image_files['disease']}",
                "combined": f"/api/images/{image_files['combined']}",
            },
        }

        # Cleanup upload file
        try:
            temp_path.unlink()
        except OSError:
            pass

        # Periodic cleanup
        cleanup_old_temp_files()

        return jsonify(response)

    except Exception as exc:
        # Cleanup on error
        try:
            temp_path.unlink()
        except OSError:
            pass
        return jsonify({
            "success": False,
            "error": "Analysis failed",
            "details": str(exc)
        }), 500


@app.route("/api/images/<filename>", methods=["GET"])
def get_image(filename: str):
    """Serve generated images from temp directory."""
    # Security: only allow alphanumeric, underscore, hyphen, dot
    import re
    if not re.match(r"^[a-zA-Z0-9_.-]+$", filename):
        return jsonify({"error": "Invalid filename"}), 400

    filepath = TEMP_DIR / filename
    if not filepath.is_file():
        return jsonify({"error": "Image not found"}), 404

    return send_file(filepath, mimetype="image/png")


# ---------------- PDF REPORT GENERATION ----------------

def generate_pdf_report(analysis_data: dict, original_filename: str = "unknown") -> bytes:
    """Generate a PDF report from analysis data."""
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        spaceAfter=6,
        textColor=colors.HexColor('#1e293b'),
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        spaceAfter=4,
        spaceBefore=12,
        textColor=colors.HexColor('#334155'),
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=4,
        textColor=colors.HexColor('#334155'),
    )
    
    small_style = ParagraphStyle(
        'CustomSmall',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        spaceAfter=2,
        textColor=colors.HexColor('#64748b'),
    )
    
    disclaimer_style = ParagraphStyle(
        'DisclaimerStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        spaceAfter=6,
        spaceBefore=6,
        textColor=colors.HexColor('#78350f'),
        backColor=colors.HexColor('#fef3c7'),
        borderPadding=8,
        borderWidth=1,
        borderColor=colors.HexColor('#fcd34d'),
    )
    
    story = []
    
    # Title
    story.append(Paragraph("Dental X-ray Analysis Report", title_style))
    story.append(Paragraph("Research Prototype — Not for Clinical Use", ParagraphStyle(
        'Subtitle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#dc2626'), spaceAfter=12
    )))
    story.append(Spacer(1, 6))
    
    # Metadata
    story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body_style))
    story.append(Paragraph(f"<b>Source Image:</b> {original_filename}", body_style))
    story.append(Paragraph(f"<b>Image Dimensions:</b> {analysis_data.get('image', {}).get('width', 'N/A')} × {analysis_data.get('image', {}).get('height', 'N/A')} px", body_style))
    story.append(Spacer(1, 8))
    
    # Disclaimer
    disclaimer_text = (
        "<b>IMPORTANT DISCLAIMER:</b> This report is generated from model predictions for research "
        "and educational purposes only. It is <b>not clinically validated</b> and must not be used "
        "for diagnosis, treatment planning, or any clinical decision-making. All model predictions "
        "(segmentation, disease detection, tooth numbering) can be incorrect. A qualified dental "
        "professional must review the original radiograph."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))
    story.append(Spacer(1, 6))
    
    # Summary section
    story.append(Paragraph("Summary", subtitle_style))
    
    summary = analysis_data.get('summary', {})
    segmentation = analysis_data.get('segmentation', {})
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Teeth Segmented', str(summary.get('total_teeth_segmented', segmentation.get('teeth_count', 0)))],
        ['Total Disease Detections', str(summary.get('total_detections', 0))],
        ['Matched Detections (Tooth Association)', str(summary.get('matched_detections', 0))],
        ['Unmatched Detections', str(summary.get('total_detections', 0) - summary.get('matched_detections', 0))],
    ]
    
    det_cats = summary.get('detection_categories', [])
    if det_cats:
        summary_data.append(['Detection Categories', ', '.join(det_cats)])
    
    summary_table = Table(summary_data, colWidths=[100*mm, 70*mm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0d9488')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fdfa')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#99f6e4')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 12))
    
    # Segmentation details
    if segmentation.get('teeth'):
        story.append(Paragraph("Segmented Teeth", subtitle_style))
        seg_data = [['FDI', 'Class ID', 'Confidence']]
        for tooth in sorted(segmentation['teeth'], key=lambda t: t.get('fdi') or 99):
            fdi = f"FDI {tooth['fdi']}" if tooth.get('fdi') else 'Unknown'
            seg_data.append([
                fdi,
                str(tooth.get('class_id', 'N/A')),
                f"{tooth.get('confidence', 0)*100:.1f}%"
            ])
        
        seg_table = Table(seg_data, colWidths=[60*mm, 40*mm, 70*mm])
        seg_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0d9488')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fdfa')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#99f6e4')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(seg_table)
        story.append(Spacer(1, 12))
    
    # Disease detections
    detections = analysis_data.get('detections', [])
    if detections:
        story.append(Paragraph("Disease Findings", subtitle_style))
        
        det_data = [['#', 'Disease', 'Confidence', 'Candidate FDI', 'Tooth Conf.', 'Mask Cov.', 'IoU', 'Status']]
        for det in detections:
            fdi = f"FDI {det['candidate_fdi']}" if det.get('candidate_fdi') else 'Not assigned'
            tooth_conf = f"{det['tooth_confidence']*100:.1f}%" if det.get('tooth_confidence') is not None else 'N/A'
            mask_cov = f"{det.get('mask_coverage', 0)*100:.1f}%"
            iou = f"{det.get('iou', 0)*100:.1f}%"
            status = det.get('status', 'Unknown')
            # Shorten status for table
            if 'Candidate match' in status:
                status = 'Candidate match'
            elif 'Uncertain' in status:
                status = 'Uncertain match'
            elif 'No confident' in status:
                status = 'No match'
            elif 'Low-confidence' in status:
                status = 'Low confidence'
            
            det_data.append([
                str(det.get('detection', '')),
                det.get('disease', ''),
                f"{det.get('disease_confidence', 0)*100:.1f}%",
                fdi,
                tooth_conf,
                mask_cov,
                iou,
                status,
            ])
        
        det_table = Table(det_data, colWidths=[10*mm, 25*mm, 20*mm, 25*mm, 20*mm, 20*mm, 20*mm, 30*mm])
        det_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fef2f2')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fecaca')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(det_table)
        story.append(Spacer(1, 12))
    else:
        story.append(Paragraph("No disease detections found above the configured threshold.", body_style))
        story.append(Paragraph("This does not establish that the X-ray is free of disease. Manual professional review is required.", small_style))
        story.append(Spacer(1, 12))
    
    # Interpretation section
    if detections:
        story.append(Paragraph("Findings Interpretation", subtitle_style))
        for det in detections:
            fdi = f"FDI {det['candidate_fdi']}" if det.get('candidate_fdi') else 'Not assigned'
            disease = det.get('disease', 'Unknown')
            conf = f"{det.get('disease_confidence', 0)*100:.1f}%"
            
            interp_text = (
                f"<b>Finding {det.get('detection', '')}: {disease}</b> (Model confidence: {conf}). "
                f"Candidate tooth: {fdi}. "
            )
            if det.get('candidate_fdi'):
                interp_text += (
                    f"The model detected a potential {disease.lower()} finding and geometrically "
                    f"associated it with candidate FDI tooth {det['candidate_fdi']}. "
                )
            else:
                interp_text += (
                    f"The model detected a potential {disease.lower()} finding, but it did not "
                    f"assign a sufficiently supported candidate tooth. "
                )
            interp_text += "Manual review by a qualified dental professional is required."
            
            story.append(Paragraph(interp_text, body_style))
            story.append(Spacer(1, 4))
    
    # Add annotated image if available
    if analysis_data.get('images', {}).get('combined'):
        story.append(Paragraph("Annotated Image (Combined View)", subtitle_style))
        story.append(Paragraph(
            "Green: predicted tooth masks. Yellow: candidate FDI labels. "
            "Red: disease detection boxes. These are predictions, not verified anatomy.",
            small_style
        ))
        story.append(Spacer(1, 6))
        
        try:
            # Try to load and embed the combined image
            img_url = analysis_data['images']['combined']
            # Since we're on the same server, load from filesystem
            img_filename = os.path.basename(img_url)
            img_path = TEMP_DIR / img_filename
            if img_path.exists():
                # Scale image to fit page width (max ~170mm)
                with Image.open(img_path) as pil_img:
                    img_w, img_h = pil_img.size
                    aspect = img_h / img_w
                    max_w = 170 * mm
                    max_h = 200 * mm
                    # Convert pixels to points (1 inch = 72 points, assume 96 DPI for screen images)
                    # Better: use the actual pixel dimensions and scale proportionally
                    display_w = min(img_w * 0.75, max_w)  # 0.75 points per pixel at 96 DPI
                    display_h = display_w * aspect
                    if display_h > max_h:
                        display_h = max_h
                        display_w = display_h / aspect
                    
                    rl_img = RLImage(str(img_path), width=display_w, height=display_h)
                    story.append(rl_img)
        except Exception as e:
            story.append(Paragraph(f"[Image could not be embedded: {e}]", small_style))
    
    # Footer
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "This report was generated automatically by DentalAI (Research Prototype). "
        "Model confidence scores are not calibrated probabilities of clinical truth. "
        "Tooth associations are geometric estimates based on spatial overlap.",
        small_style
    ))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.read()


@app.route("/api/report", methods=["POST"])
def generate_report():
    """Generate a PDF report from analysis data."""
    if not request.is_json:
        return jsonify({"success": False, "error": "Request must be JSON"}), 400
    
    data = request.get_json()
    
    if not data or 'analysis' not in data:
        return jsonify({"success": False, "error": "Missing analysis data"}), 400
    
    analysis = data['analysis']
    original_filename = data.get('original_filename', 'unknown')
    
    if not analysis.get('success', False):
        return jsonify({"success": False, "error": "Analysis data indicates failure"}), 400
    
    try:
        pdf_bytes = generate_pdf_report(analysis, original_filename)
        
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        filename = f"dental-analysis-{timestamp}.pdf"
        
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": "PDF generation failed",
            "details": str(exc)
        }), 500


if __name__ == "__main__":
    print("Starting Dental X-ray Analysis API...")
    print(f"Models loaded: {pipeline is not None}")
    if startup_error:
        print(f"Startup error: {startup_error}")
    print(f"Disease classes: {DISEASE_CLASSES}")
    app.run(host="0.0.0.0", port=5000, debug=False)