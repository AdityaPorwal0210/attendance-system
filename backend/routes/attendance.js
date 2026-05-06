const express = require('express');
const router = express.Router();
const { AttendanceSession, AttendanceRecord, Student } = require('../models');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Process video for attendance
router.post('/process', async (req, res) => {
  try {
    const { 
      video_path, 
      class_name, 
      date, 
      instructor,
      samples = 5,
      threshold = 0.6
    } = req.body;
    
    if (!video_path || !class_name || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: video_path, class_name, date'
      });
    }
    
    // Generate session ID
    const session_id = `SESSION_${Date.now()}`;
    
    // Create attendance session
    const session = new AttendanceSession({
      session_id,
      video_file: video_path,
      class_name,
      date: new Date(date),
      instructor: instructor || 'Unknown',
      status: 'processing'
    });
    
    await session.save();
    
    // Send immediate response
    res.json({
      success: true,
      message: 'Processing started',
      session_id,
      status: 'processing'
    });
    
    // Process video asynchronously
    processVideoAsync(session_id, video_path, samples, threshold);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Async video processing function
async function processVideoAsync(session_id, video_path, samples, threshold) {
  try {
    const startTime = Date.now();
    
    // Call Python attendance pipeline
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, '../../scripts/attendance_pipeline.py');
    const enrolledDir = path.join(__dirname, '../../data/enrolled_students');
    const outputDir = path.join(__dirname, '../../output/attendance', session_id);
    
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      '--video', video_path,
      '--enrolled_dir', enrolledDir,
      '--samples', samples.toString(),
      '--threshold', threshold.toString(),
      '--output_dir', outputDir
    ]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
      console.log(`[${session_id}]`, data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`[${session_id}]`, data.toString());
    });
    
    pythonProcess.on('close', async (code) => {
      const processingTime = (Date.now() - startTime) / 1000; // seconds
      
      if (code !== 0) {
        await AttendanceSession.findOneAndUpdate(
          { session_id },
          { 
            status: 'failed',
            processing_time: processingTime
          }
        );
        return;
      }
      
      // Read the generated report
      const reportPath = path.join(outputDir, 'attendance_report.json');
      const reportData = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportData);
      
      // Update session with results
      await AttendanceSession.findOneAndUpdate(
        { session_id },
        {
          status: 'completed',
          processing_time: processingTime,
          frames_analyzed: report.metadata.frames_analyzed,
          students_present: report.attendance,
          statistics: report.statistics,
          validation: report.validation
        }
      );
      
      // Create individual attendance records
      for (const student of report.attendance) {
        const record = new AttendanceRecord({
          student_id: student.student_id,
          session_id,
          date: new Date(report.metadata.timestamp),
          status: 'present',
          marked_by: 'system',
          appearances: student.appearances,
          avg_similarity: student.avg_similarity
        });
        
        await record.save();
      }
      
      console.log(`✅ [${session_id}] Processing completed in ${processingTime}s`);
    });
    
  } catch (error) {
    console.error(`❌ [${session_id}] Processing failed:`, error);
    await AttendanceSession.findOneAndUpdate(
      { session_id },
      { status: 'failed' }
    );
  }
}

// Get all attendance sessions
router.get('/sessions', async (req, res) => {
  try {
    const { date, class_name, status } = req.query;
    
    const query = {};
    if (date) query.date = new Date(date);
    if (class_name) query.class_name = class_name;
    if (status) query.status = status;
    
    const sessions = await AttendanceSession.find(query)
      .sort({ date: -1 })
      .limit(50);
    
    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single session
router.get('/sessions/:session_id', async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({ 
      session_id: req.params.session_id 
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get student attendance history
router.get('/student/:student_id', async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ 
      student_id: req.params.student_id 
    })
    .sort({ date: -1 })
    .limit(30);
    
    // Calculate statistics
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? (present / total * 100).toFixed(1) : 0;
    
    res.json({
      success: true,
      student_id: req.params.student_id,
      statistics: {
        total_classes: total,
        present,
        absent,
        percentage: `${percentage}%`
      },
      records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual attendance correction
router.post('/sessions/:session_id/correct', async (req, res) => {
  try {
    const { student_id, status, notes } = req.body;
    
    const session = await AttendanceSession.findOne({ 
      session_id: req.params.session_id 
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Update or create attendance record
    const record = await AttendanceRecord.findOneAndUpdate(
      { 
        student_id,
        session_id: req.params.session_id
      },
      {
        status,
        marked_by: 'manual',
        notes
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      message: 'Attendance corrected',
      data: record
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
