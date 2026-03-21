"""
app.py
Flask REST API microservice for CNN-based invoice OCR.
Replaces Gemini API — exposes the same JSON schema.

Run: python app.py
     → http://localhost:8000
"""

import os
import sys
import uuid
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Add cnn-service to path
sys.path.insert(0, os.path.dirname(__file__))

app = Flask(__name__)
CORS(app)

# ── Config ────────────────────────────────────────────────────────────────────
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "pdf"}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024   # 50 MB

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Lazy load inference (loads model on first request)
_inference_loaded = False

def _load_inference():
    global _inference_loaded
    if not _inference_loaded:
        try:
            from inference import process_batch
            _inference_loaded = True
            print("✅ CNN model loaded successfully")
        except FileNotFoundError as e:
            print(f"❌ Model not found: {e}")
            print("   Run: python train.py  to train the model first.")
    return _inference_loaded


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def handle_pdf(path):
    """Convert PDF pages to images using pdf2image"""
    try:
        from pdf2image import convert_from_path
        pages = convert_from_path(path, dpi=200)
        image_paths = []
        base = path.rsplit(".", 1)[0]
        for i, page in enumerate(pages):
            img_path = f"{base}_page{i+1}.jpg"
            page.save(img_path, "JPEG", quality=95)
            image_paths.append(img_path)
        return image_paths
    except Exception as e:
        print(f"[PDF Warning] pdf2image error: {e}. Using original path.")
        return [path]


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    model_ready = os.path.exists(
        os.path.join(os.path.dirname(__file__), "model", "invoice_cnn.keras")
    )
    return jsonify({
        "status": "ok",
        "model_ready": model_ready,
        "service": "CNN Invoice OCR",
        "version": "1.0.0"
    })


@app.route("/model-info", methods=["GET"])
def model_info():
    model_path = os.path.join(os.path.dirname(__file__), "model", "invoice_cnn.keras")
    if not os.path.exists(model_path):
        return jsonify({"error": "Model not trained yet. Run train.py first."}), 404

    stat = os.stat(model_path)
    return jsonify({
        "model_file": model_path,
        "size_mb": round(stat.st_size / 1024 / 1024, 2),
        "backbone": "EfficientNetB0",
        "categories": 10,
        "fields_detected": 5
    })


@app.route("/extract", methods=["POST"])
def extract():
    """
    POST /extract
    Accepts: multipart/form-data with one or more 'files'
    Returns: { "processed_invoices": [...] } — same schema as Gemini
    """
    if "files" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No files selected"}), 400

    # Check model is available
    if not _load_inference():
        return jsonify({
            "error": "CNN model not trained yet. Run: python train.py in the cnn-service directory.",
            "hint": "After training, restart the Flask server."
        }), 503

    from inference import process_batch

    saved_paths = []
    try:
        for file in files:
            if file and allowed_file(file.filename):
                filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(path)

                # Handle PDFs
                if filename.lower().endswith(".pdf"):
                    img_paths = handle_pdf(path)
                    saved_paths.extend(img_paths)
                else:
                    saved_paths.append(path)

        if not saved_paths:
            return jsonify({"error": "No valid image files uploaded"}), 400

        # Run CNN inference pipeline
        result = process_batch(saved_paths)
        return jsonify(result), 200

    except Exception as e:
        print(f"[Extract Error] {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up uploaded files
        for path in saved_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass


@app.route("/extract-single", methods=["POST"])
def extract_single():
    """Convenience endpoint for single file"""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    request.files = {"files": [file]}
    return extract()


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  🧠 CNN Invoice OCR Service")
    print("=" * 60)

    model_path = os.path.join(os.path.dirname(__file__), "model", "invoice_cnn.keras")
    if not os.path.exists(model_path):
        print("\n⚠️  WARNING: No trained model found!")
        print("   Run this first: python prepare_dataset.py")
        print("   Then run      : python train.py")
        print("\n   Service starting anyway (will return 503 until model is trained).")
    else:
        print("✅ Model found — loading on first request.")

    print(f"\n🚀 Starting Flask on http://localhost:8000\n")
    app.run(host="0.0.0.0", port=8000, debug=False)
