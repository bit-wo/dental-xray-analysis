
from pathlib import Path

import gradio as gr
import pandas as pd
from PIL import Image

from src.pipeline import DentalPipeline, enhance_xray


# ---------------- MODEL SETUP ----------------

SEG_MODEL = Path("models/tooth-segmentation.pt")
DISEASE_MODEL = Path("models/dental-disease.pt")

pipeline = None
startup_error = None

try:
    pipeline = DentalPipeline(SEG_MODEL, DISEASE_MODEL)
except Exception as exc:
    startup_error = str(exc)


# ---------------- CUSTOM STYLING ----------------

CSS = """
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

:root {
    --bg: #080d16;
    --panel: #101827;
    --border: #253247;
    --text: #edf4ff;
    --muted: #91a1b8;
    --accent: #35d6b0;
}

.gradio-container {
    max-width: 1450px !important;
    margin: auto !important;
    background: var(--bg) !important;
    color: var(--text) !important;
    font-family: 'DM Sans', sans-serif !important;
}

body, .main, .wrap {
    background: var(--bg) !important;
}

h1, h2, h3 {
    font-family: 'Space Grotesk', sans-serif !important;
    color: var(--text) !important;
}

#hero {
    padding: 28px 30px;
    margin: 8px 0 16px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background:
        radial-gradient(ellipse at 90% 0%, rgba(53,214,176,.12), transparent 38%),
        #0d1624;
}

.eyebrow {
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
}

.hero-title {
    font: 700 clamp(28px, 4vw, 42px)/1.12 'Space Grotesk', sans-serif;
    margin: 10px 0;
}

.hero-sub {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.7;
    max-width: 780px;
}

#disclaimer {
    border: 1px solid #73552d;
    background: #17150f;
    color: #f0d9ae;
    padding: 12px 15px;
    border-radius: 11px;
    margin-bottom: 18px;
    font-size: 12px;
    line-height: 1.65;
}

.panel {
    background: var(--panel) !important;
    border: 1px solid var(--border) !important;
    border-radius: 16px !important;
    padding: 16px !important;
}

#run-btn {
    background: var(--accent) !important;
    color: #06231d !important;
    border: 0 !important;
    border-radius: 10px !important;
    font-weight: 700 !important;
}

#run-btn:hover {
    filter: brightness(1.06);
}

.metric-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.metric {
    background: #101827;
    border: 1px solid var(--border);
    border-radius: 13px;
    padding: 15px;
}

.metric-label {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .8px;
    font-size: 10px;
}

.metric-value {
    font: 700 27px 'Space Grotesk', sans-serif;
    margin-top: 5px;
    color: var(--text);
}

.metric-hint {
    color: var(--muted);
    font-size: 11px;
    margin-top: 4px;
}

.finding {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 15px;
    background: #0c1421;
    margin: 8px 0;
}

.finding-title {
    font-weight: 700;
    font-size: 14px;
    color: var(--text);
    margin-bottom: 6px;
}

.finding-body {
    color: #c5d1e2;
    font-size: 13px;
    line-height: 1.65;
}

.finding-meta {
    color: var(--muted);
    font-size: 11px;
    margin-top: 8px;
}

.small-note {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.65;
}

@media (max-width: 700px) {
    #hero {
        padding: 20px;
    }

    .metric-grid {
        grid-template-columns: 1fr;
    }
}
"""


# ---------------- INTERPRETATION ----------------

