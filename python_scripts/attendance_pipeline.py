# -*- coding: utf-8 -*-
"""
Complete Attendance Pipeline - Automated Classroom Attendance System
Orchestrates: Frame Extraction -> Face Recognition -> YOLO Validation -> Report

Usage:
    python attendance_pipeline.py --video classroom.mp4 --enrolled_dir data/enrolled_students
"""

import sys
import os

# Fix Windows encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import cv2
import json
import argparse
import random
import numpy as np
from pathlib import Path
from datetime import datetime
from scipy.spatial.distance import cosine

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


class AttendancePipeline:
    def __init__(self, enrolled_dir, threshold=0.6, yolo_confidence=0.5):
        self.threshold = threshold
        self.yolo_confidence = yolo_confidence
        self.enrolled_dir = Path(enrolled_dir)

        if not INSIGHTFACE_AVAILABLE:
            raise ImportError("Run: pip install insightface onnxruntime")
        if not YOLO_AVAILABLE:
            raise ImportError("Run: pip install ultralytics")

        print("[INFO] Loading InsightFace model...")
        self.face_app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']
        )
        self.face_app.prepare(ctx_id=0, det_size=(640, 640))
        print("[INFO] InsightFace loaded.")

        print("[INFO] Loading YOLO model...")
        self.yolo_model = YOLO('yolov8n.pt')
        print("[INFO] YOLO loaded.")

        self.students = self._load_students()
        print(f"[INFO] Loaded {len(self.students)} enrolled students.")
        print("")

    def _load_students(self):
        students = {}
        if not self.enrolled_dir.exists():
            print(f"[WARN] Enrolled dir not found: {self.enrolled_dir}")
            return students

        for f in self.enrolled_dir.glob("*.json"):
            try:
                with open(f, encoding='utf-8') as fp:
                    data = json.load(fp)
                students[data['student_id']] = {
                    'name': data['name'],
                    'embedding': np.array(data['embedding'])
                }
            except Exception as e:
                print(f"[WARN] Could not load {f.name}: {e}")
        return students

    def _extract_frames(self, video_path, num_frames):
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps   = cap.get(cv2.CAP_PROP_FPS)

        if total == 0:
            cap.release()
            raise ValueError("Empty or invalid video file.")

        random.seed(42)
        n       = min(num_frames, total)
        indices = sorted(random.sample(range(total), n))

        frames = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                ts = idx / fps if fps > 0 else 0
                frames.append((idx, ts, frame))

        cap.release()
        print(f"[INFO] Extracted {len(frames)} frames from {Path(video_path).name}")
        return frames

    def _match_face(self, embedding):
        best_id, best_name, best_sim = None, None, 0.0
        for sid, sdata in self.students.items():
            sim = 1 - cosine(embedding, sdata['embedding'])
            if sim > best_sim:
                best_sim  = sim
                best_id   = sid
                best_name = sdata['name']
        if best_sim >= self.threshold:
            return best_id, best_name, best_sim
        return None, None, best_sim

    def _process_frame(self, frame):
        # --- Pipeline A: Face Recognition ---
        faces = self.face_app.get(frame)
        recognized   = []
        unrecognized = []

        for i, face in enumerate(faces):
            sid, name, sim = self._match_face(face.embedding)
            fd = {
                'face_id':    i,
                'bbox':       face.bbox.tolist(),
                'confidence': float(face.det_score),
                'similarity': float(sim)
            }
            if sid:
                fd['student_id'] = sid
                fd['name']       = name
                recognized.append(fd)
            else:
                unrecognized.append(fd)

        # --- Pipeline B: YOLO Headcount ---
        yolo_results = self.yolo_model(frame, verbose=False)
        person_count = sum(
            1 for r in yolo_results
            for box in r.boxes
            if int(box.cls[0]) == 0 and float(box.conf[0]) >= self.yolo_confidence
        )

        return {
            'total_faces':   len(faces),
            'recognized':    recognized,
            'unrecognized':  unrecognized,
            'person_count':  person_count,
            'unaccounted':   max(0, person_count - len(recognized))
        }

    def process(self, video_path, num_samples=5, output_dir='output/attendance'):
        start_time = datetime.now()
        out_dir    = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        print("")
        print("=" * 70)
        print("  AUTOMATED CLASSROOM ATTENDANCE SYSTEM")
        print("=" * 70)
        print("")

        # Step 1: Extract frames
        print("[STEP 1/3] Extracting frames...")
        frames = self._extract_frames(video_path, num_samples)

        # Step 2: Process each frame
        print("")
        print("[STEP 2/3] Running AI pipelines on each frame...")
        frame_results = []

        for i, (frame_num, timestamp, frame) in enumerate(frames):
            print(f"  Frame {i+1}/{len(frames)} (t={timestamp:.1f}s) ...", end=' ')
            result = self._process_frame(frame)
            result.update({'frame_number': frame_num, 'timestamp': timestamp})
            frame_results.append(result)
            print(
                f"Faces={result['total_faces']}  "
                f"Recognized={len(result['recognized'])}  "
                f"People(YOLO)={result['person_count']}  "
                f"Unaccounted={result['unaccounted']}"
            )

        # Step 3: Aggregate attendance
        print("")
        print("[STEP 3/3] Generating attendance report...")
        attendance = {}

        for fr in frame_results:
            for face in fr['recognized']:
                sid = face['student_id']
                if sid not in attendance:
                    attendance[sid] = {
                        'student_id':      sid,
                        'name':            face['name'],
                        'appearances':     0,
                        'total_similarity': 0.0
                    }
                attendance[sid]['appearances']      += 1
                attendance[sid]['total_similarity'] += face['similarity']

        present = []
        for sid, d in attendance.items():
            d['avg_similarity'] = d.pop('total_similarity') / d['appearances']
            d['status']         = 'present'
            present.append(d)

        total_faces      = sum(r['total_faces']           for r in frame_results)
        total_recognized = sum(len(r['recognized'])       for r in frame_results)
        avg_headcount    = sum(r['person_count']          for r in frame_results) / len(frame_results)
        avg_unaccounted  = sum(r['unaccounted']           for r in frame_results) / len(frame_results)

        processing_time  = (datetime.now() - start_time).total_seconds()

        report = {
            'metadata': {
                'video_file':      str(video_path),
                'timestamp':       start_time.isoformat(),
                'frames_analyzed': len(frames),
                'processing_time': processing_time
            },
            'statistics': {
                'total_faces_detected':   total_faces,
                'total_recognized':       total_recognized,
                'total_unrecognized':     total_faces - total_recognized,
                'recognition_rate':       f"{total_recognized / total_faces * 100:.1f}%" if total_faces > 0 else "0%",
                'avg_classroom_occupancy': round(avg_headcount, 1)
            },
            'attendance': present,
            'validation': {
                'avg_unaccounted': round(avg_unaccounted, 1),
                'frames': [
                    {
                        'frame_number': r['frame_number'],
                        'headcount':    r['person_count'],
                        'recognized':   len(r['recognized']),
                        'unaccounted':  r['unaccounted']
                    }
                    for r in frame_results
                ]
            }
        }

        report_path = out_dir / 'attendance_report.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)

        # Print summary
        print("")
        print("=" * 70)
        print("  ATTENDANCE REPORT SUMMARY")
        print("=" * 70)
        print(f"  Video            : {video_path}")
        print(f"  Frames Analyzed  : {len(frames)}")
        print(f"  Students Present : {len(present)}")
        print(f"  Recognition Rate : {report['statistics']['recognition_rate']}")
        print(f"  Avg Occupancy    : {avg_headcount:.1f} people")
        print(f"  Avg Unaccounted  : {avg_unaccounted:.1f} students")
        print(f"  Processing Time  : {processing_time:.1f}s")
        print("")
        print("  PRESENT STUDENTS:")
        print("  " + "-" * 60)
        for i, s in enumerate(present, 1):
            print(
                f"  {i}. {s['name']} ({s['student_id']}) | "
                f"Appearances: {s['appearances']}/{len(frames)} | "
                f"Confidence: {s['avg_similarity']:.3f}"
            )
        print("")
        print(f"  UNACCOUNTED: ~{avg_unaccounted:.1f} student(s) in room but not identified")
        print("=" * 70)
        print(f"[INFO] Report saved: {report_path}")

        return report


def main():
    parser = argparse.ArgumentParser(
        description='Process classroom video for attendance'
    )
    parser.add_argument('--video',        required=True)
    parser.add_argument('--enrolled_dir', default='data/enrolled_students')
    parser.add_argument('--samples',      type=int,   default=5)
    parser.add_argument('--threshold',    type=float, default=0.6)
    parser.add_argument('--yolo_conf',    type=float, default=0.5)
    parser.add_argument('--output_dir',   default='output/attendance')

    args = parser.parse_args()

    try:
        pipeline = AttendancePipeline(
            args.enrolled_dir,
            args.threshold,
            args.yolo_conf
        )
        pipeline.process(args.video, args.samples, args.output_dir)
        print("[SUCCESS] Attendance processing completed!")
        return 0

    except Exception as e:
        print(f"[ERROR] Pipeline failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
