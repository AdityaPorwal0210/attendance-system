const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs').promises;
const { spawn } = require('child_process');

const { AttendanceSession, AttendanceRecord } = require(path.join(__dirname, '..', 'models', 'index.js'));

// ── POST /api/attendance/process ──────────────────────────────────────────────
router.post('/process', async (req, res) => {
  try {
    const { video_path, class_name, date, instructor, samples = 5, threshold = 0.6 } = req.body;

    if (!video_path || !class_name || !date) {
      return res.status(400).json({ success: false, error: 'video_path, class_name and date are required' });
    }

    const session_id = `SESSION_${Date.now()}`;

    const session = new AttendanceSession({
      session_id,
      video_file:  video_path,
      class_name,
      date:        new Date(date),
      instructor:  instructor || 'Not specified',
      status:      'processing'
    });

    await session.save();

    res.json({ success: true, message: 'Processing started', session_id, status: 'processing' });

    processVideoAsync(session_id, video_path, samples, threshold);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Background video processing ───────────────────────────────────────────────
async function processVideoAsync(session_id, video_path, samples, threshold) {
  const startTime = Date.now();
  try {
    const pythonPath  = process.env.PYTHON_PATH || 'python3';
    const scriptPath  = path.join(__dirname, '..', '..', 'python_scripts', 'attendance_pipeline.py');
    const enrolledDir = path.join(__dirname, '..', '..', 'data', 'enrolled_students');
    const outputDir   = path.join(__dirname, '..', '..', 'output', 'attendance', session_id);

    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      '--video',        video_path,
      '--enrolled_dir', enrolledDir,
      '--samples',      samples.toString(),
      '--threshold',    threshold.toString(),
      '--output_dir',   outputDir
    ]);

    let outputData = '';
    let errorData  = '';

    pythonProcess.stdout.on('data', d => { outputData += d.toString(); console.log(`[${session_id}]`, d.toString()); });
    pythonProcess.stderr.on('data', d => { errorData  += d.toString(); console.error(`[${session_id}]`, d.toString()); });

    pythonProcess.on('close', async (code) => {
      const processingTime = (Date.now() - startTime) / 1000;

      if (code !== 0) {
        await AttendanceSession.findOneAndUpdate(
          { session_id },
          { status: 'failed', processing_time: processingTime }
        );
        return;
      }

      try {
        const reportPath = path.join(outputDir, 'attendance_report.json');
        const reportRaw  = await fs.readFile(reportPath, 'utf8');
        const report     = JSON.parse(reportRaw);

        await AttendanceSession.findOneAndUpdate(
          { session_id },
          {
            status:           'completed',
            processing_time:  processingTime,
            frames_analyzed:  report.metadata.frames_analyzed,
            students_present: report.attendance,
            statistics:       report.statistics,
            validation:       report.validation
          }
        );

        for (const student of report.attendance) {
          await AttendanceRecord.findOneAndUpdate(
            { student_id: student.student_id, session_id },
            {
              student_id:     student.student_id,
              session_id,
              date:           new Date(report.metadata.timestamp),
              status:         'present',
              marked_by:      'system',
              appearances:    student.appearances,
              avg_similarity: student.avg_similarity
            },
            { upsert: true, new: true }
          );
        }

        console.log(`[INFO] Session ${session_id} completed in ${processingTime}s`);

      } catch (parseErr) {
        console.error(`[ERROR] Failed to parse report: ${parseErr.message}`);
        await AttendanceSession.findOneAndUpdate({ session_id }, { status: 'failed' });
      }
    });

  } catch (error) {
    console.error(`[ERROR] processVideoAsync failed: ${error.message}`);
    await AttendanceSession.findOneAndUpdate({ session_id }, { status: 'failed' });
  }
}

// ── GET /api/attendance/sessions ──────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const { class_name, status } = req.query;
    const query = {};
    if (class_name) query.class_name = class_name;
    if (status)     query.status     = status;

    const sessions = await AttendanceSession.find(query).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/attendance/sessions/:session_id ──────────────────────────────────
router.get('/sessions/:session_id', async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({ session_id: req.params.session_id });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/attendance/student/:student_id ───────────────────────────────────
router.get('/student/:student_id', async (req, res) => {
  try {
    const records = await AttendanceRecord
      .find({ student_id: req.params.student_id })
      .sort({ date: -1 })
      .limit(30);

    const total   = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent  = records.filter(r => r.status === 'absent').length;

    res.json({
      success: true,
      student_id: req.params.student_id,
      statistics: {
        total_classes: total,
        present,
        absent,
        percentage: total > 0 ? `${(present / total * 100).toFixed(1)}%` : '0%'
      },
      records
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/attendance/sessions/:session_id/correct ─────────────────────────
// This is the KEY fix: updates BOTH AttendanceRecord AND AttendanceSession.students_present
router.post('/sessions/:session_id/correct', async (req, res) => {
  try {
    const { student_id, status, notes, name } = req.body;
    const { session_id } = req.params;

    if (!student_id || !status) {
      return res.status(400).json({ success: false, error: 'student_id and status are required' });
    }

    // 1. Update or create AttendanceRecord
    await AttendanceRecord.findOneAndUpdate(
      { student_id, session_id },
      {
        student_id,
        session_id,
        date:      new Date(),
        status,
        marked_by: 'manual',
        notes:     notes || 'Manually updated by teacher'
      },
      { upsert: true, new: true }
    );

    // 2. If marking PRESENT → add to session's students_present array (if not already there)
    if (status === 'present') {
      const session = await AttendanceSession.findOne({ session_id });

      if (session) {
        const alreadyPresent = session.students_present.some(s => s.student_id === student_id);

        if (!alreadyPresent) {
          // Add student to students_present array
          await AttendanceSession.findOneAndUpdate(
            { session_id },
            {
              $push: {
                students_present: {
                  student_id,
                  name:           name || student_id,
                  appearances:    0,
                  avg_similarity: 0,
                  status:         'present',
                  marked_by:      'manual'
                }
              }
            }
          );
        } else {
          // Student already in array — just update marked_by
          await AttendanceSession.findOneAndUpdate(
            { session_id, 'students_present.student_id': student_id },
            {
              $set: {
                'students_present.$.marked_by': 'manual',
                'students_present.$.status':    'present'
              }
            }
          );
        }
      }
    }

    // 3. If marking ABSENT → remove from session's students_present array
    if (status === 'absent') {
      await AttendanceSession.findOneAndUpdate(
        { session_id },
        {
          $pull: {
            students_present: { student_id }
          }
        }
      );
    }

    res.json({ success: true, message: `Student marked ${status} successfully` });

  } catch (error) {
    console.error('[ERROR] correct attendance:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/attendance/sessions/:session_id/resolve-face ────────────────────
router.post('/sessions/:session_id/resolve-face', async (req, res) => {
  try {
    const { face_id, student_id, student_name } = req.body;
    const { session_id } = req.params;

    // Mark face as resolved in session
    await AttendanceSession.findOneAndUpdate(
      { session_id, 'unresolved_faces.face_id': face_id },
      {
        $set: {
          'unresolved_faces.$.resolved':    true,
          'unresolved_faces.$.resolved_to': student_name,
          'unresolved_faces.$.resolved_at': new Date()
        }
      }
    );

    // Add student to present list
    await AttendanceSession.findOneAndUpdate(
      { session_id },
      {
        $push: {
          students_present: {
            student_id,
            name:           student_name,
            appearances:    1,
            avg_similarity: 0,
            status:         'present',
            marked_by:      'manual'
          }
        }
      }
    );

    // Save attendance record
    await AttendanceRecord.findOneAndUpdate(
      { student_id, session_id },
      {
        student_id,
        session_id,
        date:      new Date(),
        status:    'present',
        marked_by: 'manual',
        notes:     'Resolved from unknown face'
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Face resolved and student marked present' });

  } catch (error) {
    console.error('[ERROR] resolve-face:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
