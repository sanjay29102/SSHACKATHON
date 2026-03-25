"""
inference_lite.py
Pure-Python invoice OCR pipeline using PIL + pytesseract.
No OpenCV or TensorFlow required.
Falls back to structured empty response if Tesseract is not installed.
"""

import re
import os

try:
    from PIL import Image, ImageFilter, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_PATHS = [
        r"C:\Users\SANJAY G\Downloads\tesseract.exe",
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\SANJAY G\AppData\Local\Tesseract-OCR\tesseract.exe",
        r"C:\tools\tesseract\tesseract.exe",
    ]
    for _p in TESSERACT_PATHS:
        if os.path.exists(_p):
            pytesseract.pytesseract.tesseract_cmd = _p
            print(f"[Lite] Tesseract found at: {_p}")
            break
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


# ── Category Classification ────────────────────────────────────────────────────

CATEGORY_KEYWORDS = {
    "Textiles":            ["fabric", "cloth", "textile", "yarn", "cotton", "silk", "wool", "saree", "kurta", "garment", "apparel", "thread"],
    "Electronics":         ["laptop", "computer", "phone", "mobile", "cable", "charger", "battery", "electronic", "circuit", "component", "led", "tv", "monitor", "techvision"],
    "Office Supplies":     ["paper", "pen", "pencil", "stationery", "printer", "toner", "folder", "envelope", "stapler", "office"],
    "Machinery":           ["machine", "motor", "pump", "compressor", "equipment", "tool", "drill", "lathe", "generator"],
    "Packaging Materials": ["box", "carton", "packing", "packaging", "tape", "wrap", "bag", "pouch", "container"],
    "Raw Materials":       ["steel", "iron", "aluminium", "copper", "plastic", "rubber", "chemical", "resin", "polymer"],
    "Transportation":      ["freight", "transport", "logistics", "courier", "delivery", "shipping", "fuel", "diesel", "petrol"],
    "Services":            ["service", "consulting", "maintenance", "repair", "labour", "labor", "manpower", "support", "subscription"],
    "Utilities":           ["electricity", "water", "gas", "internet", "telephone", "broadband", "utility", "power", "bill"],
}