def describe_findings(rows):
    if not rows:
        return """
        <div class="finding">
            <div class="finding-title">No model findings returned</div>
            <div class="finding-body">
                The model returned no detections above its configured
                threshold. This does not establish that the X-ray is
                free of disease. Manual professional review is required.
            </div>
        </div>
        """

    cards = []

    for row in rows:
        disease = str(row.get("Disease") or "Unspecified finding")
        confidence = row.get("Disease confidence")
        tooth = row.get("Candidate FDI")
        status = str(row.get("Status") or "")

        low_confidence = (
            confidence is not None
            and float(confidence) < 0.30
        )

        if pd.isna(tooth):
            tooth = None

        if tooth is not None:
            sentence = (
                f"The model detected a potential {disease} finding "
                f"and geometrically associated it with candidate "
                f"FDI tooth {tooth}."
            )
        else:
            sentence = (
                f"The model detected a potential {disease} finding, "
                "but it did not assign a sufficiently supported "
                "candidate tooth."
            )

        if low_confidence:
            sentence += (
                " The model score is relatively low, so this finding "
                "is especially uncertain."
            )

        sentence += (
            " Manual review by a qualified dental professional "
            "is required."
        )

        confidence_text = (
            f"{float(confidence):.3f}"
            if confidence is not None
            else "Not available"
        )

        tooth_confidence = row.get("Tooth confidence")

        if pd.isna(tooth_confidence):
            tooth_confidence = None

        tooth_confidence_text = (
            f"{float(tooth_confidence):.3f}"
            if tooth_confidence is not None
            else "Not available"
        )

        # Escape model-provided text before inserting it into HTML.
        import html

        disease_html = html.escape(disease)
        sentence_html = html.escape(sentence)
        status_html = html.escape(status)

        tooth_text = (
            html.escape(str(tooth))
            if tooth is not None
            else "Not assigned"
        )

        cards.append(
            '<div class="finding">'
            f'<div class="finding-title">'
            f'Finding {html.escape(str(row.get("Detection", "?")))}'
            f' · {disease_html}</div>'
            f'<div class="finding-body">{sentence_html}</div>'
            f'<div class="finding-meta">'
            f'Model score: {confidence_text} · '
            f'Candidate FDI: {tooth_text} · '
            f'Tooth score: {tooth_confidence_text}'
            f'</div>'
            f'<div class="finding-meta">'
            f'System status: {status_html or "Manual review required"}'
            f'</div>'
            '</div>'
        )

    return "\n".join(cards)


# ---------------- ANALYSIS ----------------

def analyze(image):
    if startup_error:
        raise gr.Error(
            "Could not load the models. Check that both checkpoint "
            "files exist in models/. Details: " + startup_error
        )

    if image is None:
        raise gr.Error("Upload a panoramic dental X-ray first.")

    # Enhance the image and always use it for model inference.
    enhanced = enhance_xray(image)

    annotated, rows = pipeline.analyze(
        image,
        use_enhancement=True
    )

    table = pd.DataFrame(rows)

    if table.empty:
        table = pd.DataFrame(columns=[
            "Detection",
            "Disease",
            "Disease confidence",
            "Candidate FDI",
            "Tooth confidence",
            "Mask coverage",
            "IoU",
            "Status"
        ])

    detection_count = len(rows)

    match_count = sum(
        1 for row in rows
        if row.get("Candidate FDI") is not None
        and not pd.isna(row.get("Candidate FDI"))
        and "Candidate match" in str(row.get("Status", ""))
    )

    review_count = sum(
        1 for row in rows
        if "review" in str(row.get("Status", "")).lower()
    )

    summary = f"""
    <div class="metric-grid">
        <div class="metric">
            <div class="metric-label">Model detections</div>
            <div class="metric-value">{detection_count}</div>
            <div class="metric-hint">Potential findings, not diagnoses</div>
        </div>

        <div class="metric">
            <div class="metric-label">Candidate tooth matches</div>
            <div class="metric-value">{match_count}</div>
            <div class="metric-hint">Geometric associations only</div>
        </div>

        <div class="metric">
            <div class="metric-label">Review flags</div>
            <div class="metric-value">{review_count}</div>
            <div class="metric-hint">Rows marked for review</div>
        </div>
    </div>
    """

    # Save a copy in Gradio state so zoom changes don't rerun inference.
    return (
        enhanced,
        annotated,
        annotated,
        table,
        summary,
        describe_findings(rows)
    )


def update_zoom(image, zoom):
    """Resize the cached result without running the models again."""
    if image is None:
        return None

    percent = max(50, min(250, int(zoom)))

    width = max(1, int(image.width * percent / 100))
    height = max(1, int(image.height * percent / 100))

    return image.resize(
        (width, height),
        Image.Resampling.LANCZOS
    )


# ---------------- GRADIO APPLICATION ----------------

