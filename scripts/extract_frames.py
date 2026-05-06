#!/usr/bin/env python3
"""
Video Frame Extraction - Automated Classroom Attendance System
===============================================================
Extracts frames from classroom video footage for attendance processing.
Implements intelligent sampling strategies (uniform, random, or key-frame based).

Usage:
    python extract_frames.py --video classroom.mp4 --strategy uniform --count 5
    python extract_frames.py --video classroom.mp4 --strategy random --count 10 --seed 42
"""

import cv2
import argparse
import numpy as np
from pathlib import Path
from datetime import timedelta
import random


class VideoFrameExtractor:
    """Extract frames from video files with various sampling strategies"""
    
    def __init__(self, video_path):
        """
        Initialize extractor
        
        Args:
            video_path: Path to video file
        """
        self.video_path = Path(video_path)
        if not self.video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")
        
        # Open video
        self.cap = cv2.VideoCapture(str(video_path))
        if not self.cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")
        
        # Get video properties
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.duration_sec = self.total_frames / self.fps if self.fps > 0 else 0
        
        print(f"📹 Video loaded: {self.video_path.name}")
        print(f"   Resolution: {self.width}x{self.height}")
        print(f"   FPS: {self.fps}")
        print(f"   Total Frames: {self.total_frames}")
        print(f"   Duration: {self._format_duration(self.duration_sec)}")
    
    def _format_duration(self, seconds):
        """Format duration as HH:MM:SS"""
        return str(timedelta(seconds=int(seconds)))
    
    def extract_uniform(self, num_frames):
        """
        Extract frames uniformly distributed across video
        
        Args:
            num_frames: Number of frames to extract
            
        Returns:
            list: [(frame_number, timestamp, frame_image), ...]
        """
        if num_frames > self.total_frames:
            num_frames = self.total_frames
            print(f"⚠️  Requested frames exceed total. Extracting all {self.total_frames} frames.")
        
        # Calculate uniform intervals
        interval = self.total_frames // num_frames
        frame_indices = [i * interval for i in range(num_frames)]
        
        print(f"📊 Extracting {num_frames} frames uniformly (interval: {interval})")
        
        return self._extract_frames(frame_indices)
    
    def extract_random(self, num_frames, seed=None):
        """
        Extract random frames from video
        
        Args:
            num_frames: Number of frames to extract
            seed: Random seed for reproducibility
            
        Returns:
            list: [(frame_number, timestamp, frame_image), ...]
        """
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
        
        if num_frames > self.total_frames:
            num_frames = self.total_frames
        
        # Generate random frame indices
        frame_indices = sorted(random.sample(range(self.total_frames), num_frames))
        
        print(f"🎲 Extracting {num_frames} random frames (seed: {seed})")
        
        return self._extract_frames(frame_indices)
    
    def extract_interval(self, start_sec, end_sec, num_frames):
        """
        Extract frames from specific time interval
        
        Args:
            start_sec: Start time in seconds
            end_sec: End time in seconds
            num_frames: Number of frames to extract
            
        Returns:
            list: [(frame_number, timestamp, frame_image), ...]
        """
        start_frame = int(start_sec * self.fps)
        end_frame = int(end_sec * self.fps)
        
        if end_frame > self.total_frames:
            end_frame = self.total_frames
        
        interval_frames = end_frame - start_frame
        step = max(1, interval_frames // num_frames)
        
        frame_indices = [start_frame + i * step for i in range(num_frames)]
        frame_indices = [f for f in frame_indices if f < end_frame]
        
        print(f"⏱️  Extracting {len(frame_indices)} frames from {start_sec}s to {end_sec}s")
        
        return self._extract_frames(frame_indices)
    
    def _extract_frames(self, frame_indices):
        """
        Extract specific frames from video
        
        Args:
            frame_indices: List of frame numbers to extract
            
        Returns:
            list: [(frame_number, timestamp, frame_image), ...]
        """
        extracted = []
        
        for frame_idx in frame_indices:
            # Seek to frame
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = self.cap.read()
            
            if ret:
                timestamp = frame_idx / self.fps
                extracted.append((frame_idx, timestamp, frame))
            else:
                print(f"⚠️  Failed to read frame {frame_idx}")
        
        print(f"✅ Successfully extracted {len(extracted)} frames")
        return extracted
    
    def save_frames(self, frames, output_dir, prefix='frame'):
        """
        Save extracted frames to disk
        
        Args:
            frames: List of (frame_number, timestamp, frame_image)
            output_dir: Directory to save frames
            prefix: Filename prefix
            
        Returns:
            list: Paths to saved frames
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        saved_paths = []
        
        for frame_num, timestamp, frame in frames:
            # Generate filename
            filename = f"{prefix}_{frame_num:06d}_t{timestamp:.2f}s.jpg"
            filepath = output_dir / filename
            
            # Save frame
            cv2.imwrite(str(filepath), frame)
            saved_paths.append(filepath)
        
        print(f"💾 Frames saved to: {output_dir}")
        return saved_paths
    
    def __del__(self):
        """Release video capture"""
        if hasattr(self, 'cap'):
            self.cap.release()


def main():
    parser = argparse.ArgumentParser(
        description='Extract frames from classroom video',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Sampling Strategies:
  uniform  - Extract frames evenly distributed across video
  random   - Extract frames at random positions
  interval - Extract frames from specific time range

Examples:
  # Extract 5 uniform frames
  python extract_frames.py --video class.mp4 --strategy uniform --count 5
  
  # Extract 10 random frames with seed
  python extract_frames.py --video class.mp4 --strategy random --count 10 --seed 42
  
  # Extract 5 frames between 1min and 5min
  python extract_frames.py --video class.mp4 --strategy interval --count 5 --start 60 --end 300
        """
    )
    
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--strategy', choices=['uniform', 'random', 'interval'], 
                        default='uniform', help='Frame sampling strategy')
    parser.add_argument('--count', type=int, default=5, help='Number of frames to extract')
    parser.add_argument('--output_dir', default='data/frame_extracts',
                        help='Output directory for frames')
    parser.add_argument('--prefix', default='frame', help='Filename prefix')
    
    # Random strategy options
    parser.add_argument('--seed', type=int, help='Random seed for reproducibility')
    
    # Interval strategy options
    parser.add_argument('--start', type=float, default=0, help='Start time (seconds)')
    parser.add_argument('--end', type=float, help='End time (seconds)')
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🎬 VIDEO FRAME EXTRACTION")
    print("="*60 + "\n")
    
    try:
        # Initialize extractor
        extractor = VideoFrameExtractor(args.video)
        
        # Extract frames based on strategy
        if args.strategy == 'uniform':
            frames = extractor.extract_uniform(args.count)
        
        elif args.strategy == 'random':
            frames = extractor.extract_random(args.count, args.seed)
        
        elif args.strategy == 'interval':
            end = args.end if args.end else extractor.duration_sec
            frames = extractor.extract_interval(args.start, end, args.count)
        
        # Save frames
        saved_paths = extractor.save_frames(frames, args.output_dir, args.prefix)
        
        print("\n" + "="*60)
        print("📋 EXTRACTION SUMMARY")
        print("="*60)
        print(f"Video:            {args.video}")
        print(f"Strategy:         {args.strategy}")
        print(f"Frames Extracted: {len(frames)}")
        print(f"Output Directory: {args.output_dir}")
        print(f"File Pattern:     {args.prefix}_*.jpg")
        print("="*60 + "\n")
        
        print("🎉 Frame extraction completed successfully!")
        return 0
    
    except Exception as e:
        print(f"\n❌ Extraction failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
