#!/usr/bin/env python3
"""
Video Frame Extraction - Automated Classroom Attendance System
Extracts frames from classroom video for attendance processing.

Usage:
    python extract_frames.py --video classroom.mp4 --strategy random --count 5
"""

import cv2
import argparse
import random
from pathlib import Path
from datetime import timedelta


class VideoFrameExtractor:
    def __init__(self, video_path):
        self.video_path = Path(video_path)
        if not self.video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        self.cap = cv2.VideoCapture(str(video_path))
        if not self.cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.duration_sec = self.total_frames / self.fps if self.fps > 0 else 0

        print(f"Video: {self.video_path.name}")
        print(f"Resolution: {self.width}x{self.height} | FPS: {self.fps} | "
              f"Duration: {str(timedelta(seconds=int(self.duration_sec)))}")

    def extract_uniform(self, num_frames):
        interval = max(1, self.total_frames // num_frames)
        indices = [i * interval for i in range(min(num_frames, self.total_frames))]
        print(f"Extracting {len(indices)} uniform frames...")
        return self._get_frames(indices)

    def extract_random(self, num_frames, seed=None):
        if seed is not None:
            random.seed(seed)
        n = min(num_frames, self.total_frames)
        indices = sorted(random.sample(range(self.total_frames), n))
        print(f"Extracting {len(indices)} random frames (seed={seed})...")
        return self._get_frames(indices)

    def _get_frames(self, indices):
        frames = []
        for idx in indices:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = self.cap.read()
            if ret:
                frames.append((idx, idx / self.fps, frame))
        print(f"Successfully extracted {len(frames)} frames")
        return frames

    def save_frames(self, frames, output_dir, prefix='frame'):
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        paths = []
        for num, ts, frame in frames:
            fp = out / f"{prefix}_{num:06d}_t{ts:.2f}s.jpg"
            cv2.imwrite(str(fp), frame)
            paths.append(fp)
        print(f"Saved {len(paths)} frames to: {output_dir}")
        return paths

    def __del__(self):
        if hasattr(self, 'cap'):
            self.cap.release()


def main():
    parser = argparse.ArgumentParser(description='Extract frames from classroom video')
    parser.add_argument('--video', required=True)
    parser.add_argument('--strategy', choices=['uniform', 'random'], default='random')
    parser.add_argument('--count', type=int, default=5)
    parser.add_argument('--output_dir', default='data/frame_extracts')
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    print(f"\n{'='*60}\nVIDEO FRAME EXTRACTION\n{'='*60}\n")

    extractor = VideoFrameExtractor(args.video)

    if args.strategy == 'uniform':
        frames = extractor.extract_uniform(args.count)
    else:
        frames = extractor.extract_random(args.count, args.seed)

    extractor.save_frames(frames, args.output_dir)
    print("\nExtraction completed!")


if __name__ == "__main__":
    main()
