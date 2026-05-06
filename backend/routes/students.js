const express = require('express');
const router = express.Router();
const { Student } = require('../models');
const { spawn } = require('child_process');
const path = require('path');

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find({ status: 'active' })
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single student
router.get('/:student_id', async (req, res) => {
  try {
    const student = await Student.findOne({ 
      student_id: req.params.student_id 
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enroll new student
router.post('/enroll', async (req, res) => {
  try {
    const { student_id, name, email, photo_path } = req.body;
    
    // Check if student already exists
    const existingStudent = await Student.findOne({ student_id });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: 'Student ID already exists'
      });
    }
    
    // Call Python enrollment script
    const pythonPath = process.env.PYTHON_PATH || 'python3';
const scriptPath = path.join(__dirname, '../../python_scripts/enroll_student.py');
    
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      '--photo', photo_path,
      '--student_id', student_id,
      '--name', name,
      '--output_dir', path.join(__dirname, '../../data/enrolled_students')
    ]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
      console.log(data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(data.toString());
    });
    
    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: 'Enrollment failed',
          details: errorData
        });
      }
      
      // Save to MongoDB
      const student = new Student({
        student_id,
        name,
        email: email || '',
        photo_path,
        embedding_path: path.join(__dirname, '../../data/enrolled_students', `${student_id}.json`),
        metadata: {
          embedding_model: 'InsightFace-ArcFace',
          enrollment_device: 'backend-api'
        }
      });
      
      await student.save();
      
      res.json({
        success: true,
        message: 'Student enrolled successfully',
        data: student
      });
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete student
router.delete('/:student_id', async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { student_id: req.params.student_id },
      { status: 'inactive' },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Student deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