with gr.Blocks(
    title="Dental X-ray Analysis",
    theme=gr.themes.Soft(
        primary_hue="teal",
        neutral_hue="slate"
    ),
    css=CSS
) as demo:

    gr.HTML("""
    <header id="hero">
        <div class="eyebrow">
            Dental imaging · Research prototype
        </div>
        <div class="hero-title">
            Dental X-ray Analysis
        </div>
        <div class="hero-sub">
            Image enhancement, tooth segmentation, candidate FDI
            numbering, and experimental dental finding detection.
        </div>
    </header>

    <div id="disclaimer">
        <strong>Research use only.</strong>
        This system is not clinically validated. Model findings
        and tooth associations can be wrong. Do not use this
        application to diagnose, exclude disease, or decide treatment.
        A qualified dental professional must review the original X-ray.
    </div>
    """)

    # State stores the annotated result for instant zoom updates.
    annotated_state = gr.State(value=None)

    with gr.Row(equal_height=False):

        with gr.Column(
            scale=1,
            elem_classes=["panel"]
        ):
            gr.Markdown("## 01 · Upload X-ray")

            input_image = gr.Image(
                type="pil",
                label="Original panoramic radiograph",
                height=310
            )

            gr.Markdown(
                "<div class='small-note'>"
                "CLAHE enhancement is applied automatically before "
                "model inference. No image-mode selection is needed."
                "</div>"
            )

            analyze_button = gr.Button(
                "Analyze enhanced X-ray",
                variant="primary",
                elem_id="run-btn"
            )

        with gr.Column(
            scale=1,
            elem_classes=["panel"]
        ):
            gr.Markdown("## 02 · Enhanced image")

            enhanced_preview = gr.Image(
                label="CLAHE preview",
                height=310,
                interactive=False
            )

            gr.Markdown(
                "<div class='small-note'>"
                "CLAHE adjusts local contrast. It does not guarantee "
                "better model predictions."
                "</div>"
            )

    gr.Markdown("## 03 · Analysis summary")

    summary = gr.HTML(
        "<div class='small-note'>"
        "Upload an X-ray and run the analysis to see results."
        "</div>"
    )

    with gr.Row(equal_height=False):

        with gr.Column(
            scale=7,
            elem_classes=["panel"]
        ):
            gr.Markdown("## Annotated X-ray")

            gr.Markdown(
                "<div class='small-note'>"
                "Change the zoom level without running the models again. "
                "Use the image fullscreen control for a larger view."
                "</div>"
            )

            zoom_slider = gr.Slider(
                minimum=50,
                maximum=250,
                value=100,
                step=10,
                label="Image zoom (%)"
            )

            annotated_output = gr.Image(
                label="Annotated result",
                interactive=False,
                height=520
            )

            gr.Markdown(
                "<div class='small-note'>"
                "Green: predicted tooth masks. Yellow: candidate FDI labels. "
                "Red: disease-detection boxes. These are predictions, "
                "not verified anatomy."
                "</div>"
            )

        with gr.Column(
            scale=5,
            elem_classes=["panel"]
        ):
            gr.Markdown("## Findings and interpretation")

            findings = gr.HTML(
                "<div class='small-note'>"
                "Plain-language findings will appear here after analysis."
                "</div>"
            )

    with gr.Column(elem_classes=["panel"]):
        gr.Markdown("## Detection details")

        results = gr.Dataframe(
            label="Model outputs and candidate tooth matches",
            interactive=False,
            wrap=True
        )

        gr.Markdown(
            "<div class='small-note'>"
            "Disease confidence is a model score, not the probability "
            "of disease. Mask coverage and IoU describe geometric overlap "
            "only. Every finding requires manual professional review."
            "</div>"
        )

    analyze_button.click(
        fn=analyze,
        inputs=input_image,
        outputs=[
            enhanced_preview,
            annotated_state,
            annotated_output,
            results,
            summary,
            findings
        ]
    )

    # Slider changes update the cached image only.
    zoom_slider.change(
        fn=update_zoom,
        inputs=[annotated_state, zoom_slider],
        outputs=annotated_output
    )


if __name__ == "__main__":
    demo.launch(share=True)
