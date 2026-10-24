# Dental X-ray Analysis

A complete, production-quality web application for dental X-ray analysis using YOLO-based tooth segmentation and disease detection.

**Disclaimer:** This project is for research and educational purposes only. It is not clinically validated and must not be used for diagnosis or treatment decisions.

## Architecture

```
dental-xray-app/
├── backend/                 # Flask REST API
│   ├── app.py              # Main API server
│   └── requirements.txt    # Python dependencies
├── frontend/               # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   ├── styles/         # Global styles
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
├── models/                 # Trained model weights (tracked in Git, see "Model Files")
│   ├── tooth-segmentation.pt
│   └── dental-disease.pt
├── src/                    # Shared inference pipeline (used by backend/app.py)
│   └── pipeline.py         # CLAHE enhancement, YOLO models, FDI mapping, matching
└── README.md
```

## Features

- **Tooth Segmentation**: 32-class YOLOv8-seg model mapping to permanent FDI tooth numbers (11–48)
- **Disease Detection**: YOLOv8 model detecting Caries, Deep Caries, Periapical Lesion, and Impacted teeth
- **Geometric Matching**: IoU and mask coverage based candidate tooth–disease association
- **Interactive Viewer**: Zoom, pan, fullscreen, synchronized across views
- **Multiple Views**: Original, Enhanced (CLAHE), Segmentation, Disease, Combined
- **Findings Table**: Structured display with confidences, geometry metrics, and status
- **Plain-Language Interpretations**: Human-readable explanations for each detection
- **Downloadable Reports**: PDF reports generated server-side with ReportLab (`/api/report`)
- **Responsive Design**: Works on desktop, tablet, and mobile

## Models

| Model | File | Classes | Source |
|-------|------|---------|--------|
| Tooth Segmentation | `models/tooth-segmentation.pt` | 32 (FDI 11–48) | Custom-trained |
| Disease Detection | `models/dental-disease.pt` | 4 (Caries, Deep Caries, Periapical Lesion, Impacted) | [Hugging Face](https://huggingface.co/chemahc94/caries-detection-weights) |

### Model Files

Both weight files are committed to this repository at their working locations:

- `models/tooth-segmentation.pt` (7 MB)
- `models/dental-disease.pt` (19 MB)

Both are small enough for plain Git (no Git LFS required). Nothing needs to be obtained separately;
if you ever clone a fork that excludes them, place the two files in `models/` with exactly those
names — the backend refuses to start without them.

## Prerequisites

- **Python**: 3.10 or 3.11 recommended
- **Node.js**: 18+ (for frontend)
- **Package Manager**: `uv` (recommended) or `pip` for Python; `npm` for Node.js

## Quick Start

### Option 1: Using `uv` (recommended for Python)

```bash
# Clone and enter project
cd ~/Programming/dental-xray-app

# Backend setup with uv
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install

# Terminal 1: Start backend
cd ~/Programming/dental-xray-app/backend
source .venv/bin/activate
python app.py

# Terminal 2: Start frontend
cd ~/Programming/dental-xray-app/frontend
npm run dev
```

### Option 2: Using standard `pip` and `venv`

```bash
cd ~/Programming/dental-xray-app

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install

# Terminal 1: Backend
cd ~/Programming/dental-xray-app/backend
source .venv/bin/activate
python app.py

# Terminal 2: Frontend
cd ~/Programming/dental-xray-app/frontend
npm run dev
```

## Expected URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health
- **Analysis Endpoint**: POST http://localhost:5000/api/analyze

## API Endpoints

### `GET /api/health`
Returns backend and model status.
```json
{
  "status": "ok",
  "models_loaded": true,
  "startup_error": null,
  "disease_classes": ["Caries", "Deep Caries", "Periapical Lesion", "Impacted"],
  "segmentation_classes": 32
}
```

### `POST /api/analyze`
Accepts multipart/form-data with `file` field. Returns analysis results and image URLs.
```json
{
  "success": true,
  "image": { "width": 2048, "height": 1024 },
  "segmentation": { "teeth_count": 28, "teeth": [...] },
  "detections": [...],
  "summary": { "total_teeth_segmented": 28, "total_detections": 3, ... },
  "images": {
    "original": "/api/images/...",
    "enhanced": "/api/images/...",
    "segmentation": "/api/images/...",
    "disease": "/api/images/...",
    "combined": "/api/images/..."
  }
}
```

### `GET /api/images/<filename>`
Serves generated overlay images from temporary storage.

### `POST /api/report`
Accepts JSON with the analysis result and the original filename. Returns a server-generated PDF
(`application/pdf`) containing the summary, findings, and interpretation.
```bash
curl -X POST -H "Content-Type: application/json" \
  -d @analysis_result.json http://localhost:5000/api/report -o report.pdf
```

## Usage

1. Open http://localhost:5173 in your browser
2. Drag and drop or click to upload a panoramic dental X-ray (PNG, JPG, TIFF, etc.)
3. Click "Analyze X-ray" to run the pipeline
4. Explore results:
   - Switch between Original, Enhanced, Segmentation, Disease, Combined views
   - Zoom/pan with mouse wheel (Ctrl) and drag; use the Fullscreen button or press `F`
   - Review findings table and interpretations
   - Download PDF report

## Keyboard Shortcuts (in viewer)

| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |
| `F` | Toggle fullscreen |
| `Escape` | Exit fullscreen |
| Drag | Pan (when zoomed) |
| Scroll | Zoom at cursor |

## Troubleshooting

### Backend fails to start
- Ensure model files exist in `models/`:
  - `models/tooth-segmentation.pt`
  - `models/dental-disease.pt`
- Check Python version: `python --version` (3.10/3.11 recommended)
- Install dependencies: `uv pip install -r requirements.txt` or `pip install -r requirements.txt`
- Check for CUDA/MPS availability if using GPU (CPU works fine)

### Frontend fails to build
- Ensure Node.js 18+: `node --version`
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript errors: `npm run build`

### API connection issues
- Verify backend is running on port 5000
- Check Vite proxy config in `frontend/vite.config.ts`
- CORS is configured for `http://localhost:5173`

### Model loading errors
- Ensure both weight files exist (see "Model Files" above) and are named exactly
  `models/tooth-segmentation.pt` and `models/dental-disease.pt`
- YOLO weights load once at startup; a corrupted download causes `startup_error` in `/api/health`

### Analysis fails
- Check image format (PNG, JPG, TIFF, BMP, WebP supported)
- Max file size: 20 MB
- Ensure image is a valid radiograph (not corrupted)

## Limitations

- Predictions and tooth numbering may be incorrect
- Disease confidence is a model score, not diagnostic certainty
- Matching scores measure geometric overlap, not clinical correctness
- Matching thresholds are experimental and have not been clinically validated
- The tooth segmentation model's training dataset has not been verified
- Only panoramic radiographs are supported

## Development

### Backend development
```bash
cd backend
source .venv/bin/activate
python app.py  # Runs on http://localhost:5000 with debug=False
```

### Frontend development
```bash
cd frontend
npm run dev    # Runs on http://localhost:5173 with HMR
npm run build  # Production build
npm run lint   # ESLint check
```

### Running tests
```bash
# Backend - basic syntax check
cd backend && python -m py_compile app.py

# Frontend - type check
cd frontend && npx tsc --noEmit
```

## License

This project is for academic research and educational purposes. Model weights may have separate licenses — see respective sources.

## Acknowledgments

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [DENTEX Challenge](https://dentex.grand-challenge.org/)
- [chemahc94/caries-detection-weights](https://huggingface.co/chemahc94/caries-detection-weights)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/)