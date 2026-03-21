"""
ocr_engine.py
Tesseract OCR wrapper with field-specific extraction.
Reads text from cropped invoice regions and parses structured fields.
"""

import re
import pytesseract
import cv2
import numpy as np
from PIL import Image

# ── Tesseract Config ──────────────────────────────────────────────────────────
# Update this path if Tesseract is installed elsewhere
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Tesseract config for invoice documents
TESS_CONFIG_SINGLE = "--psm 6 --oem 3"        # Uniform block of text
TESS_CONFIG_LINE   = "--psm 7 --oem 3"        # Single line
TESS_CONFIG_SPARSE = "--psm 11 --oem 3"       # Sparse text, find as much as possible


def extract_text_from_region(region_img, mode="block"):
    """
    Run Tesseract on a cropped image region.
    mode: 'block' | 'line' | 'sparse'
    Returns: raw text string
    """
    if region_img is None or region_img.size == 0:
        return ""
    
    config = {
        "block": TESS_CONFIG_SINGLE,
        "line": TESS_CONFIG_LINE,
        "sparse": TESS_CONFIG_SPARSE
    }.get(mode, TESS_CONFIG_SINGLE)
    
    # Ensure it's a PIL Image
    if isinstance(region_img, np.ndarray):
        pil_img = Image.fromarray(region_img)
    else:
        pil_img = region_img

    try:
        text = pytesseract.image_to_string(pil_img, config=config)
        return text.strip()
    except Exception as e:
        print(f"[OCR Warning] Tesseract error: {e}")
        return ""


def extract_full_text(image_input):
    """Extract all text from a full invoice image."""
    if isinstance(image_input, np.ndarray):
        pil_img = Image.fromarray(image_input)
    elif isinstance(image_input, str):
        pil_img = Image.open(image_input)
    else:
        pil_img = image_input
    
    try:
        return pytesseract.image_to_string(pil_img, config=TESS_CONFIG_SPARSE)
    except Exception as e:
        print(f"[OCR Warning] Full-text extraction error: {e}")
        return ""


# ── Field Parsers ─────────────────────────────────────────────────────────────

def parse_gstin(text):
    """Extract Indian GSTIN — 15 character alphanumeric"""
    pattern = r'\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b'
    matches = re.findall(pattern, text.upper())
    return matches[0] if matches else None


def parse_invoice_number(text):
    """Extract invoice number patterns"""
    patterns = [
        r'(?:invoice\s*(?:no|number|#)[:\s]*)([\w\-\/]+)',
        r'(?:inv[.\s]*no[:\s]*)([\w\-\/]+)',
        r'(?:bill\s*(?:no|number)[:\s]*)([\w\-\/]+)',
        r'\b([A-Z]{2,4}[-/]\d{4,}[-/]?\d*)\b',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def parse_date(text):
    """Extract date and convert to ISO YYYY-MM-DD"""
    patterns = [
        r'(\d{2})[/\-.](\d{2})[/\-.](\d{4})',   # DD/MM/YYYY
        r'(\d{4})[/\-.](\d{2})[/\-.](\d{2})',   # YYYY-MM-DD
        r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})',   # 12 Jan 2024
    ]
    months = {
        'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,
        'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12
    }
    
    # Try DD/MM/YYYY or similar
    m = re.search(patterns[0], text)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    
    # Try YYYY-MM-DD
    m = re.search(patterns[1], text)
    if m:
        y, mo, d = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    
    # Try 12 Jan 2024
    m = re.search(patterns[2], text)
    if m:
        d = m.group(1)
        month_str = m.group(2)[:3].lower()
        y = m.group(3)
        mo = months.get(month_str)
        if mo:
            return f"{y}-{str(mo).zfill(2)}-{d.zfill(2)}"
    
    return None


def parse_amounts(text):
    """Extract monetary amounts from text"""
    # Clean text
    text = text.replace(',', '')
    amounts = re.findall(r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)', text, re.IGNORECASE)
    amounts = [float(a) for a in amounts if float(a) > 0]
    return amounts


def parse_grand_total(text):
    """Extract the grand total amount"""
    patterns = [
        r'(?:grand\s*total|total\s*amount|net\s*amount|amount\s*payable)[:\s₹Rs.]*(\d[\d,]*\.?\d*)',
        r'(?:total)[:\s₹Rs.]*(\d[\d,]*\.?\d*)',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return float(m.group(1).replace(',', ''))
    return None


def parse_tax_amounts(text):
    """Extract CGST, SGST, IGST values"""
    def find_amount(label):
        m = re.search(
            rf'{label}[^0-9₹]*(?:₹|rs\.?)?\s*(\d[\d,]*\.?\d*)',
            text, re.IGNORECASE
        )
        return float(m.group(1).replace(',', '')) if m else 0.0

    return {
        "cgst": find_amount("cgst"),
        "sgst": find_amount("sgst"),
        "igst": find_amount("igst"),
    }


def parse_phone(text):
    """Extract 10-digit Indian phone number"""
    m = re.search(r'(?:ph|mob|tel|phone)?[:\s]*(\+91[-\s]?)?([6-9]\d{9})', text, re.IGNORECASE)
    return m.group(2) if m else None


def parse_supplier_name(text):
    """Heuristic: first non-empty line is usually the supplier name"""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines[:5]:
        # Skip lines that look like addresses or dates
        if re.search(r'\d{6}|@|www\.|invoice|bill|gst|pan', line, re.IGNORECASE):
            continue
        if len(line) > 3:
            return line
    return lines[0] if lines else None


def parse_line_items(text):
    """
    Extract line items: name, qty, rate, amount.
    Looks for table-like rows with numbers.
    """
    items = []
    # Match: some text followed by numbers (qty rate amount pattern)
    pattern = r'([A-Za-z][A-Za-z0-9\s/\-]+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d[\d,]*\.?\d*)'
    for m in re.finditer(pattern, text):
        name = m.group(1).strip()
        qty  = float(m.group(2))
        rate = float(m.group(3))
        amount = float(m.group(4).replace(',', ''))
        if len(name) > 2 and amount > 0:
            items.append({
                "item_name": name,
                "item_category": "Other",
                "hsn_code": None,
                "quantity": qty,
                "unit_of_measure": "pcs",
                "rate": rate,
                "amount": amount
            })
    return items
