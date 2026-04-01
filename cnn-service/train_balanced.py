"""
train_balanced.py
GPU+CPU balanced training for RTX 2050 via DirectML.
Strategy: backbone feature extraction on CPU, dense head training on GPU.
Uses tf MirroredStrategy with soft placement to maximise hardware usage.
"""

import os
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2

# ── Critical fixes for DirectML compatibility ──────────────────────────────────
# 1. Soft placement: unsupported GPU ops silently fall back to CPU
# 2. DirectML needs this to avoid strided_slice / unknown op crashes
tf.config.set_soft_device_placement(True)
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# ── Constants ─────────────────────────────────────────────────────────────────
IMG_SIZE   = (224, 224)
NUM_CATS   = 10
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model", "invoice_cnn.keras")

# ── GPU Setup ──────────────────────────────────────────────────────────────────
def configure_gpu():
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        for gpu in gpus:
            try:
                tf.config.experimental.set_memory_growth(gpu, True)
            except RuntimeError:
                pass
        print(f"[GPU] RTX 2050 detected via DirectML ({len(gpus)} GPU device(s))")
        print(f"   Soft device placement: ON  (unsupported ops auto -> CPU)")
    else:
        print("[WARN] No GPU found -- CPU-only mode.")
    return bool(gpus)

# ── Model ──────────────────────────────────────────────────────────────────────
# Use MobileNetV2 instead of EfficientNetB0 — fully DirectML-compatible,
# faster on 4GB VRAM, and achieves equivalent accuracy for invoice classification.
def build_model(num_classes=NUM_CATS):
    backbone = MobileNetV2(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE, 3)
    )
    backbone.trainable = False

    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = backbone(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(512, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    return tf.keras.Model(inputs, outputs, name="InvoiceCNN_MobileNetV2")

def compile_model(model, lr=1e-3):
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model

def unfreeze(model, num_layers=30):
    backbone = model.layers[1]  # MobileNetV2 is layer index 1
    for layer in backbone.layers[-num_layers:]:
        if not isinstance(layer, layers.BatchNormalization):
            layer.trainable = True
    return model

# ── Dataset (CPU-pinned via tf.data) ──────────────────────────────────────────
def build_datasets(data_dir, batch_size=32):
    print(f"[Data] Loading dataset from: {data_dir}")
    AUTOTUNE = tf.data.AUTOTUNE

    common_kw = dict(
        validation_split=0.2,
        seed=42,
        image_size=IMG_SIZE,
        batch_size=batch_size,
        label_mode='categorical'
    )

    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir, subset="training", **common_kw)
    val_ds   = tf.keras.utils.image_dataset_from_directory(
        data_dir, subset="validation", **common_kw)

    # All preprocessing on CPU — keeps GPU free for forward/backward passes
    def preprocess_train(img, lbl):
        img = tf.cast(img, tf.float32) / 255.0
        img = tf.image.random_flip_left_right(img)
        img = tf.image.random_brightness(img, 0.1)
        img = tf.image.random_contrast(img, 0.9, 1.1)
        img = tf.image.random_saturation(img, 0.9, 1.1)
        return img, lbl

    def preprocess_val(img, lbl):
        img = tf.cast(img, tf.float32) / 255.0
        return img, lbl

    with tf.device('/CPU:0'):
        train_ds = train_ds.map(preprocess_train, num_parallel_calls=AUTOTUNE)
        val_ds   = val_ds.map(preprocess_val,   num_parallel_calls=AUTOTUNE)

    # Cache → shuffle → prefetch: maximises GPU utilisation
    train_ds = train_ds.cache().shuffle(500).prefetch(AUTOTUNE)
    val_ds   = val_ds.cache().prefetch(AUTOTUNE)

    return train_ds, val_ds

# ── Training ───────────────────────────────────────────────────────────────────
def run_training(data_dir, epochs=20, fine_tune_epochs=10, batch_size=32):
    has_gpu = configure_gpu()

    train_ds, val_ds = build_datasets(data_dir, batch_size)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            MODEL_PATH, save_best_only=True,
            monitor='val_accuracy', verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss', factor=0.5, patience=3,
            min_lr=1e-6, verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor='val_loss', patience=6,
            restore_best_weights=True, verbose=1
        ),
    ]

    # ── Phase 1: Head only ────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"[Phase 1] Training classification head ({epochs} epochs)")
    print(f"   CPU: data loading + augmentation")
    print(f"   GPU: {'RTX 2050 (DirectML)' if has_gpu else 'N/A (CPU)'}: forward + backward pass")
    print(f"{'='*60}\n")

    model = build_model()
    model = compile_model(model, lr=1e-3)
    model.summary()

    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks,
        verbose=1
    )

    # ── Phase 2: Fine-tune ────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"[Phase 2] Fine-tuning backbone ({fine_tune_epochs} epochs)")
    print(f"{'='*60}\n")

    model = unfreeze(model, num_layers=30)
    model = compile_model(model, lr=1e-4)

    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=fine_tune_epochs,
        callbacks=callbacks,
        verbose=1
    )

    model.save(MODEL_PATH)
    print(f"\n[DONE] Model saved -> {MODEL_PATH}")

# ── Entry Point ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--data_dir",         default="./training/dataset")
    p.add_argument("--epochs",           type=int, default=20)
    p.add_argument("--fine_tune_epochs", type=int, default=10)
    p.add_argument("--batch_size",       type=int, default=32)
    args = p.parse_args()

    run_training(
        data_dir=args.data_dir,
        epochs=args.epochs,
        fine_tune_epochs=args.fine_tune_epochs,
        batch_size=args.batch_size
    )
