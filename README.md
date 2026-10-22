# Dental X-ray Analysis — Research Prototype

A Gradio prototype combining:
- a 32-class YOLO segmentation model for candidate FDI tooth numbering
- a YOLO disease detector for its trained disease classes
- a basic geometry-based matching step
- an annotated image and a results table

## Important limitations

This is an experimental research/educational tool, **not a clinical diagnostic system**.
The disease confidence is not the same as confidence in the assigned tooth number.
Overlap scores are geometric evidence only. Do not use these outputs for clinical decisions.

The current matching thresholds are provisional engineering heuristics and have not
been clinically validated. Evaluate against suitable ground-truth annotations before
making accuracy claims.

## Project layout

```text
dental-xray-app/
├── app.py
├── src/
│   ├── __init__.py
│   └── pipeline.py
├── models/                 # Local only; not committed to Git
│   ├── tooth-segmentation.pt
│   └── dental-disease.pt
├── requirements.txt
├── .gitignore
└── README.md
```

## Setup

Python 3.10 or 3.11 is recommended. Create a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Put the model checkpoints in `models/` using these names:

- `models/tooth-segmentation.pt` — your trained 32-class segmentation checkpoint
- `models/dental-disease.pt` — the pretrained disease detector checkpoint

Then run:

```bash
python app.py
```

Gradio prints a local URL, normally `http://127.0.0.1:7860`.

## GitHub

Do not commit model weights, X-rays, patient data, datasets, tokens, or secrets.
The `.gitignore` excludes model files and common data folders. Check the model license
before redistributing weights or deploying the app, especially for commercial use.

```bash
git init
git add app.py src requirements.txt README.md .gitignore
git commit -m "Create dental X-ray research prototype"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the repository URL you create on GitHub.
