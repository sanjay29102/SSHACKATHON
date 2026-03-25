





import os
import shutil
import pandas as pd
import glob
from tqdm import tqdm

SOURCE_DIR = r"C:\Users\SANJAY G\OneDrive\Desktop\SSHACK\SSHACKATHON\invoice dataset"
DEST_DIR = r"c:\Users\SANJAY G\OneDrive\Desktop\SSHACK\SSHACKATHON\cnn-service\training\dataset"

CATEGORIES = [
    "Textiles", "Electronics", "Office Supplies", "Machinery",
    "Packaging Materials", "Raw Materials", "Transportation",
    "Services", "Utilities", "Other"
]

KEYWORDS = {
    "Textiles": ["fabric", "cloth", "textile", "yarn", "cotton", "silk", "wool", "saree", "kurta", "garment", "apparel"],
    "Electronics": ["laptop", "computer", "phone", "mobile", "cable", "charger", "battery", "electronic", "monitor", "tech", "led"],
    "Office Supplies": ["paper", "pen", "pencil", "stationery", "printer", "toner", "folder", "envelope", "stapler", "office"],
    "Machinery": ["machine", "motor", "pump", "compressor", "equipment", "tool", "drill", "lathe", "generator"],
    "Packaging Materials": ["box", "carton", "packing", "packaging", "tape", "wrap", "bag", "pouch", "container"],
    "Raw Materials": ["steel", "iron", "aluminium", "copper", "plastic", "rubber", "chemical", "resin", "polymer"],
    "Transportation": ["freight", "transport", "logistics", "courier", "delivery", "shipping", "fuel", "diesel", "petrol"],
    "Services": ["service", "consulting", "maintenance", "repair", "labour", "labor", "manpower", "support", "subscription"],
    "Utilities": ["electricity", "water", "gas", "internet", "telephone", "broadband", "utility", "power", "bill"],
}

def classify(text):
    text_lower = str(text).lower()
    for cat, words in KEYWORDS.items():
        if any(w in text_lower for w in words):
            return cat
    return "Other"

def reorganize():
    # Create target directories
    for cat in CATEGORIES:
        os.makedirs(os.path.join(DEST_DIR, cat), exist_ok=True)

    print("🔍 Searching for CSV files in dataset...")
    csv_files = glob.glob(os.path.join(SOURCE_DIR, "**", "*.csv"), recursive=True)
    
    if not csv_files:
        print("❌ No CSV files found in source directory!")
        return

    print(f"📁 Found {len(csv_files)} CSV shards. Processing...")

    total_copied = 0
    for csv_path in csv_files:
        try:
            df = pd.read_csv(csv_path)
            # Find image directory relative to CSV
            img_dir = os.path.dirname(csv_path)
            
            # Check for batch-specific subfolders if any
            shard_name = os.path.splitext(os.path.basename(csv_path))[0]
            if os.path.isdir(os.path.join(img_dir, shard_name)):
                img_dir = os.path.join(img_dir, shard_name)

            for _, row in df.iterrows():
                file_name = row['File Name']
                text_content = row['OCRed Text']
                
                category = classify(text_content)
                src_path = os.path.join(img_dir, file_name)
                dest_path = os.path.join(DEST_DIR, category, file_name)

                if os.path.exists(src_path):
                    shutil.copy2(src_path, dest_path)
                    total_copied += 1
        except Exception as e:
            print(f"⚠️  Error processing {csv_path}: {e}")

    print(f"\n✅ Reorganization complete!")
    print(f"🚀 {total_copied} images copied into categorized folders.")

if __name__ == "__main__":
    reorganize()
