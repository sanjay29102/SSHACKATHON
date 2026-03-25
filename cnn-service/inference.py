"""
inference.py
Full inference pipeline: image → CNN → OCR → structured JSON
Replaces what the Gemini API used to do.
"""

import cv2
import numpy as np
from preprocessing import preprocess_for_cnn, preprocess_for_ocr, crop_region
from model_def import load_model, predict, FIELD_NAMES
from ocr_engine_simple import (
    extract_full_text, extract_text_from_region,
    parse_gstin, parse_invoice_number, parse_date,
    parse_grand_total, parse_tax_amounts, parse_phone,
    parse_supplier_name, parse_line_items
)

# Load model globally (once at startup)
_model = None

def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


def process_invoice(image_path):
    """
    Full pipeline for a single invoice image.
    Returns a dict matching the Gemini output schema.
    """
    model = get_model()

    # 1. Load original image dimensions
    original = cv2.imread(image_path)
    if original is None:
        raise ValueError(f"Cannot read image: {image_path}")
    h, w = original.shape[:2]

    # 2. CNN Inference — category + field bounding boxes
    cnn_input = preprocess_for_cnn(image_path, target_size=(224, 224))
    category, cat_confidence, field_bboxes = predict(model, cnn_input)

    # 3. Preprocess full image for OCR
    ocr_ready = preprocess_for_ocr(image_path)

    # 4. Extract full text (fallback + items)
    full_text = extract_full_text(ocr_ready)

    # 5. Extract text from each CNN-detected region
    field_texts = {}
    if field_bboxes:  # Only process if bboxes are available
        for field_name, (nx1, ny1, nx2, ny2) in field_bboxes.items():
            # De-normalize bounding box to pixel coords
            x1 = int(nx1 * w)
            y1 = int(ny1 * h)
            x2 = int(nx2 * w)
            y2 = int(ny2 * h)

            # Only crop if bbox is valid and non-trivial
            if x2 > x1 + 5 and y2 > y1 + 5:
                try:
                    cropped = crop_region(original, (x1, y1, x2, y2))
                    cropped_gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
                    field_texts[field_name] = extract_text_from_region(
                        cropped_gray, mode="line"
                    )
                except Exception as e:
                    print(f"[Warning] Could not extract text from {field_name}: {e}")
                    field_texts[field_name] = ""
            else:
                field_texts[field_name] = ""
    else:
        # If no bboxes available, initialize empty field_texts
        field_texts = {fname: "" for fname in ["supplier_name", "supplier_gstin", "invoice_number", "invoice_date", "grand_total"]}

    # 6. Parse structured fields
    supplier_text = field_texts.get("supplier_name", "") or full_text
    gstin_text    = field_texts.get("supplier_gstin", "") or full_text
    inv_num_text  = field_texts.get("invoice_number", "") or full_text
    date_text     = field_texts.get("invoice_date", "") or full_text
    total_text    = field_texts.get("grand_total", "") or full_text

    supplier_name   = parse_supplier_name(supplier_text)
    supplier_gstin  = parse_gstin(gstin_text)
    invoice_number  = parse_invoice_number(inv_num_text)
    invoice_date    = parse_date(date_text)
    grand_total     = parse_grand_total(total_text) or parse_grand_total(full_text)
    phone           = parse_phone(full_text)
    tax             = parse_tax_amounts(full_text)
    items           = parse_line_items(full_text)

    # 7. Compute sub_total from items if available
    sub_total = round(sum(it["amount"] for it in items), 2)
    tax_total = round(tax["cgst"] + tax["sgst"] + tax["igst"], 2)
    if grand_total is None and sub_total > 0:
        grand_total = round(sub_total + tax_total, 2)

    # 8. Confidence scores (CNN softmax → percentage)
    def conf(field, value):
        # Field-specific confidence check
        has_value = value is not None and str(value).strip() != ""
        
        # Base from CNN classification confidence
        base = min(cat_confidence, 90.0)
        
        # Boost if field is clearly found with good regex match
        boost = 0
        if has_value:
            boost = 10
            # Extra boost for specific well-formatted data
            if field == "supplier_gstin" and len(str(value)) == 15: boost += 10
            if field == "invoice_number" and len(str(value)) > 3: boost += 5
            if field == "grand_total" and float(value or 0) > 0: boost += 5
            
        return min(round(base + boost, 1), 100.0)

    result = {
        "invoice_category": category,
        "supplier": {
            "name":    supplier_name,
            "gstin":   supplier_gstin,
            "address": None,
            "phone":   phone,
        },
        "invoice": {
            "invoice_number": invoice_number,
            "invoice_date":   invoice_date,
            "place_of_supply": None,
            "payment_terms":  None,
        },
        "items": items if items else [],
        "tax": tax,
        "totals": {
            "sub_total":   sub_total,
            "tax_total":   tax_total,
            "grand_total": grand_total,
        },
        "confidence_scores": {
            "supplier_name":  conf("supplier_name", supplier_name),
            "supplier_gstin": conf("supplier_gstin", supplier_gstin),
            "invoice_number": conf("invoice_number", invoice_number),
            "invoice_date":   conf("invoice_date", invoice_date),
            "grand_total":    conf("grand_total", grand_total),
        }
    }
    return result


def process_batch(image_paths):
    """
    Process multiple invoice images.
    Returns dict matching Gemini batch response schema:
    { "processed_invoices": [...] }
    """
    processed = []
    for path in image_paths:
        try:
            result = process_invoice(path)
            processed.append(result)
        except Exception as e:
            print(f"[Inference Error] {path}: {e}")
            processed.append(_empty_invoice(str(e)))
    return {"processed_invoices": processed}


def _empty_invoice(error_msg=""):
    return {
        "invoice_category": "Other",
        "supplier": {"name": None, "gstin": None, "address": None, "phone": None},
        "invoice": {"invoice_number": None, "invoice_date": None, "place_of_supply": None, "payment_terms": None},
        "items": [],
        "tax": {"cgst": 0, "sgst": 0, "igst": 0},
        "totals": {"sub_total": 0, "tax_total": 0, "grand_total": 0},
        "confidence_scores": {"supplier_name": 0, "supplier_gstin": 0, "invoice_number": 0, "invoice_date": 0, "grand_total": 0},
        "error": error_msg
    }
