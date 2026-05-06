const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Ensure upload directories exist
const dirs = [
  path.join(__dirname, '..', '..', 'data', 'enrollment_photos'),
  path.join(__dirname, '..', '..', 'data', 'test_videos')
];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// Photo storage
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'data', 'enrollment_photos')),
  filename:    (req, file, cb) => cb(null, `photo-${Date.now()}${path.extname(file.originalname)}`)
});

// Video storage
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'data', 'test_videos')),
  filename:    (req, file, cb) => cb(null, `video-${Date.now()}${path.extname(file.originalname)}`)
});

// File filters
const photoFilter = (req, file, cb) => {
  /jpeg|jpg|png/.test(path.extname(file.originalname).toLowerCase())
    ? cb(null, true)
    : cb(new Error('Only JPG and PNG images allowed'));
};

const videoFilter = (req, file, cb) => {
  /mp4|avi|mov|mkv|webm/.test(path.extname(file.originalname).toLowerCase())
    ? cb(null, true)
    : cb(new Error('Only video files allowed (mp4, avi, mov, mkv, webm)'));
};

const uploadPhoto = multer({ storage: photoStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: photoFilter }).single('photo');
const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 500 * 1024 * 1024 }, fileFilter: videoFilter }).single('video');

// POST /api/upload/photo
router.post('/photo', (req, res) => {
  uploadPhoto(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        filename: req.file.filename,
        path:     req.file.path,
        size:     req.file.size
      }
    });
  });
});

// POST /api/upload/video
router.post('/video', (req, res) => {
  uploadVideo(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        filename: req.file.filename,
        path:     req.file.path,
        size:     req.file.size
      }
    });
  });
});

// GET /api/upload/info
router.get('/info', (req, res) => {
  res.json({
    success: true,
    limits: {
      photo: { max_size: '10MB', types: ['jpg', 'jpeg', 'png'] },
      video: { max_size: '500MB', types: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }
    }
  });
});

module.exports = router;
