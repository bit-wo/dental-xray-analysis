# Dental X-ray Analysis

An academic research prototype combining YOLO-based tooth segmentation, FDI tooth numbering, dental disease detection, and geometry-based matching in a Gradio web application.

**Disclaimer:** This project is for research and educational purposes only. It is not clinically validated and must not be used for diagnosis or treatment decisions.

## Features

- Panoramic dental X-ray upload.
- Tooth segmentation and candidate FDI numbering (32 classes).
- Dental disease detection.
- Geometry-based candidate tooth–disease matching.
- Annotated X-ray visualization and results table.

## Models

| Model | File | Source |
|---|---|---|
| Tooth segmentation | `models/tooth-segmentation.pt` | Custom-trained for this project |
| Disease detection | `models/dental-disease.pt` | [Hugging Face model](https://huggingface.co/chemahc94/caries-detection-weights) |

The disease detector's reported classes are Impacted, Caries, Periapical Lesion, and Deep Caries.

## Dataset

The exact dataset used to train the tooth-segmentation model has not yet been verified. DENTEX is a possible source, but this must be confirmed before claiming it was used.

- [DENTEX official challenge](https://dentex.grand-challenge.org/)
- [DENTEX dataset repository](https://github.com/ibrahimethemhamamci/DENTEX)
- [DENTEX research paper](https://arxiv.org/abs/2305.19112)

## Installation

**Requirements:** Python 3.10 or 3.11 recommended.

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd dental-xray-app

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

On Windows, activate the environment using `.venv\Scripts\activate`.

Place both model files in the `models/` directory before running the application. Open the local URL printed by Gradio, normally `http://127.0.0.1:7860`.

## Limitations

- Predictions and tooth numbering may be incorrect.
- Disease confidence is not diagnostic certainty.
- Matching scores measure geometric overlap, not clinical correctness.
- Matching thresholds are experimental and have not been clinically validated.

Ground-truth annotations and appropriate evaluation are required before making accuracy claims.
