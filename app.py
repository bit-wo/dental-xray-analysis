from pathlib import Path
import gradio as gr
import pandas as pd
from PIL import Image
from src.pipeline import DentalPipeline

SEG_MODEL = Path("models/tooth-segmentation.pt")
DISEASE_MODEL = Path("models/dental-disease.pt")

pipeline = None
startup_error = None

try:
    pipeline = DentalPipeline(SEG_MODEL, DISEASE_MODEL)
except Exception as exc:
    startup_error = str(exc)

def analyze(image):
    if startup_error:
        raise gr.Error(
            "Models could not be loaded. Put the two checkpoint files in the "
            "'models' folder. Details: " + startup_error
        )
    if image is None:
        raise gr.Error("Upload a dental X-ray image first.")

    annotated, rows = pipeline.analyze(image)
    table = pd.DataFrame(rows)
    if table.empty:
        table = pd.DataFrame(columns=[
            "Detection", "Disease", "Disease confidence",
            "Candidate FDI", "Tooth confidence", "Mask coverage", "IoU", "Status"
        ])
    return annotated, table

with gr.Blocks(title="Dental X-ray Research Prototype", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        "# Dental X-ray Analysis\n"
        "Experimental tooth segmentation and disease detection research prototype."
    )
    gr.Markdown(
        "**Research/education only.** Predictions are not a diagnosis and must not "
        "be used to make clinical decisions."
    )
    with gr.Row():
        input_image = gr.Image(type="pil", label="Upload panoramic X-ray")
        output_image = gr.Image(type="pil", label="Predictions")
    analyze_button = gr.Button("Analyze X-ray", variant="primary")
    results = gr.Dataframe(
        label="Disease detections and candidate tooth matches",
        interactive=False,
        wrap=True
    )
    analyze_button.click(
        fn=analyze,
        inputs=input_image,
        outputs=[output_image, results]
    )

if __name__ == "__main__":
    demo.launch(share=True)
