"""
ocr_engine_simple.py
Simplified OCR parsing - ultra-flexible pattern matching
"""

import re
import pytesseract
import cv2
import numpy as np
from PIL import Image

# ── Tesseract Config ──────────────────────────────────────────────────────────
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

TESS_CONFIG_SINGLE = "--psm 6 --oem 3"
TESS_CONFIG_LINE   = "--psm 7 --oem 3"
TESS_CONFIG_SPARSE = "--psm 11 --oem 3"


def extract_text_from_region(region_img, mode="block"):
    """Run Tesseract on a cropped image region."""
    if region_img is None or region_img.size == 0:
        return ""
    
    config = {
        "block": TESS_CONFIG_SINGLE,
        "line": TESS_CONFIG_LINE,
        "sparse": TESS_CONFIG_SPARSE
    }.get(mode, TESS_CONFIG_SINGLE)
    
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


# ── ULTRA-SIMPLE PARSERS ──────────────────────────────────────────────────────

def parse_supplier_name(text):
    """Get first meaningful line, strip numbers from end."""
    if not text or not text.strip():
        return None
    
    lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 2]
    
    for line in lines[:5]:
        # Remove anything that looks like invoice numbers  
        clean = re.sub(r'INV[-/]?\d+|IF[-/]?\d+', '', line, re.I).strip()
        clean = re.sub(r'\d{4,}', '', clean).strip()
        
        # Skip obvious non-names
        if re.match(r'^(GST|Date|Amount|Total|Invoice|Bill|QTY|Qty|PAN|TAN|No)$', clean, re.I):
            continue
            
        if len(clean) > 3 and len(clean) < 100:
            return clean
    
    return None


def parse_gstin(text):
    """Extract GST number - 15 character code."""
    if not text:
        return None
    
    # Try exact pattern first
    m = re.search(r'[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}', text.upper())
    if m:
        return m.group(0)
    
    return None


def parse_invoice_number(text):
    """Extract invoice number."""
    if not text:
        return None
    
    # Try common patterns
    patterns = [
        r'(?:INV|Invoice)\s*[-#/]?\s*(\d+)',
        r'(?:Bill|IF)\s*[-#/]?\s*(\d+)',
        r'([A-Z]{2,4}[-/]\d{4,})',
    ]
    
    for p in patterns:
        m = re.search(p, text, re.I)
        if m:
            return m.group(1)
    
    return None


def parse_date(text):
    """Extract date and convert to ISO YYYY-MM-DD."""
    if not text:
        return None
    
    patterns = [
        r'(\d{2})[/\-.](\d{2})[/\-.](\d{4})',   # DD/MM/YYYY
        r'(\d{4})[/\-.](\d{2})[/\-.](\d{2})',   # YYYY-MM-DD
        r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})',   # 12 Jan 2024
    ]
    
    months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
    
    m = re.search(patterns[0], text)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    
    m = re.search(patterns[1], text)
    if m:
        y, mo, d = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    
    m = re.search(patterns[2], text)
    if m:
        d, month_str, y = m.group(1), m.group(2)[:3].lower(), m.group(3)
        mo = months.get(month_str)
        if mo:
            return f"{y}-{str(mo).zfill(2)}-{d.zfill(2)}"
    
    return None


