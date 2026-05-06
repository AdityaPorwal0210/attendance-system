#!/usr/bin/env python3
"""
Face Recognition & Matching - Automated Classroom Attendance System
===================================================================
Detects faces in video frames and matches them against enrolled students
using cosine similarity on 512-d embeddings.

Usage:
    python recognize_faces.py --frame classroom_frame.jpg --enrolled_dir data/enrolled_students
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
    print("⚠️  InsightFace not installed. Install with: pip install insightface onnxruntime")
    INSIGHTFACE_AVAILABLE = False


class FaceRecognizer:
    """Face recognition system with enrolled student matching"""
    
    def __init__(self, enrolled_dir, similarity_threshold=0.6, model_name='buffalo_l'):
        """
        Initialize recognizer
        
        Args:
            enrolled_dir: Directory containing enrolled student JSON files
            similarity_threshold: Minimum cosine similarity for match (0.6 is industry standard)
            model_name: InsightFace model name
        """
        if not INSIGHTFACE_AVAILABLE:
            raise ImportError("InsightFace required. Install: pip install insightface")
        
        self.similarity_threshold = similarity_threshold
        self.enrolled_dir = Path(enrolled_dir)
        
        # Load face detection model
        print("🔄 Loading face detection model...")
        self.app = FaceAnalysis(name=model_name, providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        print("✅ Model loaded")
        
        # Load enrolled students
        self.enrolled_students = self._load_enrolled_students()
        print(f"📚 Loaded {len(self.enrolled_students)} enrolled students")
    
    def _load_enrolled_students(self):
        """
        Load all enrolled student embeddings from JSON files
        
        Returns:
            dict: {student_id: {name, embedding, ...}, ...}
        """
        students = {}
        
        if not self.enrolled_dir.exists():
            print(f"⚠️  Enrollment directory not found: {self.enrolled_dir}")
            return students
        
        for json_file in self.enrolled_dir.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                student_id = data['student_id']
                students[student_id] = {
                    'name': data['name'],
                    'embedding': np.array(data['embedding']),
                    'enrollment_date': data.get('enrollment_date'),
                    'photo_path': data.get('photo_path')
                }
                
            except Exception as e:
                print(f"⚠️  Failed to load {json_file.name}: {e}")
        
        return students
    
    def detect_faces(self, image):
        """
        Detect all faces in image
        
        Args:
            image: OpenCV image (BGR)
            
        Returns:
            list: Face objects with embeddings
        """
        faces = self.app.get(image)
        return faces
    
    def match_face(self, face_embedding):
        """
        Match a face embedding against enrolled students
        
        Args:
            face_embedding: 512-d numpy array
            
        Returns:
            tuple: (student_id, name, similarity) or (None, None, 0) if no match
        """
        best_match = None
        best_similarity = 0
        best_student_id = None
        
        for student_id, student_data in self.enrolled_students.items():
            enrolled_embedding = student_data['embedding']
            
            # Calculate cosine similarity
            similarity = 1 - cosine(face_embedding, enrolled_embedding)
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = student_data['name']
                best_student_id = student_id
        
        # Check if best match exceeds threshold
        if best_similarity >= self.similarity_threshold:
            return best_student_id, best_match, best_similarity
        else:
            return None, None, best_similarity
    
    def process_image(self, image_path):
        """
        Detect and recognize all faces in an image
        
        Args:
            image_path: Path to image file
            
        Returns:
            dict: Recognition results
        """
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        print(f"\n📸 Processing: {Path(image_path).name}")
        
        # Detect faces
        faces = self.detect_faces(image)
        print(f"   Detected {len(faces)} face(s)")
        
        results = {
            'image_path': str(image_path),
            'timestamp': datetime.now().isoformat(),
            'total_faces': len(faces),
            'recognized': [],
            'unrecognized': []
        }
        
        # Match each face
        for i, face in enumerate(faces):
            embedding = face.embedding
            bbox = face.bbox.tolist()
            confidence = float(face.det_score)
            
            # Match against enrolled students
            student_id, name, similarity = self.match_face(embedding)
            
            face_data = {
                'face_id': i,
                'bbox': bbox,
                'detection_confidence': confidence,
                'similarity': float(similarity)
            }
            
            if student_id:
                face_data['student_id'] = student_id
                face_data['name'] = name
                results['recognized'].append(face_data)
                print(f"   ✅ Face {i}: {name} ({student_id}) - Similarity: {similarity:.3f}")
            else:
                results['unrecognized'].append(face_data)
                print(f"   ❌ Face {i}: Unknown - Best similarity: {similarity:.3f}")
        
        return results
    
    def visualize_results(self, image_path, results, output_path=None):
        """
        Draw bounding boxes and labels on image
        
        Args:
            image_path: Original image path
            results: Recognition results dict
            output_path: Where to save visualization
            
        Returns:
            Annotated image
        """
        image = cv2.imread(str(image_path))
        
        # Draw recognized faces (green)
        for face in results['recognized']:
            x1, y1, x2, y2 = [int(v) for v in face['bbox']]
            label = f"{face['name']} ({face['similarity']:.2f})"
            
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(image, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Draw unrecognized faces (red)
        for face in results['unrecognized']:
            x1, y1, x2, y2 = [int(v) for v in face['bbox']]
            label = f"Unknown ({face['similarity']:.2f})"
            
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(image, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        
        # Add summary
        summary = f"Recognized: {len(results['recognized'])} | Unknown: {len(results['unrecognized'])}"
        cv2.putText(image, summary, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        if output_path:
            cv2.imwrite(str(output_path), image)
            print(f"💾 Visualization saved: {output_path}")
        
        return image


def main():
    parser = argparse.ArgumentParser(
        description='Recognize faces in classroom images',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process single frame
  python recognize_faces.py --frame classroom.jpg --enrolled_dir data/enrolled_students
  
  # Process all frames in directory
  python recognize_faces.py --frame_dir data/frame_extracts --enrolled_dir data/enrolled_students
  
  # Adjust similarity threshold
  python recognize_faces.py --frame classroom.jpg --enrolled_dir data/enrolled_students --threshold 0.7
        """
    )
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--frame', help='Single frame to process')
    group.add_argument('--frame_dir', help='Directory of frames to process')
    
    parser.add_argument('--enrolled_dir', required=True, 
                        help='Directory containing enrolled student JSON files')
    parser.add_argument('--threshold', type=float, default=0.6,
                        help='Similarity threshold for match (default: 0.6)')
    parser.add_argument('--output_dir', default='output/recognition_results',
                        help='Output directory for results')
    parser.add_argument('--save_vis', action='store_true',
                        help='Save visualization images')
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("👤 FACE RECOGNITION SYSTEM")
    print("="*60 + "\n")
    
    try:
        # Initialize recognizer
        recognizer = FaceRecognizer(args.enrolled_dir, args.threshold)
        
        # Create output directory
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Process frames
        if args.frame:
            frames = [Path(args.frame)]
        else:
            frame_dir = Path(args.frame_dir)
            frames = list(frame_dir.glob("*.jpg")) + list(frame_dir.glob("*.png"))
        
        print(f"📊 Processing {len(frames)} frame(s)...\n")
        
        all_results = []
        
        for frame_path in frames:
            # Recognize faces
            results = recognizer.process_image(frame_path)
            all_results.append(results)
            
            # Save visualization if requested
            if args.save_vis:
                vis_path = output_dir / f"{frame_path.stem}_recognized.jpg"
                recognizer.visualize_results(frame_path, results, vis_path)
            
            # Save JSON results
            json_path = output_dir / f"{frame_path.stem}_results.json"
            with open(json_path, 'w') as f:
                json.dump(results, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("📋 RECOGNITION SUMMARY")
        print("="*60)
        
        total_faces = sum(r['total_faces'] for r in all_results)
        total_recognized = sum(len(r['recognized']) for r in all_results)
        total_unrecognized = sum(len(r['unrecognized']) for r in all_results)
        
        print(f"Frames Processed:     {len(frames)}")
        print(f"Total Faces Detected: {total_faces}")
        print(f"Recognized:           {total_recognized} ({total_recognized/total_faces*100:.1f}%)" if total_faces > 0 else "Recognized: 0")
        print(f"Unrecognized:         {total_unrecognized}")
        print(f"Results Saved:        {output_dir}")
        print("="*60 + "\n")
        
        print("🎉 Recognition completed successfully!")
        return 0
    
    except Exception as e:
        print(f"\n❌ Recognition failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
