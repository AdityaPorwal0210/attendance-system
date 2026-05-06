# -*- coding: utf-8 -*-
"""
Enrollment Script - Automated Classroom Attendance System
Detects face in photo and saves 512-d ArcFace embedding to JSON.

Usage:
    python enroll_student.py --photo photo.jpg --student_id S001 --name "John Doe"
"""

import sys
import os

# Fix Windows encoding issue - force UTF-8 output
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import cv2
import json
import numpy as np
import argparse
from datetime import datetime
from pathlib import Path

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False


class StudentEnrollment:
    def __init__(self, det_size=(640, 640)):
        if not INSIGHTFACE_AVAILABLE:
            raise ImportError("Run: pip install insightface onnxruntime")
        print("[INFO] Loading InsightFace model...")
        self.app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']
        )
        self.app.prepare(ctx_id=0, det_size=det_size)
        print("[INFO] Model loaded successfully.")

    def extract_embedding(self, image_path):
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Cannot load image: {image_path}")

        print(f"[INFO] Image loaded: {img.shape}")

        faces = self.app.get(img)
        if len(faces) == 0:
            raise ValueError(
                "No face detected. Please use a clear, well-lit, front-facing photo."
            )

        if len(faces) > 1:
            print(f"[WARN] Multiple faces detected ({len(faces)}). Using largest face.")

        # Pick the largest face
        face = max(
            faces,
            key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1])
        )

        embedding = face.embedding
        bbox = face.bbox.tolist()
        confidence = float(face.det_score)

        print(f"[INFO] Face detected. Confidence: {confidence:.4f}")
        print(f"[INFO] Embedding shape: {embedding.shape}")

        return embedding, bbox, confidence

    def save_visualization(self, image_path, bbox, output_path):
        img = cv2.imread(str(image_path))
        x1, y1, x2, y2 = [int(v) for v in bbox]
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            img, "Enrolled Face",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9, (0, 255, 0), 2
        )
        cv2.imwrite(str(output_path), img)
        print(f"[INFO] Verification image saved: {output_path}")


def enroll_student(photo_path, student_id, name, output_dir='data/enrolled_students'):
    print("")
    print("=" * 60)
    print("  STUDENT ENROLLMENT SYSTEM")
    print("=" * 60)
    print("")

    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Initialize model
    enrollment = StudentEnrollment()

    print(f"[INFO] Enrolling: {name} (ID: {student_id})")

    # Extract face embedding
    embedding, bbox, confidence = enrollment.extract_embedding(photo_path)

    # Build data object
    data = {
        "student_id": student_id,
        "name": name,
        "embedding": embedding.tolist(),
        "enrollment_date": datetime.now().isoformat(),
        "photo_path": str(photo_path),
        "bbox": bbox,
        "confidence": confidence,
        "embedding_model": "InsightFace-ArcFace",
        "embedding_dim": int(len(embedding))
    }

    # Save JSON
    out_file = Path(output_dir) / f"{student_id}.json"
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print(f"[INFO] Enrollment data saved: {out_file}")

    # Save visualization
    vis_path = Path(output_dir) / f"{student_id}_verification.jpg"
    enrollment.save_visualization(photo_path, bbox, str(vis_path))

    print("")
    print("=" * 60)
    print("  ENROLLMENT SUMMARY")
    print("=" * 60)
    print(f"  Student ID  : {student_id}")
    print(f"  Name        : {name}")
    print(f"  Confidence  : {confidence:.4f}")
    print(f"  Embedding   : {len(embedding)}-dimensional vector")
    print(f"  Saved to    : {out_file}")
    print(f"  Verification: {vis_path}")
    print("=" * 60)
    print("")

    return data


def main():
    parser = argparse.ArgumentParser(
        description='Enroll a student in the attendance system'
    )
    parser.add_argument('--photo',       required=True,  help='Path to student photo')
    parser.add_argument('--student_id',  required=True,  help='Unique student ID')
    parser.add_argument('--name',        required=True,  help='Student full name')
    parser.add_argument('--output_dir',  default='data/enrolled_students',
                        help='Directory to save enrollment data')

    args = parser.parse_args()

    # Validate photo path
    if not os.path.exists(args.photo):
        print(f"[ERROR] Photo not found: {args.photo}")
        return 1

    try:
        enroll_student(
            args.photo,
            args.student_id,
            args.name,
            args.output_dir
        )
        print("[SUCCESS] Enrollment completed successfully!")
        return 0

    except Exception as e:
        print(f"[ERROR] Enrollment failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
