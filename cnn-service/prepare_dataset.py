"""
prepare_dataset.py
Downloads and prepares the SROIE 2019 receipt dataset for training.
Also generates synthetic invoice images for better variety.

Run this ONCE before training:
    python prepare_dataset.py
"""

import os
import sys
import shutil
import json
import random
import urllib.request
import zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DATASET_DIR = os.path.join("training", "dataset")
CATEGORIES = [
    "Textiles", "Electronics", "Office Supplies", "Machinery",
    "Packaging Materials", "Raw Materials", "Transportation",
    "Services", "Utilities", "Other"
]


def create_dirs():
    """Create category subdirectories"""
    for cat in CATEGORIES:
        os.makedirs(os.path.join(DATASET_DIR, cat), exist_ok=True)
    print(f"✅ Created dataset directories under {DATASET_DIR}/")


def generate_synthetic_invoices(num_per_class=50):
    """
    Generate synthetic invoice images with category labels.
    Used when real data is limited.
    """
    print(f"\n🎨 Generating {num_per_class} synthetic invoices per category...")

    # Category-specific keywords for variation
    category_items = {
        "Textiles":           ["Cotton Fabric", "Silk Saree", "Polyester Thread", "Woolen Yarn"],
        "Electronics":        ["LED TV", "Laptop", "Mobile Phone", "HDMI Cable", "Wireless Mouse"],
        "Office Supplies":    ["A4 Paper", "Stapler", "Ball Pen", "File Folder", "Whiteboard Marker"],
        "Machinery":          ["Electric Motor", "Hydraulic Pump", "Gear Box", "Compressor"],
        "Packaging Materials":["Cardboard Box", "Bubble Wrap", "Stretch Film", "Packing Tape"],
        "Raw Materials":      ["Steel Rod", "Aluminium Sheet", "Copper Wire", "PVC Pipe"],
        "Transportation":     ["Freight Charges", "Courier Service", "Vehicle Hire", "Fuel Expense"],
        "Services":           ["Consulting Fee", "IT Support", "Security Service", "Maintenance"],
        "Utilities":          ["Electricity Bill", "Water Charges", "Internet Service", "Gas Supply"],
        "Other":              ["Miscellaneous", "General Purchase", "Office Expense", "Purchase"],
    }

    company_names = [
        "ABC Trading Co.", "XYZ Industries Ltd.", "Sharma & Sons",
        "Global Enterprises", "Tech Solutions Pvt Ltd", "National Traders",
        "Rajesh Enterprises", "Sunrise Corporation", "Pioneer Industries",
        "Modern Supplies", "Bharat Commercial Co.", "Future Tech Ltd",
    ]

    for category, items in category_items.items():
        save_dir = os.path.join(DATASET_DIR, category)
        for i in range(num_per_class):
            img = _create_synthetic_invoice(
                category=category,
                company=random.choice(company_names),
                items=random.sample(items, k=random.randint(1, min(3, len(items)))),
                index=i
            )
            img.save(os.path.join(save_dir, f"synthetic_{i:04d}.png"))
        print(f"   ✅ {category}: {num_per_class} images")

    print(f"\n✅ Synthetic dataset generated!")


def _create_synthetic_invoice(category, company, items, index):
    """Draw a realistic-looking synthetic invoice"""
    width, height = 794, 1123   # A4 at 96dpi
    bg_color = random.choice([(255,255,255), (252,252,248), (250,248,245)])
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Try to use a system font, fall back to default
    try:
        font_bold  = ImageFont.truetype("arial.ttf", 22)
        font_reg   = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 13)
    except:
        font_bold = font_reg = font_small = ImageFont.load_default()

    # Header bar
    draw.rectangle([0, 0, width, 80], fill=(30, 60, 120))
    draw.text((40, 20), company.upper(), fill="white", font=font_bold)
    draw.text((40, 48), f"Category: {category}", fill=(200,220,255), font=font_small)

    # Invoice metadata
    y = 100
    inv_no = f"INV-{random.randint(1000,9999)}-{random.randint(10,99)}"
    inv_date = f"{random.randint(1,28):02d}/{random.randint(1,12):02d}/2024"
    gstin = _random_gstin()

    draw.text((40, y),  f"Invoice No : {inv_no}",   fill="black", font=font_reg)
    draw.text((40, y+25), f"Date       : {inv_date}", fill="black", font=font_reg)
    draw.text((40, y+50), f"GSTIN      : {gstin}",   fill="black", font=font_reg)

    # Phone
    phone = f"98{random.randint(10000000,99999999)}"
    draw.text((400, y),  f"Phone: {phone}", fill="black", font=font_small)
    draw.text((400, y+25), f"Email: info@{company.split()[0].lower()}.com", fill="black", font=font_small)

    # Divider
    y = 200
    draw.line([40, y, width-40, y], fill=(180,180,180), width=1)

    # Items table header
    y += 15
    draw.rectangle([40, y, width-40, y+25], fill=(220,230,245))
    draw.text((50,  y+5), "Item",   fill="black", font=font_small)
    draw.text((400, y+5), "Qty",    fill="black", font=font_small)
    draw.text((480, y+5), "Rate",   fill="black", font=font_small)
    draw.text((580, y+5), "Amount", fill="black", font=font_small)

    # Item rows
    y += 30
    subtotal = 0
    for item in items:
        qty    = random.randint(1, 20)
        rate   = round(random.uniform(50, 5000), 2)
        amount = round(qty * rate, 2)
        subtotal += amount
        draw.text((50,  y), item,            fill=(40,40,40), font=font_small)
        draw.text((400, y), str(qty),        fill=(40,40,40), font=font_small)
        draw.text((480, y), f"₹{rate:,.2f}", fill=(40,40,40), font=font_small)
        draw.text((565, y), f"₹{amount:,.2f}", fill=(40,40,40), font=font_small)
        y += 25

    # Totals
    y += 10
    draw.line([40, y, width-40, y], fill=(180,180,180), width=1)
    cgst  = round(subtotal * 0.09, 2)
    sgst  = round(subtotal * 0.09, 2)
    tax   = cgst + sgst
    grand = round(subtotal + tax, 2)
    y += 10

    draw.text((400, y),   f"Sub Total : ₹{subtotal:,.2f}", fill="black", font=font_reg)
    draw.text((400, y+25),f"CGST (9%) : ₹{cgst:,.2f}",    fill="black", font=font_small)
    draw.text((400, y+45),f"SGST (9%) : ₹{sgst:,.2f}",    fill="black", font=font_small)

    # Grand total box
    draw.rectangle([380, y+70, width-40, y+100], fill=(30, 60, 120))
    draw.text((390, y+77), f"Grand Total: ₹{grand:,.2f}", fill="white", font=font_bold)

    # Light noise for realism
    img_array = np.array(img)
    noise = np.random.randint(-8, 8, img_array.shape, dtype=np.int16)
    img_array = np.clip(img_array.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return Image.fromarray(img_array)


def _random_gstin():
    import string
    state = str(random.randint(1, 35)).zfill(2)
    pan   = ''.join(random.choices(string.ascii_uppercase, k=5))
    nums  = ''.join(random.choices(string.digits, k=4))
    return f"{state}{pan}{nums}1Z{random.randint(0,9)}"


if __name__ == "__main__":
    print("=" * 60)
    print("  Invoice Dataset Preparation")
    print("=" * 60)
    create_dirs()
    generate_synthetic_invoices(num_per_class=60)
    print("\n📁 Dataset ready at:", DATASET_DIR)
    print("\nNext step → Run: python train.py")
