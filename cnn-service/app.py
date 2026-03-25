"""
app.py
Flask REST API microservice for CNN-based invoice OCR.
Auto-detects available dependencies:
  - Full mode: TensorFlow + OpenCV CNN pipeline
  - Lite mode: PIL + pytesseract only (fallback, always works)

Run: python app.py  →  http://localhost:8000
"""

import os
import sys
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

sys.path.insert(0, os.path.dirname(__file__))

app = Flask(__name__)
CORS(app)

# ── Config ─────────────────────────────────────────────────────────────────────
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "pdf"}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── Detect inference mode ───────────────────────────────────────────────────────
INFERENCE_MODE = "none"
process_batch = None

# Try full CNN mode (requires tensorflow + opencv)
try:
    import cv2
    import numpy as np
    import tensorflow  # noqa
    from inference import process_batch as _pb
    process_batch = _pb
    INFERENCE_MODE = "cnn"
    print("✅ Full CNN mode active (TensorFlow + OpenCV)")
except Exception as e:
    print(f"⚠️  Full CNN mode unavailable: {e}")
    # Fall back to lite OCR mode (PIL + pytesseract only)
    try:
        from inference_lite import process_batch as _pb_lite
        process_batch = _pb_lite
        INFERENCE_MODE = "lite"
        print("✅ Lite OCR mode active (PIL + Tesseract)")
    except Exception as e2:
        print(f"❌ Lite mode also failed: {e2}")
        INFERENCE_MODE = "none"


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
        print(f"[PDF Warning] {e}. Skipping PDF conversion.")
        return [path]


# ── Routes ──────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    model_ready = os.path.exists(
        os.path.join(os.path.dirname(__file__), "model", "invoice_cnn.keras")
    )
    return jsonify({
        "status": "ok",
        "model_ready": model_ready,
        "inference_mode": INFERENCE_MODE,
        "service": "CNN Invoice OCR",
        "version": "1.1.0"
    })


@app.route("/model-info", methods=["GET"])
def model_info():
    model_path = os.path.join(os.path.dirname(__file__), "model", "invoice_cnn.keras")
    if INFERENCE_MODE == "lite":
        return jsonify({
            "mode": "lite",
            "info": "Running in OCR-only mode (PIL + Tesseract). No CNN model needed.",
        })
    if not os.path.exists(model_path):
        return jsonify({"error": "Model not trained yet. Run train.py first."}), 404
    stat = os.stat(model_path)
    return jsonify({
        "model_file": model_path,
        "size_mb": round(stat.st_size / 1024 / 1024, 2),
        "backbone": "EfficientNetB0",
        "categories": 10,
        "fields_detected": 5,
        "mode": INFERENCE_MODE
    })


@app.route("/extract", methods=["POST"])
def extract():
    """
    POST /extract
    Accepts: multipart/form-data with one or more 'files'
    Returns: { "processed_invoices": [...] }
    """
    if INFERENCE_MODE == "none":
        return jsonify({
            "error": "No inference engine available. Install pytesseract or tensorflow.",
        }), 503

    if "files" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No files selected"}), 400

    saved_paths = []
    try:
        for file in files:
            if file and allowed_file(file.filename):
                filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(path)
                if filename.lower().endswith(".pdf"):
                    img_paths = handle_pdf(path)
                    saved_paths.extend(img_paths)
                else:
                    saved_paths.append(path)

        if not saved_paths:
            return jsonify({"error": "No valid image files uploaded"}), 400

        result = process_batch(saved_paths)
        return jsonify(result), 200

    except Exception as e:
        print(f"[Extract Error] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    finally:
        for path in saved_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass


@app.route("/extract-single", methods=["POST"])
def extract_single():
    """Convenience endpoint for single file upload"""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    # Inject as 'files' and reuse extract()
    saved_paths = []
    try:
        if not (file and allowed_file(file.filename)):
            return jsonify({"error": "Invalid file type"}), 400
        filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(path)
        saved_paths.append(path)
        result = process_batch(saved_paths)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for path in saved_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except:
                pass


# ── Main ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  🧠 CNN Invoice OCR Service")
    print("=" * 60)
    print(f"\n  Mode: {INFERENCE_MODE.upper()}")
    if INFERENCE_MODE == "lite":
        print("  Running in Lite OCR mode (PIL + Tesseract)")
        print("  Install TensorFlow + OpenCV for full CNN mode.")
    elif INFERENCE_MODE == "cnn":
        model_path = os.path.join(os.path.dirname(__file__), "model", "invoice_cnn.keras")
        if not os.path.exists(model_path):
            print("\n⚠️  No trained model found! Run: python train.py")
        else:
            print("  ✅ Model ready.")
    elif INFERENCE_MODE == "none":
        print("  ❌ No inference engine available!")

    print(f"\n🚀 Starting Flask on http://localhost:8000\n")
    app.run(host="0.0.0.0", port=8000, debug=False)
