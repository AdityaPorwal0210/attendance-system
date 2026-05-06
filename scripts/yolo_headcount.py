#!/usr/bin/env python3
"""
YOLO Headcount Validation - Automated Classroom Attendance System
=================================================================
Uses YOLOv8 to count total people in classroom as a validation checksum
against facial recognition results.

Formula: Total Bodies (YOLO) - Recognized Students = Unaccounted Students

Usage:
    python yolo_headcount.py --frame classroom.jpg
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
    print("⚠️  Ultralytics not installed. Install with: pip install ultralytics")
    YOLO_AVAILABLE = False


class HeadcountValidator:
    """YOLO-based person detection for classroom headcount"""
    
    def __init__(self, model_size='yolov8n.pt', confidence_threshold=0.5):
        """
        Initialize YOLO model
        
        Args:
            model_size: YOLO model ('yolov8n.pt' for nano, fastest)
            confidence_threshold: Minimum detection confidence
        """
        if not YOLO_AVAILABLE:
            raise ImportError("Ultralytics required. Install: pip install ultralytics")
        
        self.confidence_threshold = confidence_threshold
        
        print(f"🔄 Loading YOLO model: {model_size}")
        self.model = YOLO(model_size)
        print("✅ YOLO model loaded")
    
    def count_people(self, image):
        """
        Count people in image using YOLO
        
        Args:
            image: OpenCV image (BGR)
            
        Returns:
            tuple: (person_count, detections_list)
        """
        # Run inference
        results = self.model(image, verbose=False)
        
        # Extract person detections (class 0 in COCO dataset)
        detections = []
        
        for result in results:
            boxes = result.boxes
            
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                
                # Check if it's a person (class 0) and meets confidence threshold
                if class_id == 0 and confidence >= self.confidence_threshold:
                    bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                    
                    detections.append({
                        'bbox': bbox,
                        'confidence': confidence,
                        'class': 'person'
                    })
        
        return len(detections), detections
    
    def process_image(self, image_path):
        """
        Process single image and count people
        
        Args:
            image_path: Path to image file
            
        Returns:
            dict: Headcount results
        """
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        print(f"\n📸 Processing: {Path(image_path).name}")
        
        # Count people
        person_count, detections = self.count_people(image)
        
        print(f"   👥 Total people detected: {person_count}")
        
        results = {
            'image_path': str(image_path),
            'timestamp': datetime.now().isoformat(),
            'person_count': person_count,
            'detections': detections,
            'model': 'YOLOv8',
            'confidence_threshold': self.confidence_threshold
        }
        
        return results
    
    def visualize_results(self, image_path, results, output_path=None):
        """
        Draw bounding boxes on detected people
        
        Args:
            image_path: Original image path
            results: Detection results dict
            output_path: Where to save visualization
            
        Returns:
            Annotated image
        """
        image = cv2.imread(str(image_path))
        
        # Draw detections
        for i, detection in enumerate(results['detections']):
            x1, y1, x2, y2 = [int(v) for v in detection['bbox']]
            confidence = detection['confidence']
            
            # Draw rectangle
            cv2.rectangle(image, (x1, y1), (x2, y2), (255, 0, 0), 2)
            
            # Draw label
            label = f"Person {i+1} ({confidence:.2f})"
            cv2.putText(image, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
        
        # Add total count
        count_text = f"Total People: {results['person_count']}"
        cv2.putText(image, count_text, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)
        
        if output_path:
            cv2.imwrite(str(output_path), image)
            print(f"💾 Visualization saved: {output_path}")
        
        return image
    
    def validate_attendance(self, headcount_result, recognition_result):
        """
        Cross-validate headcount with facial recognition results
        
        Args:
            headcount_result: YOLO detection results
            recognition_result: Face recognition results
            
        Returns:
            dict: Validation report
        """
        total_bodies = headcount_result['person_count']
        recognized_students = len(recognition_result['recognized'])
        unaccounted = total_bodies - recognized_students
        
        validation = {
            'total_bodies_yolo': total_bodies,
            'recognized_faces': recognized_students,
            'unrecognized_faces': len(recognition_result['unrecognized']),
            'unaccounted_students': unaccounted,
            'validation_status': 'PASS' if unaccounted >= 0 else 'FAIL',
            'note': 'Unaccounted students may be occluded or facing away'
        }
        
        return validation


def main():
    parser = argparse.ArgumentParser(
        description='Count people in classroom using YOLO',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Count people in single frame
  python yolo_headcount.py --frame classroom.jpg
  
  # Process entire directory
  python yolo_headcount.py --frame_dir data/frame_extracts
  
  # Adjust confidence threshold
  python yolo_headcount.py --frame classroom.jpg --confidence 0.6
  
  # Validate against recognition results
  python yolo_headcount.py --frame classroom.jpg --validate recognition_results.json
        """
    )
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--frame', help='Single frame to process')
    group.add_argument('--frame_dir', help='Directory of frames to process')
    
    parser.add_argument('--confidence', type=float, default=0.5,
                        help='Detection confidence threshold (default: 0.5)')
    parser.add_argument('--model', default='yolov8n.pt',
                        help='YOLO model (yolov8n.pt, yolov8s.pt, etc.)')
    parser.add_argument('--output_dir', default='output/headcount_results',
                        help='Output directory for results')
    parser.add_argument('--save_vis', action='store_true',
                        help='Save visualization images')
    parser.add_argument('--validate', help='Face recognition JSON to validate against')
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("👥 YOLO HEADCOUNT VALIDATION")
    print("="*60 + "\n")
    
    try:
        # Initialize validator
        validator = HeadcountValidator(args.model, args.confidence)
        
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
            # Count people
            results = validator.process_image(frame_path)
            all_results.append(results)
            
            # Validate if recognition results provided
            if args.validate:
                recog_path = Path(args.validate)
                if recog_path.exists():
                    with open(recog_path, 'r') as f:
                        recog_results = json.load(f)
                    
                    validation = validator.validate_attendance(results, recog_results)
                    results['validation'] = validation
                    
                    print(f"\n   📊 Validation:")
                    print(f"      Total Bodies (YOLO):    {validation['total_bodies_yolo']}")
                    print(f"      Recognized Faces:       {validation['recognized_faces']}")
                    print(f"      Unaccounted Students:   {validation['unaccounted_students']}")
                    print(f"      Status:                 {validation['validation_status']}")
            
            # Save visualization if requested
            if args.save_vis:
                vis_path = output_dir / f"{frame_path.stem}_headcount.jpg"
                validator.visualize_results(frame_path, results, vis_path)
            
            # Save JSON results
            json_path = output_dir / f"{frame_path.stem}_headcount.json"
            with open(json_path, 'w') as f:
                json.dump(results, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("📋 HEADCOUNT SUMMARY")
        print("="*60)
        
        total_people = sum(r['person_count'] for r in all_results)
        avg_people = total_people / len(all_results) if all_results else 0
        
        print(f"Frames Processed:     {len(frames)}")
        print(f"Total People Counted: {total_people}")
        print(f"Average per Frame:    {avg_people:.1f}")
        print(f"Results Saved:        {output_dir}")
        print("="*60 + "\n")
        
        print("🎉 Headcount validation completed successfully!")
        return 0
    
    except Exception as e:
        print(f"\n❌ Headcount failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
