# Dental X-ray Analysis

A web application for panoramic dental X-ray analysis using YOLO-based tooth segmentation and disease detection.

**Disclaimer:** For research and educational purposes only. Not clinically validated and must not be used for diagnosis or treatment decisions.

## Features

- **Tooth Segmentation:** Identifies 32 permanent tooth classes using FDI numbering (11–48).
- **Disease Detection:** Detects Caries, Deep Caries, Periapical Lesion, and Impacted teeth.
- **Image Enhancement:** Uses CLAHE to improve image contrast.
- **Geometric Matching:** Associates potential disease detections with candidate teeth.
- **Interactive Viewer:** Original, enhanced, segmentation, disease, and combined images with zoom, pan, and fullscreen.
- **Findings and Reports:** Displays confidence scores, candidate tooth matches, interpretations, and downloadable PDF reports.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Python, Flask
- **AI:** Ultralytics YOLO
- **Image Processing:** OpenCV
- **PDF Reports:** ReportLab

## Project Structure

```text
dental-xray-app/
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── models/
│   ├── tooth-segmentation.pt
│   └── dental-disease.pt
├── src/
│   └── pipeline.py
└── README.md
```

## Models

| Model | Task | Source |
|---|---|---|
| `tooth-segmentation.pt` | 32-class tooth segmentation and FDI numbering (11–48) | Custom-trained model; [DENTEX dataset](https://dentex.grand-challenge.org/) if used for training |
| `dental-disease.pt` | Caries, Deep Caries, Periapical Lesion, and Impacted teeth | [Hugging Face — Caries Detection Weights](https://huggingface.co/chemahc94/caries-detection-weights) |

Both model files must be available in the `models/` directory using the exact filenames above. Model weights may have separate licensing terms.

## Prerequisites

- Python 3.10 or 3.11 recommended
- Node.js 18 or newer
- npm

## Installation

Clone the repository:

```bash
git clone https://github.com/bit-wo/dental-xray-analysis.git
cd dental-xray-analysis
```

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend Setup

Open a second terminal:

```bash
cd dental-xray-analysis/frontend
npm install
```

If you cloned the project into a different directory, use your actual project path.

## Run the Application

Start the backend:

```bash
cd backend
source .venv/bin/activate
python app.py
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser. The backend runs at `http://localhost:5000`.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend and model status |
| POST | `/api/analyze` | Analyze an uploaded X-ray |
| GET | `/api/images/<filename>` | Retrieve generated analysis images |
| POST | `/api/report` | Generate a PDF report |

## Limitations

- Predictions and tooth numbering may be incorrect.
- Confidence scores do not represent diagnostic certainty.
- Tooth-to-disease matching is experimental.
- Clinical validation has not been established.
- Intended for supported panoramic dental radiographs only.

## References

- [Ultralytics YOLO](https://github.com/ultralytics/ultralytics)
- [DENTEX Challenge](https://dentex.grand-challenge.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