def parse_grand_total(text):
    """Extract the highest number that looks like a total."""
    if not text:
        return None
    
    # Look for patterns like "Grand Total: 25960" or just large numbers
    patterns = [
        r'(?:grand\s*total|total\s*amount|net\s*payable)[:\s]*([0-9.,]+)',
        r'(?:total)[:\s]*([0-9.,]+)',
    ]
    
    amounts = []
    
    for p in patterns:
        matches = re.finditer(p, text, re.I)
        for m in matches:
            try:
                amt = float(m.group(1).replace(',', ''))
                if amt > 0:
                    amounts.append(amt)
            except:
                pass
    
    if amounts:
        return max(amounts)
    
    # Fallback: find largest number in last half of text
    text_half = text[len(text)//2:]
    nums = re.findall(r'(\d+(?:,\d+)*)', text_half)
    if nums:
        try:
            amounts = [float(n.replace(',', '')) for n in nums if len(n) < 20]
            if amounts:
                return max(amounts)
        except:
            pass
    
    return None


def parse_tax_amounts(text):
    """Extract CGST, SGST, IGST - just find the number after the label."""
    if not text:
        return {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}
    
    result = {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}
    
    # Clean text to normalize spaces
    normalized_text = re.sub(r'\s+', ' ', text)
    
    for tax_type in ["cgst", "sgst", "igst"]:
        # Match CGST/SGST/IGST, skip an optional percentage rate, and capture the amount
        pattern = rf'{tax_type}\s*[@%:]?\s*(?:\d+(?:\.\d+)?\s*%?)?\s*[:\s₹Rs.]*([\d,]+\.?\d{{2}})'
        m = re.search(pattern, normalized_text, re.I)
        
        if not m:
            # Fallback for integer amounts
            pattern = rf'{tax_type}\s*[@%:]?\s*(?:\d+(?:\.\d+)?\s*%?)?\s*[:\s₹Rs.]*(\d+(?:[.,]\d+)*)'
            m = re.search(pattern, normalized_text, re.I)
            
        if m:
            try:
                val = float(m.group(1).replace(',', '').replace(' ', ''))
                if val < 1000000:
                    result[tax_type] = val
            except:
                pass
    
    return result


def parse_phone(text):
    """Extract 10-digit Indian phone number."""
    if not text:
        return None
    
    m = re.search(r'(?:ph|mob|tel|phone|contact)[:\s]*(\+91[-\s]?)?([6-9]\d{9})', text, re.I)
    if m:
        return m.group(2) if len(m.group(2)) == 10 else None
    
    return None


def parse_line_items(text):
    """
    Extract items - find lines with: TEXT QTY RATE AMOUNT pattern.
    Ultra-simple: split by newlines and try pattern on each.
    """
    items = []
    
    if not text or not text.strip():
        return items
    
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        # Skip header/footer lines and lines that are clearly not items
        if not line or re.match(r'^\s*(sr|s\.?no|item|description|qty|unit|rate|amount|total|hsn|invoice|bill|company|supplier)', line, re.I):
            continue
        
        # Pattern: [Optional S.No] [Item Name with spaces] [Optional HSN] [Qty] [Rate] [Amount]
        # This is a robust pattern looking for 3 numbers (int or float) at the end of a line
        m = re.search(r'(?:\d+\.?\s+)?([A-Za-z][A-Za-z0-9\s/\-.,&()]*?)\s+(?:\d{4,}\s+)?(\d+\.?\d*)\s+([0-9.]+\.?\d*)\s+([0-9,]+\.?\d*)', line)
        
        if m:
            try:
                name = m.group(1).strip()
                # Clean up name: remove noise and leading number leftovers
                name = re.sub(r'^\d+\.\s+', '', name).strip()
                name = re.sub(r'\s+', ' ', name).strip()
                
                qty = float(m.group(2))
                rate = float(m.group(3))
                amount = float(m.group(4).replace(',', ''))
                
                if len(name) >= 2 and qty > 0 and amount > 0:
                    # Try to pick up HSN if it was in the line (4-8 digits)
                    hsn_match = re.search(r'\b(\d{4,8})\b', line)
                    hsn = hsn_match.group(1) if hsn_match else None
                    
                    items.append({
                        "item_name": name[:80],
                        "item_category": "Other",
                        "hsn_code": hsn,
                        "quantity": round(qty, 2),
                        "unit_of_measure": "pcs",
                        "rate": round(rate, 2),
                        "amount": round(amount, 2)
                    })
            except:
                pass
    
    # Remove exact duplicates
    seen = set()
    unique = []
    for item in items:
        key = (item['item_name'], round(item['amount'], 2))
        if key not in seen:
            unique.append(item)
            seen.add(key)
    
    return unique
