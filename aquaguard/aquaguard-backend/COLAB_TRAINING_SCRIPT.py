# ============================================================
#  AquaGuard — Model Training Script for Google Colab
# ============================================================
#
#  INSTRUCTIONS (follow these EXACTLY):
#
#  1. Open Google Colab:  https://colab.research.google.com
#  2. Click: File → New Notebook
#  3. Click: Runtime → Change runtime type → select "T4 GPU" → Save
#  4. Copy each "CELL" below into a separate cell in Colab
#  5. Run cells one by one (press Shift+Enter or click the Play button)
#
#  TOTAL TIME: ~2-3 hours (most of it is waiting for training)
#
# ============================================================


# ============================================================
# CELL 1: Install the tools we need
# ============================================================
# Copy this into the FIRST cell in Colab and run it

"""
!pip install ultralytics roboflow
"""


# ============================================================
# CELL 2: Get a Roboflow API key
# ============================================================
# Before running Cell 3, you need an API key:
#
# 1. Go to https://roboflow.com and create a FREE account
# 2. After logging in, click your profile icon (top right)
# 3. Click "Settings"
# 4. Find "API Key" section
# 5. Click "Copy" to copy your API key
# 6. Paste it in Cell 3 below where it says YOUR_API_KEY_HERE


# ============================================================
# CELL 3: Download the dataset (2,450 pre-labelled images)
# ============================================================
# Replace YOUR_API_KEY_HERE with your actual Roboflow API key

"""
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_API_KEY_HERE")   # <-- PASTE YOUR KEY HERE
project = rf.workspace("apple4ree").project("yolov8_image_trash")
version = project.version(2)
dataset = version.download("yolov8")

print(f"✅ Dataset downloaded to: {dataset.location}")
"""


# ============================================================
# CELL 4: Check what's in the dataset
# ============================================================

"""
import yaml
import os

# Read the config file
yaml_path = f"{dataset.location}/data.yaml"
with open(yaml_path, 'r') as f:
    data = yaml.safe_load(f)

print("📦 Dataset config:")
print(f"   Classes: {data.get('names', {})}")
print(f"   Train path: {data.get('train', 'N/A')}")
print(f"   Val path: {data.get('val', 'N/A')}")
print(f"   Test path: {data.get('test', 'N/A')}")

# Count images
train_dir = os.path.join(dataset.location, "train", "images")
val_dir = os.path.join(dataset.location, "valid", "images")

if os.path.exists(train_dir):
    train_count = len(os.listdir(train_dir))
    print(f"   Train images: {train_count}")
if os.path.exists(val_dir):
    val_count = len(os.listdir(val_dir))
    print(f"   Validation images: {val_count}")
"""


# ============================================================
# CELL 5: TRAIN THE MODEL (this takes 1-2 hours)
# ============================================================
# This is the main training cell. After you run it, you can
# go do something else and come back when it's done.
# Colab will show progress like: Epoch 1/50, Epoch 2/50, etc.

"""
from ultralytics import YOLO

# Load YOLOv8-nano (the smallest/fastest version — perfect for mobile)
model = YOLO('yolov8n.pt')

# Train the model
results = model.train(
    data=yaml_path,          # Points to our dataset
    epochs=50,               # Train for 50 rounds (enough for demo)
    imgsz=640,               # Image size 640x640 pixels
    batch=16,                # Process 16 images at a time
    optimizer='Adam',        # Optimisation algorithm
    lr0=0.001,               # Learning rate
    patience=15,             # Stop early if not improving for 15 epochs
    device=0,                # Use GPU (much faster than CPU)
    project='aquaguard',     # Save results to this folder
    name='demo_model',       # Name of this training run
    plots=True,              # Generate training graphs
)

print("\\n✅ Training complete!")
print(f"Best model saved at: aquaguard/demo_model/weights/best.pt")
"""


# ============================================================
# CELL 6: Check how good the model is
# ============================================================

"""
from IPython.display import Image, display

# Show training results graph
print("📊 Training Results:")
display(Image(filename='aquaguard/demo_model/results.png', width=800))

# Show confusion matrix (which classes it confuses)
print("\\n📊 Confusion Matrix:")
display(Image(filename='aquaguard/demo_model/confusion_matrix.png', width=600))

# Print accuracy numbers
metrics = model.val()
print(f"\\n📈 Model Performance:")
print(f"   mAP50:     {metrics.box.map50:.4f}  (target: > 0.75)")
print(f"   mAP50-95:  {metrics.box.map:.4f}")
print(f"   Precision:  {metrics.box.mp:.4f}")
print(f"   Recall:     {metrics.box.mr:.4f}")
"""


# ============================================================
# CELL 7: Test the model on some images
# ============================================================

"""
import glob
import random

# Find test images
test_images = glob.glob(f"{dataset.location}/test/images/*.jpg")
if not test_images:
    test_images = glob.glob(f"{dataset.location}/valid/images/*.jpg")

# Pick 5 random images to test
sample = random.sample(test_images, min(5, len(test_images)))

# Run detection
results = model.predict(source=sample, save=True, conf=0.45)

# Show results with bounding boxes drawn
print("🔍 Detection Results:")
for r in results:
    result_path = str(r.save_dir) + "/" + r.path.split("/")[-1]
    if os.path.exists(result_path):
        display(Image(filename=result_path, width=600))
        print(f"   Objects found: {len(r.boxes)}")
        for box in r.boxes:
            cls_name = r.names[int(box.cls[0])]
            conf = float(box.conf[0])
            print(f"   - {cls_name}: {conf:.1%} confidence")
        print()
"""


# ============================================================
# CELL 8: DOWNLOAD THE MODEL FILE (most important step!)
# ============================================================
# This downloads best.pt to your computer.
# You need this file for the backend.

"""
from google.colab import files

model_path = 'aquaguard/demo_model/weights/best.pt'
print(f"📥 Downloading model file: {model_path}")
print(f"   File size: {os.path.getsize(model_path) / 1024 / 1024:.1f} MB")

files.download(model_path)

print("\\n✅ Download started! Check your browser's download folder.")
print("\\n📌 NEXT STEP:")
print("   1. Find 'best.pt' in your Downloads folder")
print("   2. Copy it into your aquaguard-backend/ project folder")
print("   3. Then start the FastAPI server")
"""


# ============================================================
# OPTIONAL CELL 9: Also save to Google Drive (backup)
# ============================================================

"""
from google.colab import drive
import shutil

drive.mount('/content/drive')
shutil.copy('aquaguard/demo_model/weights/best.pt',
            '/content/drive/MyDrive/aquaguard_best.pt')
print("✅ Model also saved to Google Drive as 'aquaguard_best.pt'")
"""
