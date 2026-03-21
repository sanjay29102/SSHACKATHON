"""
preprocessing.py
Invoice image preprocessing pipeline using OpenCV.
Cleans, deskews, and enhances invoice images before CNN inference.
"""

import cv2
import numpy as np
from PIL import Image
import io


def preprocess_for_cnn(image_input, target_size=(224, 224)):
    """
    Full preprocessing pipeline for CNN input.
    Accepts: file path (str), bytes, PIL Image, or numpy array.
    Returns: normalized numpy array of shape (1, 224, 224, 3)
    """
    img = _load_image(image_input)
    img = _resize_and_pad(img, target_size)
    img = img.astype(np.float32) / 255.0
    return np.expand_dims(img, axis=0)


def preprocess_for_ocr(image_input):
    """
    Preprocessing pipeline optimized for Tesseract OCR.
    Returns: grayscale enhanced numpy array (uint8)
    """
    img = _load_image(image_input)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = _deskew(gray)
    gray = _denoise(gray)
    gray = _binarize(gray)
    return gray


def crop_region(image_input, bbox, padding=5):
    """
    Crop a region from the image given a bounding box.
    bbox: (x1, y1, x2, y2) in pixel coordinates
    """
    img = _load_image(image_input)
    h, w = img.shape[:2]
    x1, y1, x2, y2 = bbox
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    return img[y1:y2, x1:x2]


# ── Internal helpers ────────────────────────────────────────────────────────

def _load_image(image_input):
    """Load image from various input types → BGR numpy array"""
    if isinstance(image_input, str):
        img = cv2.imread(image_input)
        if img is None:
            raise ValueError(f"Could not read image: {image_input}")
        return img
    elif isinstance(image_input, bytes):
        arr = np.frombuffer(image_input, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    elif isinstance(image_input, Image.Image):
        return cv2.cvtColor(np.array(image_input.convert('RGB')), cv2.COLOR_RGB2BGR)
    elif isinstance(image_input, np.ndarray):
        return image_input
    else:
        raise TypeError(f"Unsupported image type: {type(image_input)}")


def _resize_and_pad(img, target_size):
    """Resize image maintaining aspect ratio with padding"""
    h, w = img.shape[:2]
    th, tw = target_size
    scale = min(tw / w, th / h)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    canvas = np.ones((th, tw, 3), dtype=np.uint8) * 255
    x_off = (tw - new_w) // 2
    y_off = (th - new_h) // 2
    canvas[y_off:y_off + new_h, x_off:x_off + new_w] = resized
    return canvas


def _deskew(gray_img):
    """Correct skew in document images"""
    coords = np.column_stack(np.where(gray_img < 200))
    if len(coords) < 10:
        return gray_img
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.5:
        return gray_img
    h, w = gray_img.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(gray_img, M, (w, h),
                              flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)
    return rotated


def _denoise(gray_img):
    """Remove noise while preserving text edges"""
    return cv2.fastNlMeansDenoising(gray_img, h=10, templateWindowSize=7, searchWindowSize=21)


def _binarize(gray_img):
    """Adaptive thresholding for clean black-on-white text"""
    return cv2.adaptiveThreshold(
        gray_img, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 10
    )
