
from pathlib import Path
import gradio as gr
import pandas as pd
from PIL import Image

from src.pipeline import DentalPipeline, enhance_xray


SEG_MODEL = Path("models/tooth-segmentation.pt")
DISEASE_MODEL = Path("models/dental-disease.pt")

pipeline = None
startup_error = None

try:
    pipeline = DentalPipeline(SEG_MODEL, DISEASE_MODEL)
except Exception as exc:
    startup_error = str(exc)


def analyze(image, processing_mode):
    if startup_error:
        raise gr.Error(
            "Models could not be loaded. Ensure both checkpoint "
            "files are in the 'models' folder. Details: "
            + startup_error
        )

    if image is None:
        raise gr.Error("Upload a dental X-ray image first.")

    # Generate a preview regardless of the selected model input.
    enhanced_preview = enhance_xray(image)

    use_enhancement = (
        processing_mode == "Enhanced (CLAHE)"
    )

    annotated, rows = pipeline.analyze(
        image,
        use_enhancement=use_enhancement
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

    return annotated, table, enhanced_preview


with gr.Blocks(
    title="Dental X-ray Research Prototype",
    theme=gr.themes.Soft()
) as demo:

    gr.Markdown(
        "# Dental X-ray Analysis\n"
        "Experimental tooth segmentation, disease detection, "
        "and image enhancement research prototype."
    )

    gr.Markdown(
        "**Research and education only.** Predictions are not "
        "a diagnosis and must not be used to make clinical decisions."
    )

    with gr.Row():
        input_image = gr.Image(
            type="pil",
            label="Upload panoramic X-ray"
        )

        enhanced_preview = gr.Image(
            type="pil",
            label="CLAHE-enhanced preview"
        )

    processing_mode = gr.Radio(
        choices=[
            "Original image",
            "Enhanced (CLAHE)"
        ],
        value="Original image",
        label="Image used for model predictions",
        info=(
            "Compare both options. Enhancement may not improve "
            "model predictions."
        )
    )

    analyze_button = gr.Button(
        "Analyze X-ray",
        variant="primary"
    )

    output_image = gr.Image(
        type="pil",
        label="Predictions"
    )

    results = gr.Dataframe(
        label="Disease detections and candidate tooth matches",
        interactive=False,
        wrap=True
    )

    analyze_button.click(
        fn=analyze,
        inputs=[input_image, processing_mode],
        outputs=[
            output_image,
            results,
            enhanced_preview
        ]
    )


if __name__ == "__main__":
    demo.launch(share=True)
