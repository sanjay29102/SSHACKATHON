"""
train.py
Simplified training script for the Invoice CNN model (Classifier only).
"""

import os
import sys
import argparse
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import matplotlib.pyplot as plt

from model_def import (
    build_model, compile_model, save_model,
    unfreeze_backbone, IMG_SIZE
)

def configure_gpu():
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print(f"✅ GPU detected: {len(gpus)} device(s)")
        except RuntimeError as e:
            print(f"[GPU Config Warning] {e}")
    return bool(gpus)

def build_data_generators(data_dir, img_size=IMG_SIZE, batch_size=16):
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=5,
        width_shift_range=0.05,
        height_shift_range=0.05,
        validation_split=0.2
    )
    val_datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)

    train_gen = train_datagen.flow_from_directory(
        data_dir, target_size=img_size, batch_size=batch_size,
        class_mode='categorical', subset='training', shuffle=True
    )
    val_gen = val_datagen.flow_from_directory(
        data_dir, target_size=img_size, batch_size=batch_size,
        class_mode='categorical', subset='validation', shuffle=False
    )
    return train_gen, val_gen

def train(data_dir, epochs=30, batch_size=16, fine_tune_epochs=10):
    configure_gpu()
    train_gen, val_gen = build_data_generators(data_dir, IMG_SIZE, batch_size)

    if train_gen.samples == 0:
        print("❌ No training images found.")
        sys.exit(1)

    print("\n🚀 Phase 1: Training classification head...")
    model = build_model()
    model = compile_model(model, learning_rate=1e-3)

    history1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
        verbose=1
    )

    print(f"\n🔓 Phase 2: Fine-tuning...")
    model = unfreeze_backbone(model, num_layers=20)
    model = compile_model(model, learning_rate=1e-4)

    history2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=fine_tune_epochs,
        verbose=1
    )

    save_model(model)
    print("\n✅ Training complete!")
    return model

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="./training/dataset")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--fine_tune_epochs", type=int, default=2)
    parser.add_argument("--batch_size", type=int, default=8)
    args = parser.parse_args()

    train(data_dir=args.data_dir, epochs=args.epochs, 
          batch_size=args.batch_size, fine_tune_epochs=args.fine_tune_epochs)