def classify_category(text):
    text_lower = text.lower()
    scores = {cat: sum(1 for kw in kws if kw in text_lower)
              for cat, kws in CATEGORY_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "Other"


# ── Image → Text ───────────────────────────────────────────────────────────────

def extract_text_from_image(image_path):
    if not PIL_AVAILABLE or not TESSERACT_AVAILABLE:
        return ""
    try:
        img = Image.open(image_path).convert("L")

        # Scale up small images for better OCR
        w, h = img.size
        if w < 1800:
            scale = 1800 / w
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        # Improve contrast then sharpen
        img = ImageOps.autocontrast(img, cutoff=1)
        img = img.filter(ImageFilter.SHARPEN)
        img = img.filter(ImageFilter.SHARPEN)  # double-sharpen for printed text

        # Pass 1: structured block mode (best for tables/columns)
        t1 = pytesseract.image_to_string(img, config="--psm 6 --oem 3")
        # Pass 2: sparse mode (catches text outside tables)
        t2 = pytesseract.image_to_string(img, config="--psm 11 --oem 3")

        # Merge: prefer the longer result, append unique lines from the other
        lines1 = set(l.strip() for l in t1.split('\n') if l.strip())
        lines2 = set(l.strip() for l in t2.split('\n') if l.strip())

        # Combine – start with block output (ordered), add sparse-only lines at end
        combined = t1.rstrip()
        extra = lines2 - lines1
        if extra:
            combined += "\n" + "\n".join(sorted(extra))

        return combined
    except Exception as e:
        print(f"[Lite OCR Error] {e}")
        return ""


# ── Field Parsers ──────────────────────────────────────────────────────────────

def parse_gstin(text):
    """15-char Indian GSTIN"""
    pattern = r'\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b'
    matches = re.findall(pattern, text.upper())
    return matches[0] if matches else None


def parse_invoice_number(text):
    patterns = [
        r'(?:invoice\s*(?:no|number|#)[:\s#]*)([\w\-\/]+)',
        r'(?:inv[.\s]*no[:\s]*)([\w\-\/]+)',
        r'(?:bill\s*(?:no|number)[:\s]*)([\w\-\/]+)',
        r'\b(INV[-/]\d+[\w\-\/]*)\b',
        r'\b([A-Z]{2,6}[-/]\d{2,}[-/]?[\w]*)\b',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            # Reject if it looks like a date or short number
            if not re.match(r'^\d{1,2}$', val):
                return val
    return None


def parse_date(text):
    months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,
               'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
    # DD/MM/YYYY or DD-MM-YYYY
    m = re.search(r'(\d{2})[/\-.](\d{2})[/\-.](\d{4})', text)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    # YYYY-MM-DD
    m = re.search(r'(\d{4})[/\-.](\d{2})[/\-.](\d{2})', text)
    if m:
        y, mo, d = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    # 12 Jan 2024 / 12 January 2024
    m = re.search(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', text)
    if m:
        d, month_str, y = m.group(1), m.group(2)[:3].lower(), m.group(3)
        mo = months.get(month_str)
        if mo:
            return f"{y}-{str(mo).zfill(2)}-{d.zfill(2)}"
    return None


def parse_grand_total(text):
    patterns = [
        r'(?:grand\s*total)[:\s₹Rs.]*(\d[\d,]*\.?\d*)',
        r'(?:total\s*amount|net\s*amount|amount\s*payable)[:\s₹Rs.]*(\d[\d,]*\.?\d*)',
        r'(?:total)[:\s₹Rs.]*(\d[\d,]*\.?\d*)',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return float(m.group(1).replace(',', ''))
    return None


def parse_subtotal(text):
    m = re.search(r'(?:sub\s*total|subtotal)[:\s₹Rs.]*(\d[\d,]*\.?\d*)', text, re.IGNORECASE)
    if m:
        return float(m.group(1).replace(',', ''))
    return None


def parse_tax_amounts(text):
    """
    Extract CGST, SGST, IGST amounts from invoice text.
    Handles patterns like:
      - "CGST @ 9%: 1,980"  (skip the % rate, grab the amount)
      - "CGST: 1980.00"
      - "CGST 9% 1980"
    """
    if not text:
        return {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}

    result = {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}

    # Work line-by-line so we don't accidentally mix values across lines
    lines = text.split('\n')

    for tax_key in ["cgst", "sgst", "igst"]:
        for line in lines:
            if not re.search(tax_key, line, re.I):
                continue
            # Remove the tax label itself, then the optional rate (e.g. "9%" or "@ 9 %")
            # leaving only the amount number at the end
            stripped = re.sub(
                rf'{tax_key}\s*[@:@]?\s*\d*\.?\d*\s*%?\s*',
                '', line, flags=re.I
            ).strip()
            # Now grab the LAST number on the remaining text – that's the amount
            nums = re.findall(r'[\d,]+\.?\d*', stripped)
            if nums:
                try:
                    val = float(nums[-1].replace(',', ''))
                    if 0 < val < 1_000_000:
                        result[tax_key] = val
                        break
                except ValueError:
                    pass

    # Fallback: if none found, look for a bare GST label and split equally
    if result["cgst"] == 0 and result["sgst"] == 0 and result["igst"] == 0:
        m = re.search(r'\bGST\b[^0-9]*(\d[\d,]*\.?\d*)', text, re.IGNORECASE)
        if m:
            try:
                half = round(float(m.group(1).replace(',', '')) / 2, 2)
                result["cgst"] = half
                result["sgst"] = half
            except ValueError:
                pass

    return result


def parse_phone(text):
    m = re.search(r'(?:ph|mob|tel|phone|contact)?[:\s]*(\+91[-\s]?)?([6-9]\d{9})\b', text, re.IGNORECASE)
    return m.group(2) if m else None


def parse_supplier_name(text):
    """
    Find the supplier/company name.
    Strategy:
      1. Prefer lines containing business-entity keywords (Pvt, Ltd, Traders…)
      2. Fall back to the first clean non-metadata line
    Crucially: strip any trailing invoice-number references (INV-xxxx).
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    def _clean(line):
        # Remove invoice-number suffixes like INV-2451, IF/2451, etc.
        line = re.sub(r'\s+(INV|INVOICE|IF|BILL|PO)[-/\s#]*\d+.*$', '', line, flags=re.I).strip()
        # Remove standalone 4+ digit numbers (serial numbers, zip codes in name line)
        line = re.sub(r'\s+\d{4,}', '', line).strip()
        # Remove non-alphanumeric chars except common business punctuation
        line = re.sub(r'[^A-Za-z0-9\s\.\,\&\-]', '', line).strip()
        return line

    biz_keywords = re.compile(
        r'\b(pvt|ltd|llp|llc|inc|corp|traders|industries|enterprises|solutions|'
        r'services|group|co\b|company|electronics|technologies|tech|retail|'
        r'manufacturing|exports|imports|textiles|fabrics|garments|apparels)\b',
        re.IGNORECASE
    )

    for line in lines[:15]:
        if biz_keywords.search(line) and len(line) > 4:
            clean = _clean(line)
            if len(clean) > 3:
                return clean

    # Fallback: first non-metadata line
    skip = re.compile(
        r'\d{6}|@|www\.|invoice|bill|gst|pan|tax|date|no\.?:|#|purchase',
        re.IGNORECASE
    )
    for line in lines[:8]:
        if not skip.search(line) and len(line) > 3:
            return _clean(line)

    return _clean(lines[0]) if lines else None


def parse_address(text):
    """
    Extract supplier address: look for lines with pin codes, street patterns, city names.
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    address_parts = []

    address_pattern = re.compile(
        r'(\d{1,4}[\s,]+[A-Za-z].*(?:road|rd|street|st|nagar|park|colony|'
        r'industrial|area|zone|phase|block|sector|floor|building|plot|house|lane|marg|'
        r'avenue|cross|layout|villa|residency|complex|estate)\b.*|\d{6})',
        re.IGNORECASE
    )
    city_pattern = re.compile(
        r'\b(mumbai|delhi|bangalore|bengaluru|chennai|hyderabad|kolkata|pune|'
        r'ahmedabad|surat|jaipur|lucknow|kanpur|nagpur|indore|bhopal|'
        r'visakhapatnam|vadodara|coimbatore|ludhiana)\b',
        re.IGNORECASE
    )
    pincode_pattern = re.compile(r'\b[1-9]\d{5}\b')

    for line in lines:
        if address_pattern.search(line) or city_pattern.search(line) or pincode_pattern.search(line):
            clean = re.sub(r'[|]', '', line).strip()
            if len(clean) > 4 and clean not in address_parts:
                address_parts.append(clean)
        if len(address_parts) >= 3:
            break

    if address_parts:
        return ', '.join(address_parts)
    return None


def parse_place_of_supply(text):
    """
    Extract place of supply — often a state name or city near GSTIN prefix or explicit label.
    """
    # Explicit label
    m = re.search(r'(?:place\s*of\s*supply)[:\s]*([A-Za-z\s]+?)(?:\n|,|\|)', text, re.IGNORECASE)
    if m:
        val = m.group(1).strip()
        if len(val) > 2:
            return val

    # Known Indian states
    states = [
        "Andhra Pradesh", "Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat",
        "Rajasthan", "Uttar Pradesh", "West Bengal", "Telangana", "Kerala",
        "Punjab", "Haryana", "Bihar", "Madhya Pradesh", "Odisha",
        "Delhi", "Goa", "Assam", "Jharkhand", "Chhattisgarh",
        "Uttarakhand", "Himachal Pradesh", "Jammu", "Manipur", "Meghalaya"
    ]
    for state in states:
        if re.search(r'\b' + re.escape(state) + r'\b', text, re.IGNORECASE):
            return state

    # Indian cities as fallback
    cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad",
              "Kolkata", "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow"]
    for city in cities:
        if re.search(r'\b' + city + r'\b', text, re.IGNORECASE):
            return city

    # Derive state from GSTIN first 2 digits
    gstin = parse_gstin(text)
    if gstin:
        state_codes = {
            "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
            "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
            "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
            "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
            "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
            "16": "Tripura", "17": "Meghalaya", "18": "Assam",
            "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
            "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
            "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
            "32": "Kerala", "33": "Tamil Nadu", "36": "Telangana",
            "37": "Andhra Pradesh"
        }
        code = gstin[:2]
        if code in state_codes:
            return state_codes[code]

    return None


def parse_payment_terms(text):
    patterns = [
        r'(?:payment\s*terms?)[:\s]*([^\n,|]{2,40})',
        r'(?:due\s*(?:in|within|date))[:\s]*([^\n,|]{2,30})',
        r'\b(net\s*\d+\s*days?)\b',
        r'\b(\d+\s*days?\s*(?:net|credit)?)\b',
        r'\b(immediate|on\s*delivery|advance|cod|cash\s*on\s*delivery)\b',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if len(val) > 1:
                return val
    return None


def parse_line_items(text):
    """
    Extract line items: name, qty, rate, amount.
    Handles various invoice table formats with robust pattern matching.
    """
    items = []
    SKIP = re.compile(
        r'^\s*(sr\.?|s\.?no\.?|item|description|particulars|qty|quantity|unit|'
        r'uom|rate|amount|total|subtotal|sub\s*total|tax|gst|cgst|sgst|igst|'
        r'hsn|sac|page|bill|invoice|taxable|discount|remark|note)\b',
        re.IGNORECASE
    )
    SKIP_NAME = re.compile(
        r'\b(total|tax|gst|cgst|sgst|igst|subtotal|discount|'
        r'taxable|amount\s*payable|grand|net\s*payable)\b',
        re.IGNORECASE
    )

    if not text or not text.strip():
        return items

    lines = text.split('\n')

    def try_extract(line):
        line = line.strip()
        if not line or SKIP.search(line):
            return None

        # Strategy 1: Name + HSN(4-8 digits) + Qty + Rate + Amount
        m = re.search(
            r'^(?:\d+[\.\)]\s*)?'
            r'([A-Za-z][A-Za-z0-9 /\-.,&()]{1,60}?)'
            r'\s+(\d{4,8})'
            r'\s+(\d+(?:\.\d+)?)'
            r'\s+(\d+(?:\.\d+)?)'
            r'\s+([\d,]+(?:\.\d+)?)',
            line
        )
        if m:
            name = m.group(1).strip()
            hsn  = m.group(2)
            qty  = float(m.group(3))
            rate = float(m.group(4))
            amt  = float(m.group(5).replace(',', ''))
            if len(name) >= 2 and qty > 0 and amt > 0 and not SKIP_NAME.search(name):
                return {"item_name": name[:80], "item_category": "Other",
                        "hsn_code": hsn, "quantity": round(qty, 2),
                        "unit_of_measure": "pcs", "rate": round(rate, 2),
                        "amount": round(amt, 2)}

        # Strategy 2: Name + Qty + Rate + Amount (no HSN)
        m = re.search(
            r'^(?:\d+[\.\)]\s*)?'
            r'([A-Za-z][A-Za-z0-9 /\-.,&()]{1,60}?)'
            r'\s+(\d+(?:\.\d+)?)'
            r'\s+(\d+(?:\.\d+)?)'
            r'\s+([\d,]+(?:\.\d+)?)\s*$',
            line
        )
        if m:
            name = m.group(1).strip()
            qty  = float(m.group(2))
            rate = float(m.group(3))
            amt  = float(m.group(4).replace(',', ''))
            if len(name) >= 2 and qty > 0 and amt > 0 and not SKIP_NAME.search(name):
                if rate == 0 or abs(qty * rate - amt) / max(amt, 1) < 0.35:
                    hsn_m = re.search(r'\b(\d{4,8})\b', line)
                    return {"item_name": name[:80], "item_category": "Other",
                            "hsn_code": hsn_m.group(1) if hsn_m else None,
                            "quantity": round(qty, 2), "unit_of_measure": "pcs",
                            "rate": round(rate, 2), "amount": round(amt, 2)}

        # Strategy 3: looser – any line with >=1 alpha word + 3 numbers
        words = re.findall(r'[A-Za-z][A-Za-z0-9]*', line)
        nums  = re.findall(r'[\d,]+(?:\.\d+)?', line)
        if len(words) >= 1 and len(nums) >= 3:
            try:
                qty  = float(nums[-3].replace(',', ''))
                rate = float(nums[-2].replace(',', ''))
                amt  = float(nums[-1].replace(',', ''))
                name_end = re.search(r'\d', line)
                name = line[:name_end.start()].strip() if name_end else ' '.join(words)
                name = re.sub(r'^\d+[\.\)]\s*', '', name).strip()
                if (len(name) >= 2 and qty > 0 and amt > 0
                        and not SKIP_NAME.search(name)
                        and abs(qty * rate - amt) / max(amt, 1) < 0.35):
                    hsn_m = re.search(r'\b(\d{4,8})\b', line)
                    return {"item_name": name[:80], "item_category": "Other",
                            "hsn_code": hsn_m.group(1) if hsn_m else None,
                            "quantity": round(qty, 2), "unit_of_measure": "pcs",
                            "rate": round(rate, 2), "amount": round(amt, 2)}
            except (ValueError, IndexError, AttributeError):
                pass

        return None

    seen = set()
    for line in lines:
        result = try_extract(line)
        if result:
            key = (result['item_name'].lower(), result['amount'])
            if key not in seen:
                seen.add(key)
                items.append(result)

    return items


# ── Confidence Scoring ─────────────────────────────────────────────────────────

def compute_confidence(field_name, value, full_text):
    """
    Returns a realistic confidence score (0–100) based on:
    - Whether the value was found
    - How well it matches expected pattern
    - Whether OCR text is sufficient
    """
    if not full_text or len(full_text) < 20:
        return 0.0
    
    has_value = value is not None and str(value).strip() != ""
    
    # Base confidence
    base = 65.0 if has_value else 10.0
    boost = 0

    if has_value:
        if field_name == "supplier_name":
            # Boost if looks like a business name
            if re.search(r'\b(pvt|ltd|traders|industries|enterprises|solutions|llp|tradelink)\b', str(value), re.IGNORECASE):
                boost += 25
            elif len(str(value)) > 5:
                boost += 15
        elif field_name == "supplier_gstin":
            # GSTIN has strict 15-char format
            if re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$', str(value).upper()):
                boost += 30
        elif field_name == "invoice_number":
            if re.search(r'[-/]', str(value)) or len(str(value)) > 4:
                boost += 20
        elif field_name == "invoice_date":
            if re.match(r'\d{4}-\d{2}-\d{2}', str(value)):
                boost += 25
        elif field_name == "grand_total":
            if float(value) > 0:
                boost += 25

    return min(round(base + boost, 1), 100.0)


# ── Tesseract Check ────────────────────────────────────────────────────────────

def _check_tesseract_runnable():
    if not TESSERACT_AVAILABLE:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


TESSERACT_RUNNABLE = None


def _extract_rate(text, tax_key):
    """Extract the percentage rate for a given tax type from text.
    e.g. 'CGST @ 9%' → 9.0,  'CGST 18%' → 18.0
    Returns 0.0 if not found.
    """
    m = re.search(rf'{tax_key}\s*[@:]?\s*(\d+(?:\.\d+)?)\s*%', text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return 0.0


# ── Main Pipeline ──────────────────────────────────────────────────────────────

def process_invoice(image_path):
    global TESSERACT_RUNNABLE
    if TESSERACT_RUNNABLE is None:
        TESSERACT_RUNNABLE = _check_tesseract_runnable()
        if not TESSERACT_RUNNABLE:
            print("[Lite] Tesseract binary not found. Using filename-based fallback.")

    full_text = extract_text_from_image(image_path) if TESSERACT_RUNNABLE else ""

    supplier_name   = parse_supplier_name(full_text) if full_text else None
    supplier_gstin  = parse_gstin(full_text) if full_text else None
    address         = parse_address(full_text) if full_text else None
    phone           = parse_phone(full_text) if full_text else None
    invoice_number  = parse_invoice_number(full_text) if full_text else None
    invoice_date    = parse_date(full_text) if full_text else None
    place_of_supply = parse_place_of_supply(full_text) if full_text else None
    payment_terms   = parse_payment_terms(full_text) if full_text else None
    grand_total     = parse_grand_total(full_text) if full_text else None
    subtotal_val    = parse_subtotal(full_text) if full_text else None
    tax             = parse_tax_amounts(full_text) if full_text else {"cgst": 0.0, "sgst": 0.0, "igst": 0.0}
    items           = parse_line_items(full_text) if full_text else []
    category        = classify_category(full_text) if full_text else "Other"

    # Fallback invoice number from filename
    if not invoice_number:
        basename  = os.path.basename(image_path)
        name_part = os.path.splitext(basename)[0]
        if len(name_part) > 33 and name_part[32] == '_':
            name_part = name_part[33:]
        invoice_number = name_part or None

    # ── Compute totals with cross-validation ─────────────────────────────────
    items_total = round(sum(it["amount"] for it in items), 2)
    sub_total   = subtotal_val if (subtotal_val and subtotal_val > 0) else items_total

    cgst = tax["cgst"]
    sgst = tax["sgst"]
    igst = tax["igst"]
    parsed_tax_total = round(cgst + sgst + igst, 2)

    # ── Tax sanity check using grand_total ───────────────────────────────────
    # Tesseract sometimes misreads "1,980" as "71,980" (OCR glitch on digits)
    # Detect this by checking if taxes are unreasonably large vs the invoice total

    if grand_total and grand_total > 0 and sub_total > 0:
        expected_tax = round(grand_total - sub_total, 2)

        # If parsed taxes are more than the difference or bigger than grand_total
        if parsed_tax_total > grand_total or (
                expected_tax > 0 and abs(parsed_tax_total - expected_tax) / max(expected_tax, 1) > 0.20
        ):
            print(f"[Tax Fix] Parsed tax={parsed_tax_total} unreasonable vs "
                  f"expected={expected_tax}. Deriving from grand_total-sub_total.")
            # Try to extract individual rates from OCR text (e.g. "CGST @ 9%")
            cgst_rate = _extract_rate(full_text, "cgst")
            sgst_rate = _extract_rate(full_text, "sgst")
            igst_rate = _extract_rate(full_text, "igst")

            total_rate = cgst_rate + sgst_rate + igst_rate
            if total_rate > 0 and expected_tax > 0:
                # Derive each component proportionally
                cgst = round(expected_tax * cgst_rate / total_rate, 2) if cgst_rate else 0.0
                sgst = round(expected_tax * sgst_rate / total_rate, 2) if sgst_rate else 0.0
                igst = round(expected_tax * igst_rate / total_rate, 2) if igst_rate else 0.0
            else:
                # Equal split between CGST and SGST (most common for Indian domestic)
                half = round(expected_tax / 2, 2)
                cgst = half
                sgst = half
                igst = 0.0

            tax = {"cgst": cgst, "sgst": sgst, "igst": igst}

    tax_total = round(tax["cgst"] + tax["sgst"] + tax["igst"], 2)

    # Final grand_total – compute if not found by parser
    if not grand_total or grand_total <= 0:
        grand_total = round(sub_total + tax_total, 2)


    return {
        "invoice_category": category,
        "supplier": {
            "name":    supplier_name,
            "gstin":   supplier_gstin,
            "address": address,
            "phone":   phone,
        },
        "invoice": {
            "invoice_number":  invoice_number,
            "invoice_date":    invoice_date,
            "place_of_supply": place_of_supply,
            "payment_terms":   payment_terms,
        },
        "items": items,
        "tax":   tax,
        "totals": {
            "sub_total":   sub_total,
            "tax_total":   tax_total,
            "grand_total": grand_total,
        },
        "confidence_scores": {
            "supplier_name":  compute_confidence("supplier_name",  supplier_name,  full_text),
            "supplier_gstin": compute_confidence("supplier_gstin", supplier_gstin, full_text),
            "invoice_number": compute_confidence("invoice_number", invoice_number, full_text),
            "invoice_date":   compute_confidence("invoice_date",   invoice_date,   full_text),
            "grand_total":    compute_confidence("grand_total",    grand_total,    full_text),
        }
    }


def process_batch(image_paths):
    processed = []
    for path in image_paths:
        try:
            result = process_invoice(path)
            processed.append(result)
        except Exception as e:
            print(f"[Lite Inference Error] {path}: {e}")
            import traceback; traceback.print_exc()
            processed.append({
                "invoice_category": "Other",
                "supplier":  {"name": None, "gstin": None, "address": None, "phone": None},
                "invoice":   {"invoice_number": None, "invoice_date": None, "place_of_supply": None, "payment_terms": None},
                "items":     [],
                "tax":       {"cgst": 0, "sgst": 0, "igst": 0},
                "totals":    {"sub_total": 0, "tax_total": 0, "grand_total": 0},
                "confidence_scores": {"supplier_name": 0, "supplier_gstin": 0, "invoice_number": 0, "invoice_date": 0, "grand_total": 0},
                "error": str(e)
            })
    return {"processed_invoices": processed}
