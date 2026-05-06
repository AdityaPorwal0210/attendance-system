#!/usr/bin/env python3
"""
Demo Test Script - Automated Classroom Attendance System
=========================================================
Quick test to verify all components are working correctly.

Usage:
    python test_system.py
"""

import sys
from pathlib import Path


def test_imports():
    """Test if all required packages are installed"""
    print("\n" + "="*60)
    print("🧪 TESTING SYSTEM DEPENDENCIES")
    print("="*60 + "\n")
    
    tests = [
        ("OpenCV", "import cv2"),
        ("NumPy", "import numpy"),
        ("SciPy", "from scipy.spatial.distance import cosine"),
        ("InsightFace", "from insightface.app import FaceAnalysis"),
        ("YOLO (Ultralytics)", "from ultralytics import YOLO"),
        ("PIL/Pillow", "from PIL import Image"),
    ]
    
    failed = []
    
    for name, import_stmt in tests:
        try:
            exec(import_stmt)
            print(f"✅ {name:25} OK")
        except ImportError as e:
            print(f"❌ {name:25} FAILED")
            failed.append((name, str(e)))
    
    print()
    
    if failed:
        print("⚠️  Failed imports:")
        for name, error in failed:
            print(f"   {name}: {error}")
        print("\nInstall missing packages with:")
        print("   pip install insightface onnxruntime ultralytics opencv-python scipy")
        return False
    else:
        print("🎉 All dependencies installed correctly!")
        return True


def test_directory_structure():
    """Test if required directories exist"""
    print("\n" + "="*60)
    print("📁 TESTING DIRECTORY STRUCTURE")
    print("="*60 + "\n")
    
    base_dir = Path(__file__).parent.parent
    
    required_dirs = [
        "data/enrollment_photos",
        "data/enrolled_students",
        "data/test_videos",
        "data/frame_extracts",
        "models",
        "output/attendance_reports",
        "scripts",
        "logs"
    ]
    
    missing = []
    
    for dir_path in required_dirs:
        full_path = base_dir / dir_path
        if full_path.exists():
            print(f"✅ {dir_path:30} exists")
        else:
            print(f"❌ {dir_path:30} MISSING")
            missing.append(dir_path)
    
    print()
    
    if missing:
        print("Creating missing directories...")
        for dir_path in missing:
            full_path = base_dir / dir_path
            full_path.mkdir(parents=True, exist_ok=True)
            print(f"   Created: {dir_path}")
        print()
    
    print("🎉 Directory structure verified!")
    return True


def test_model_download():
    """Test if models can be downloaded"""
    print("\n" + "="*60)
    print("🤖 TESTING MODEL DOWNLOAD")
    print("="*60 + "\n")
    
    try:
        print("Testing YOLOv8 download...")
        from ultralytics import YOLO
        model = YOLO('yolov8n.pt')
        print("✅ YOLOv8 model loaded successfully")
        
        print("\nTesting InsightFace download...")
        from insightface.app import FaceAnalysis
        app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        print("✅ InsightFace model downloaded")
        
        print("\n🎉 All models ready!")
        return True
        
    except Exception as e:
        print(f"❌ Model download failed: {e}")
        print("\nThis might be due to:")
        print("   1. Network connectivity issues")
        print("   2. Insufficient disk space")
        print("   3. Missing dependencies")
        return False


def create_sample_test_image():
    """Create a sample test image with text"""
    print("\n" + "="*60)
    print("🎨 CREATING SAMPLE TEST IMAGE")
    print("="*60 + "\n")
    
    try:
        import cv2
        import numpy as np
        
        # Create blank image
        img = np.ones((480, 640, 3), dtype=np.uint8) * 255
        
        # Add text
        text = "Sample Test Image"
        cv2.putText(img, text, (150, 240),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3)
        
        cv2.putText(img, "For enrollment, use a real photo", (100, 300),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (100, 100, 100), 2)
        
        # Save
        output_path = Path(__file__).parent.parent / "data" / "enrollment_photos" / "sample_test.jpg"
        cv2.imwrite(str(output_path), img)
        
        print(f"✅ Sample image created: {output_path}")
        print("   (For actual enrollment, replace with real student photo)")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create sample image: {e}")
        return False


def print_next_steps():
    """Print next steps for user"""
    print("\n" + "="*60)
    print("📝 NEXT STEPS")
    print("="*60 + "\n")
    
    print("1. Add student enrollment photos:")
    print("   Place photos in: data/enrollment_photos/")
    print()
    
    print("2. Enroll students:")
    print("   python scripts/enroll_student.py \\")
    print("     --photo data/enrollment_photos/student.jpg \\")
    print("     --student_id S12345 \\")
    print("     --name \"Student Name\"")
    print()
    
    print("3. Add classroom video:")
    print("   Place video in: data/test_videos/")
    print()
    
    print("4. Run attendance system:")
    print("   python scripts/attendance_pipeline.py \\")
    print("     --video data/test_videos/classroom.mp4 \\")
    print("     --enrolled_dir data/enrolled_students")
    print()
    
    print("5. Check results:")
    print("   Results will be in: output/attendance_reports/")
    print()
    
    print("For detailed usage, see README.md")
    print()


def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("🎓 AUTOMATED CLASSROOM ATTENDANCE SYSTEM - SYSTEM TEST")
    print("="*70)
    
    results = []
    
    # Run tests
    results.append(("Dependencies", test_imports()))
    results.append(("Directory Structure", test_directory_structure()))
    results.append(("Model Download", test_model_download()))
    results.append(("Sample Image", create_sample_test_image()))
    
    # Print summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70 + "\n")
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:25} {status}")
    
    all_passed = all(result[1] for result in results)
    
    print()
    
    if all_passed:
        print("🎉 All tests passed! System is ready.")
        print_next_steps()
        return 0
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    exit(main())
