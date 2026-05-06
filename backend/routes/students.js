const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');

// Fix model path - works on both local and Render
const { Student } = require(path.join(__dirname, '..', 'models', 'index.js'));

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find({ status: 'active' }).sort({ name: 1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single student
router.get('/:student_id', async (req, res) => {
  try {
    const student = await Student.findOne({ student_id: req.params.student_id });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enroll new student
router.post('/enroll', async (req, res) => {
  try {
    const { student_id, name, email, photo_path } = req.body;

    if (!student_id || !name || !photo_path) {
      return res.status(400).json({ success: false, error: 'student_id, name and photo_path are required' });
    }

    // Check if student already exists
    const existing = await Student.findOne({ student_id });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Student ID already exists' });
    }

    // Build paths
    const pythonPath   = process.env.PYTHON_PATH || 'python3';
    const scriptPath   = path.join(__dirname, '..', '..', 'python_scripts', 'enroll_student.py');
    const outputDir    = path.join(__dirname, '..', '..', 'data', 'enrolled_students');

    // Spawn Python enrollment script
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      '--photo',       photo_path,
      '--student_id',  student_id,
      '--name',        name,
      '--output_dir',  outputDir
    ]);

    let outputData = '';
    let errorData  = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
      console.log('[Python]', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error('[Python ERR]', data.toString());
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error:   'Python enrollment script failed',
          details: errorData
        });
      }

      try {
        // Save student to MongoDB
        const student = new Student({
          student_id,
          name,
          email:          email || '',
          photo_path,
          embedding_path: path.join(outputDir, `${student_id}.json`),
          metadata: {
            embedding_model:   'InsightFace-ArcFace',
            enrollment_device: 'backend-api'
          }
        });

        await student.save();

        res.json({
          success: true,
          message: 'Student enrolled successfully',
          data:    student
        });

      } catch (dbError) {
        res.status(500).json({ success: false, error: dbError.message });
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update student
router.put('/:student_id', async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { student_id: req.params.student_id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete (deactivate) student
router.delete('/:student_id', async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { student_id: req.params.student_id },
      { status: 'inactive' },
      { new: true }
    );
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, message: 'Student deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
