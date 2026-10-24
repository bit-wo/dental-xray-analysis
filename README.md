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

## Prerequisites

- Python 3.10 or 3.11 recommended
- Node.js 18 or newer
- npm

## Installation and Setup

Clone the repository and enter the project directory:

```bash
git clone https://github.com/bit-wo/dental-xray-analysis.git
cd dental-xray-analysis
```

### 1. Set up the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Set up the frontend

Open a second terminal:

```bash
cd dental-xray-analysis/frontend
npm install
```

If you cloned the repository into a different directory, replace `dental-xray-analysis` with your actual project path.

## Run the Application

Start the backend in the first terminal:

```bash
cd backend
source .venv/bin/activate
python app.py
```

Start the frontend in the second terminal:

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend and model status |
| POST | `/api/analyze` | Analyze an uploaded X-ray |
| GET | `/api/images/<filename>` | Retrieve generated analysis images |
| POST | `/api/report` | Generate a PDF report |

## Model Files

The application expects these files in the `models/` directory:

- `tooth-segmentation.pt` — tooth segmentation and FDI numbering.
- `dental-disease.pt` — four-class disease detection.

Ensure both files are available at the expected paths before starting the backend. If model weights are not included in your clone, obtain them from their respective sources.

## Limitations

- Predictions and tooth numbering may be incorrect.
- Confidence scores do not represent diagnostic certainty.
- Tooth-to-disease matching is experimental.
- Clinical validation has not been established.
- Only supported panoramic radiographs should be used.

## References

- [Ultralytics YOLO](https://github.com/ultralytics/ultralytics)
- [DENTEX Challenge](https://dentex.grand-challenge.org/)
- [Disease Detection Weights](https://huggingface.co/chemahc94/caries-detection-weights)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)

## License

For academic research and educational purposes. Model weights may have separate licensing terms.
