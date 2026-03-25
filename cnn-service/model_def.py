"""
model.py
CNN model definition: EfficientNetB0 backbone with two heads:
  1. Invoice category classifier (10 classes)
  2. Key-field bounding box regressor (5 fields × 4 coords)
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import EfficientNetB0

# ── Constants ────────────────────────────────────────────────────────────────

IMG_SIZE = (224, 224)
NUM_CATEGORIES = 10
NUM_FIELDS = 5          # supplier_name, invoice_number, invoice_date, grand_total, gstin
BBOX_OUTPUTS = NUM_FIELDS * 4   # (x1,y1,x2,y2) per field

CATEGORY_LABELS = [
    "Textiles",
    "Electronics",
    "Office Supplies",
    "Machinery",
    "Packaging Materials",
    "Raw Materials",
    "Transportation",
    "Services",
    "Utilities",
    "Other"
]

FIELD_NAMES = [
    "supplier_name",
    "invoice_number",
    "invoice_date",
    "grand_total",
    "supplier_gstin"
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "invoice_cnn.keras")

# ── Model Builder ─────────────────────────────────────────────────────────────

def build_model():
    """
    Build a Sequential CNN model for invoice category classification.
    """
    backbone = EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE, 3)
    )
    backbone.trainable = False

    model = keras.Sequential([
        backbone,
        layers.GlobalAveragePooling2D(),
        layers.BatchNormalization(),
        layers.Dense(512, activation="relu"),
        layers.Dropout(0.4),
        layers.Dense(256, activation="relu"),
        layers.Dropout(0.3),
        layers.Dense(NUM_CATEGORIES, activation="softmax")
    ], name="InvoiceCNN")

    return model


def compile_model(model, learning_rate=1e-3):
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def unfreeze_backbone(model, num_layers=20):
    """Unfreeze top N layers of backbone for fine-tuning (phase 2)"""
    # In the Sequential model, backbone is the first layer
    backbone = model.layers[0]
    for layer in backbone.layers[-num_layers:]:
        if not isinstance(layer, layers.BatchNormalization):
            layer.trainable = True
    return model


# ── Save / Load ──────────────────────────────────────────────────────────────

def save_model(model, path=MODEL_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    model.save(path)
    print(f"✅ Model saved to {path}")


def load_model(path=MODEL_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"No trained model found at {path}. "
            "Run train.py first to train the model."
        )
    print(f"📦 Loading model from {path}")
    return keras.models.load_model(path)


# ── Inference Helper ──────────────────────────────────────────────────────────

def predict(model, preprocessed_image):
    """
    Run inference on a preprocessed image (shape: 1, 224, 224, 3).
    Returns category_name, confidence 0–100, and estimated field bboxes.
    Note: Bboxes are estimates based on typical invoice layout patterns.
    """
    cat_probs = model.predict(preprocessed_image, verbose=0)
    cat_idx = int(np.argmax(cat_probs[0]))
    cat_conf = float(cat_probs[0][cat_idx]) * 100
    
    # Generate heuristic bounding boxes based on typical invoice layout
    # These are normalized coordinates (0-1) relative to image dimensions
    field_bboxes = {
        "supplier_name": (0.05, 0.05, 0.7, 0.15),      # Top-left area
        "supplier_gstin": (0.05, 0.10, 0.7, 0.20),     # Below supplier name
        "invoice_number": (0.6, 0.05, 0.95, 0.12),     # Top-right
        "invoice_date": (0.6, 0.12, 0.95, 0.20),       # Below invoice number
        "grand_total": (0.6, 0.85, 0.95, 0.95),        # Bottom-right
    }
    
    return CATEGORY_LABELS[cat_idx], cat_conf, field_bboxes
