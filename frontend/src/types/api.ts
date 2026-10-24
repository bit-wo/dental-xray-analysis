// API response types matching the Flask backend

export interface HealthResponse {
  status: 'ok' | 'error';
  models_loaded: boolean;
  startup_error: string | null;
  disease_classes: string[];
  segmentation_classes: number;
}

export interface ToothSegmentation {
  teeth_count: number;
  teeth: ToothInfo[];
}

export interface ToothInfo {
  class_id: number;
  fdi: number | null;
  confidence: number;
}

export interface Detection {
  detection: number;
  disease: string;
  disease_confidence: number;
  candidate_fdi: number | null;
  tooth_confidence: number | null;
  mask_coverage: number;
  iou: number;
  status: string;
}

export interface Summary {
  total_teeth_segmented: number;
  total_detections: number;
  detection_categories: string[];
  matched_detections: number;
}

export interface ImageUrls {
  original: string;
  enhanced: string;
  segmentation: string;
  disease: string;
  combined: string;
}

export interface AnalyzeResponse {
  success: boolean;
  error?: string;
  details?: string;
  image?: {
    width: number;
    height: number;
  };
  segmentation?: ToothSegmentation;
  detections?: Detection[];
  summary?: Summary;
  images?: ImageUrls;
}

export type ImageViewType = 'original' | 'enhanced' | 'segmentation' | 'disease' | 'combined';

export const IMAGE_VIEW_LABELS: Record<ImageViewType, string> = {
  original: 'Original X-ray',
  enhanced: 'Enhanced (CLAHE)',
  segmentation: 'Tooth Segmentation',
  disease: 'Disease Detection',
  combined: 'Combined Annotation',
};

export const IMAGE_VIEW_DESCRIPTIONS: Record<ImageViewType, string> = {
  original: 'Unmodified uploaded radiograph',
  enhanced: 'CLAHE local contrast enhancement used for inference',
  segmentation: 'Predicted tooth masks with candidate FDI numbers',
  disease: 'Detected disease bounding boxes with labels',
  combined: 'All annotations overlaid on the enhanced image',
};