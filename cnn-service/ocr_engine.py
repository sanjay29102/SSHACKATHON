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
    """
    Extract Indian GSTIN — 15 character alphanumeric.
    Format: 2 digit state code + 5 digit PAN + 4 digit registration + 1 letter + 1 digit/letter + Z + 1 digit/letter
    """
    if not text:
        return None
    
    pattern = r'\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b'
    matches = re.findall(pattern, text.upper())
    
    if matches:
        return matches[0]
    
    # Fallback: try to find GSTIN with loose formatting (spaces/dashes)
    loose_pattern = r'(?:gstin|gst\s*in)[:\s]*([0-9]{2}[-\s]?[A-Z]{5}[-\s]?[0-9]{4}[-\s]?[A-Z]{1}[-\s]?[1-9A-Z]{1}[-\s]?Z[-\s]?[0-9A-Z]{1})'
    loose_match = re.search(loose_pattern, text.upper())
    if loose_match:
        # Clean up the matched GSTIN
        gstin = loose_match.group(1).replace(' ', '').replace('-', '')
        if re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', gstin):
            return gstin
    
    return None


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
    """
    Extract the grand total amount with robust pattern matching.
    Handles various labels and formats like "Grand Total", "Net Amount", "Total Payable", etc.
    """
    if not text or not text.strip():
        return None
    
    # Normalize text: remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    
    # Pattern 1: Explicit grand total labels with various formats
    patterns = [
        # Grand total / Total amount / etc., optionally followed by currency symbol
        r'(?:grand\s*total|total\s*amount|net\s*amount|amount\s*payable|total\s*payable)[:\s₹Rs.]*(\d[\d,]*\.?\d*)',
        # Just "total" but more context-specific
        r'(?:^|\s)total[:\s₹Rs.]*(\d[\d,]*\.?\d*)(?:\s|$)',
        # Amount due / Amount to pay
        r'(?:amount\s*(?:due|to\s*pay)|payable)[:\s₹Rs.]*(\d[\d,]*\.?\d*)',
    ]
    
    amounts = []
    for p in patterns:
        matches = re.finditer(p, text, re.IGNORECASE | re.MULTILINE)
        for m in matches:
            try:
                amount = float(m.group(1).replace(',', ''))
                if amount > 0:
                    amounts.append(amount)
            except (ValueError, IndexError):
                continue
    
    # If we found amounts, return the largest one (usually the final total)
    if amounts:
        return max(amounts)
    
    # Fallback: look for any large number that looks like a total
    # Numbers in the second half of the text are more likely to be totals
    text_half = text[len(text)//2:]
    fallback_matches = re.findall(r'(\d[\d,]*\.?\d*)', text_half)
    if fallback_matches:
        try:
            amounts = [float(m.replace(',', '')) for m in fallback_matches if m.replace(',', '').replace('.', '').isdigit()]
            if amounts:
                return max(amounts)  # Take the largest number as likely total
        except ValueError:
            pass
    
    return None


def parse_tax_amounts(text):
    """
    Extract CGST, SGST, IGST values with robust pattern matching.
    Handles various formats and separators.
    """
    if not text:
        return {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}
    
    result = {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}
    
    for tax_type in ["cgst", "sgst", "igst"]:
        # Pattern 1: Label followed by amount (with various separators)
        pattern1 = rf'{tax_type}\s*[@%]?\s*(?:₹|rs\.?|inr)?\s*[:\s]*([\d,]*\.?\d+)'
        m = re.search(pattern1, text, re.IGNORECASE)
        if m:
            try:
                result[tax_type] = float(m.group(1).replace(',', ''))
                continue
            except (ValueError, IndexError):
                pass
        
        # Pattern 2: Tax label with percentage and then amount on same/next line
        pattern2 = rf'{tax_type}\s*[@/]?\s*\d+\s*%?\s*(?:₹|rs\.?)?\s*[:\s]*([\d,]*\.?\d+)'
        m = re.search(pattern2, text, re.IGNORECASE)
        if m:
            try:
                result[tax_type] = float(m.group(1).replace(',', ''))
                continue
            except (ValueError, IndexError):
                pass
        
        # Pattern 3: Look for amounts near the tax label (within next 50 chars)
        pattern3 = rf'{tax_type}[^\d]*([\d,]*\.?\d+)'
        m = re.search(pattern3, text, re.IGNORECASE)
        if m:
            try:
                potential_amount = m.group(1).replace(',', '')
                # Validate: it's a reasonable amount (not too long)
                if len(potential_amount.replace('.', '')) <= 10:
                    result[tax_type] = float(potential_amount)
                    continue
            except (ValueError, IndexError):
                pass
    
    return result


def parse_phone(text):
    """
    Extract 10-digit Indian phone number.
    Handles various formats: +91-9876543210, 098765432, 91 98765 43210, etc.
    """
    if not text:
        return None
    
    # Pattern 1: 10-digit phone (standard Indian format)
    m = re.search(r'(?:ph|mob|tel|phone|contact)?[:\s]*(\+91[-\s]?)?([6-9]\d{9})', text, re.IGNORECASE)
    if m:
        phone = m.group(2)
        # Validate: starts with 6-9 (valid mobile range)
        if phone and len(phone) == 10 and phone[0] in '6789':
            return phone
    
    # Pattern 2: With country code explicitly written out
    m = re.search(r'(?:+91|0091|country\s*code)[-\s]*([6-9]\d{9})', text, re.IGNORECASE)
    if m:
        phone = m.group(1)
        if len(phone) == 10 and phone[0] in '6789':
            return phone
    
    # Pattern 3: Simple 10-digit numbers in phone/mobile context
    context_match = re.search(r'(?:phone|mobile|contact|tel)[:\s]*(\d{10})', text, re.IGNORECASE)
    if context_match:
        phone = context_match.group(1)
        if phone[0] in '6789':
            return phone
    
    return None


def parse_supplier_name(text):
    """
    Extract supplier name from invoice header region.
    More robust heuristics to identify company names.
    """
    if not text or not text.strip():
        return None
    
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # Exclude common non-supplier lines
    exclude_patterns = [
        r'^\d+$',                          # Pure numbers
        r'(?:bill|invoice|po|quotation|inq)',  # Document types (case-insensitive)
        r'^\d+\s*[-/]\s*\d+',             # Date patterns
        r'^\d{2,6}$',                      # Postal codes
        r'^@|^email|^www\.|^http',        # Internet markers
        r'^(?:gst|tan|pan|aadhaar|cin)',  # Tax/ID markers
        r'^\d+\.\d+\.\d+\.\d+',           # IP addresses
        r'^(?:total|amount|paid|due|balance)',  # Financial terms
        r'(?:remark|note|comment|signature)', # Form labels
        r'^(?:qty|quantity|rate|price|unit)',  # Item table headers
        r'(?:inv[-/]?\d+|invoice\s*no|reference)',  # Invoice numbers
    ]
    
    candidate_suppliers = []
    
    for i, line in enumerate(lines[:10]):  # Look in first 10 lines
        # Skip excluded patterns
        if any(re.search(pattern, line, re.IGNORECASE) for pattern in exclude_patterns):
            continue
        
        # Remove invoice numbers or references from the line
        cleaned_line = re.sub(r'\s+INV\s*[-/]?\s*\d+', '', line, flags=re.IGNORECASE).strip()
        cleaned_line = re.sub(r'\s+\d{4,}', '', cleaned_line).strip()  # Remove trailing numbers
        
        # Skip if cleaned line is too short
        if len(cleaned_line) < 4:
            continue
        
        # Skip lines with too many numbers (likely addresses)
        if len(re.findall(r'\d', cleaned_line)) > len(cleaned_line) * 0.3:
            continue
        
        # Prefer lines that look like proper nouns (capitalized words)
        caps_words = len(re.findall(r'\b[A-Z][a-z]+\b', cleaned_line))
        
        # Score the candidate
        score = 0
        score += caps_words * 3          # Capitalized words indicate company name
        score += 15 if i < 2 else 5      # Earlier lines are more likely to be company name
        score -= len(re.findall(r'[^a-zA-Z0-9\s&\-\.]', cleaned_line)) * 2  # Penalize special chars
        
        if cleaned_line and len(cleaned_line) > 3:
            candidate_suppliers.append((score, cleaned_line))
    
    # Return highest scoring candidate
    if candidate_suppliers:
        candidate_suppliers.sort(reverse=True, key=lambda x: x[0])
        best_name = candidate_suppliers[0][1]
        # Final cleanup: remove trailing invoice numbers or dates
        best_name = re.sub(r'\s+(INV|INV-|IF|/|-)\s*\d+.*$', '', best_name, flags=re.IGNORECASE).strip()
        return best_name if best_name else candidate_suppliers[0][1]
    
    return lines[0] if lines else None


def parse_line_items(text):
    """
    Extract line items: name, qty, rate, amount.
    Handles various invoice table formats with robust pattern matching.
    """
    items = []
    
    if not text or not text.strip():
        return items
    
    # Split into lines for processing
    lines = text.split('\n')
    
    # Find lines that contain numeric patterns (qty, rate, amount)
    for line in lines:
        # Skip header/footer lines
        if re.search(r'^\s*(sr|s\.?no|item|description|qty|unit|rate|amount|total|hsn|page)', line, re.IGNORECASE):
            continue
        
        # Skip lines with too much text and few numbers
        if len(line.replace(re.sub(r'[0-9.,₹Rs-]', '', line), '')) < 10:
            continue
        
        # Try multiple patterns for extracting items
        # Pattern 1: Text followed by numbers (qty, rate, amount) with flexible spacing
        pattern1 = r'^\s*([A-Za-z][A-Za-z0-9\s/\-.,&()#]*?)\s+(\d+\.?\d*)\s+(\d+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s*$'
        
        # Pattern 2: With HSN code and other fields
        pattern2 = r'^\s*(?:\d+\.?\s*)?([A-Za-z][A-Za-z0-9\s/\-.,&()]*?)\s+(?:\d{4,}\s+)?([\d.]+)\s+(?:[A-Za-z]*\s+)?([\d.]+)\s+([\d,]+(?:\.\d{1,2})?)\s*$'
        
        # Pattern 3: More lenient - any text with 3+ numbers at the end
        pattern3 = r'([A-Za-z][A-Za-z0-9\s/\-.,&()#]*?)\s+(\d+\.?\d*)\s+([\d.]+)\s+([\d,]+\.?\d*)'
        
        for pattern in [pattern1, pattern2, pattern3]:
            m = re.search(pattern, line)
            if m:
                try:
                    name = m.group(1).strip()
                    qty = float(m.group(2))
                    rate = float(m.group(3))
                    amount = float(m.group(4).replace(',', ''))
                    
                    # Clean up name
                    name = re.sub(r'^[0-9.]+\s*', '', name).strip()  # Remove leading numbers
                    name = re.sub(r'\s+', ' ', name).strip()        # Collapse spaces
                    name = name[:80]  # Limit length
                    
                    # Validate item
                    if len(name) >= 2 and amount > 0 and qty > 0:
                        # Optional: validate amount ≈ qty * rate (with 20% tolerance)
                        expected = qty * rate
                        if expected > 0:
                            variance = abs(amount - expected) / expected
                            # Accept if within range or if qty/rate looks reasonable
                            if variance < 0.25 or (qty <= 1000 and rate <= 100000):
                                items.append({
                                    "item_name": name,
                                    "item_category": "Other",
                                    "hsn_code": None,
                                    "quantity": round(qty, 2),
                                    "unit_of_measure": "pcs",
                                    "rate": round(rate, 2),
                                    "amount": round(amount, 2)
                                })
                                break  # Move to next line
                except (ValueError, IndexError, AttributeError):
                    continue
    
    # Remove duplicates and sort by amount
    unique_items = []
    seen = set()
    for item in items:
        key = (item['item_name'], round(item['amount'], 2))
        if key not in seen:
            unique_items.append(item)
            seen.add(key)
    
    return sorted(unique_items, key=lambda x: x['amount'], reverse=True)
