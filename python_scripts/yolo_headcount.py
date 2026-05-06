#!/usr/bin/env python3
"""
YOLO Headcount Validation - Automated Classroom Attendance System
Counts total people in classroom frame as validation checksum.
Formula: Total Bodies (YOLO) - Recognized Students = Unaccounted Students

Usage:
    python yolo_headcount.py --frame_dir data/frame_extracts
"""

import cv2
import json
import argparse
from pathlib import Path
from datetime import datetime

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


class HeadcountValidator:
    def __init__(self, model_size='yolov8n.pt', confidence=0.5):
        if not YOLO_AVAILABLE:
            raise ImportError("Run: pip install ultralytics")
        self.confidence = confidence
        print(f"Loading YOLO model: {model_size}")
        self.model = YOLO(model_size)
        print("YOLO loaded.")

    def count_people(self, image):
        results = self.model(image, verbose=False)
        detections = []
        for result in results:
            for box in result.boxes:
                if int(box.cls[0]) == 0 and float(box.conf[0]) >= self.confidence:
                    detections.append({
                        'bbox': box.xyxy[0].tolist(),
                        'confidence': float(box.conf[0])
                    })
        return len(detections), detections

    def process_image(self, image_path):
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Cannot load: {image_path}")
        count, detections = self.count_people(img)
        print(f"  {Path(image_path).name}: {count} person(s) detected")
        return {
            'image_path': str(image_path),
            'timestamp': datetime.now().isoformat(),
            'person_count': count,
            'detections': detections
        }

    def validate(self, headcount_result, recognition_result):
        total = headcount_result['person_count']
        recognized = len(recognition_result.get('recognized', []))
        unaccounted = max(0, total - recognized)
        return {
            'total_bodies_yolo': total,
            'recognized_faces': recognized,
            'unaccounted_students': unaccounted
        }

    def visualize(self, image_path, result, output_path):
        img = cv2.imread(str(image_path))
        for i, det in enumerate(result['detections']):
            x1,y1,x2,y2 = [int(v) for v in det['bbox']]
            cv2.rectangle(img, (x1,y1), (x2,y2), (255,0,0), 2)
            cv2.putText(img, f"Person {i+1}", (x1, y1-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,0,0), 2)
        cv2.putText(img, f"Total: {result['person_count']}",
                   (10,30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,0), 3)
        cv2.imwrite(str(output_path), img)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--frame_dir', required=True)
    parser.add_argument('--confidence', type=float, default=0.5)
    parser.add_argument('--model', default='yolov8n.pt')
    parser.add_argument('--output_dir', default='output/headcount')
    parser.add_argument('--save_vis', action='store_true')
    args = parser.parse_args()

    print(f"\n{'='*60}\nYOLO HEADCOUNT VALIDATION\n{'='*60}\n")

    validator = HeadcountValidator(args.model, args.confidence)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    frames = list(Path(args.frame_dir).glob("*.jpg")) + list(Path(args.frame_dir).glob("*.png"))
    print(f"Processing {len(frames)} frame(s)...")

    total_people = 0
    for frame in frames:
        result = validator.process_image(frame)
        total_people += result['person_count']
        with open(out_dir / f"{frame.stem}_headcount.json", 'w') as f:
            json.dump(result, f, indent=2)
        if args.save_vis:
            validator.visualize(frame, result, out_dir / f"{frame.stem}_headcount.jpg")

    avg = total_people / len(frames) if frames else 0
    print(f"\nSUMMARY: Avg occupancy = {avg:.1f} people/frame")


if __name__ == "__main__":
    main()
