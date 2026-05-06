#!/usr/bin/env python3
"""
Face Recognition - Automated Classroom Attendance System
Detects faces in frames and matches against enrolled students using Cosine Similarity.

Usage:
    python recognize_faces.py --frame_dir data/frame_extracts --enrolled_dir data/enrolled_students
"""

import cv2
import json
import numpy as np
import argparse
from pathlib import Path
from scipy.spatial.distance import cosine
from datetime import datetime

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False


class FaceRecognizer:
    def __init__(self, enrolled_dir, threshold=0.6):
        if not INSIGHTFACE_AVAILABLE:
            raise ImportError("Run: pip install insightface onnxruntime")

        self.threshold = threshold
        print("Loading face recognition model...")
        self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=(640, 640))

        self.students = self._load_students(enrolled_dir)
        print(f"Loaded {len(self.students)} enrolled students")

    def _load_students(self, enrolled_dir):
        students = {}
        for f in Path(enrolled_dir).glob("*.json"):
            try:
                with open(f) as fp:
                    data = json.load(fp)
                students[data['student_id']] = {
                    'name': data['name'],
                    'embedding': np.array(data['embedding'])
                }
            except Exception as e:
                print(f"Warning: Could not load {f.name}: {e}")
        return students

    def match_face(self, embedding):
        best_id, best_name, best_sim = None, None, 0
        for sid, sdata in self.students.items():
            sim = 1 - cosine(embedding, sdata['embedding'])
            if sim > best_sim:
                best_sim, best_id, best_name = sim, sid, sdata['name']
        if best_sim >= self.threshold:
            return best_id, best_name, best_sim
        return None, None, best_sim

    def process_image(self, image_path):
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Cannot load: {image_path}")

        faces = self.app.get(img)
        print(f"  {Path(image_path).name}: {len(faces)} face(s) detected")

        result = {
            'image_path': str(image_path),
            'timestamp': datetime.now().isoformat(),
            'total_faces': len(faces),
            'recognized': [],
            'unrecognized': []
        }

        for i, face in enumerate(faces):
            sid, name, sim = self.match_face(face.embedding)
            fd = {
                'face_id': i,
                'bbox': face.bbox.tolist(),
                'confidence': float(face.det_score),
                'similarity': float(sim)
            }
            if sid:
                fd.update({'student_id': sid, 'name': name})
                result['recognized'].append(fd)
                print(f"    MATCH: {name} ({sid}) sim={sim:.3f}")
            else:
                result['unrecognized'].append(fd)
                print(f"    NO MATCH - best sim={sim:.3f}")

        return result

    def visualize(self, image_path, result, output_path):
        img = cv2.imread(str(image_path))
        for face in result['recognized']:
            x1,y1,x2,y2 = [int(v) for v in face['bbox']]
            cv2.rectangle(img, (x1,y1), (x2,y2), (0,255,0), 2)
            cv2.putText(img, f"{face['name']} ({face['similarity']:.2f})",
                       (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)
        for face in result['unrecognized']:
            x1,y1,x2,y2 = [int(v) for v in face['bbox']]
            cv2.rectangle(img, (x1,y1), (x2,y2), (0,0,255), 2)
            cv2.putText(img, f"Unknown ({face['similarity']:.2f})",
                       (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)
        cv2.putText(img, f"Recognized:{len(result['recognized'])} Unknown:{len(result['unrecognized'])}",
                   (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
        cv2.imwrite(str(output_path), img)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--frame_dir', required=True)
    parser.add_argument('--enrolled_dir', default='data/enrolled_students')
    parser.add_argument('--threshold', type=float, default=0.6)
    parser.add_argument('--output_dir', default='output/recognition')
    parser.add_argument('--save_vis', action='store_true')
    args = parser.parse_args()

    print(f"\n{'='*60}\nFACE RECOGNITION\n{'='*60}\n")

    recognizer = FaceRecognizer(args.enrolled_dir, args.threshold)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    frames = list(Path(args.frame_dir).glob("*.jpg")) + list(Path(args.frame_dir).glob("*.png"))
    print(f"\nProcessing {len(frames)} frame(s)...")

    all_results = []
    for frame in frames:
        result = recognizer.process_image(frame)
        all_results.append(result)
        with open(out_dir / f"{frame.stem}_results.json", 'w') as f:
            json.dump(result, f, indent=2)
        if args.save_vis:
            recognizer.visualize(frame, result, out_dir / f"{frame.stem}_vis.jpg")

    total_faces = sum(r['total_faces'] for r in all_results)
    total_recognized = sum(len(r['recognized']) for r in all_results)
    print(f"\nSUMMARY: {total_recognized}/{total_faces} faces recognized")
    return 0


if __name__ == "__main__":
    main()
