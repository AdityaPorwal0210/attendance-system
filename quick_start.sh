#!/bin/bash
# Quick Start Installation Script
# Run this on your local machine (macOS/Linux)

echo "🎓 Automated Classroom Attendance System - Quick Setup"
echo "======================================================"
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version
echo ""

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate
echo "✅ Virtual environment created and activated"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip -q
echo "✅ Pip upgraded"
echo ""

# Install dependencies
echo "Installing dependencies (this may take a few minutes)..."
echo ""

pip install opencv-python opencv-contrib-python -q
echo "  ✅ OpenCV installed"

pip install insightface onnxruntime onnx -q
echo "  ✅ InsightFace installed"

pip install ultralytics -q
echo "  ✅ YOLOv8 installed"

pip install numpy scipy pandas -q
echo "  ✅ Scientific libraries installed"

pip install Pillow tqdm -q
echo "  ✅ Additional utilities installed"

echo ""
echo "✅ All dependencies installed!"
echo ""

# Test installation
echo "Testing installation..."
python3 scripts/test_system.py

echo ""
echo "======================================================"
echo "🎉 Setup Complete!"
echo "======================================================"
echo ""
echo "Next steps:"
echo "1. Activate environment: source venv/bin/activate"
echo "2. Read README.md for detailed usage"
echo "3. Start with: python scripts/test_system.py"
echo ""
