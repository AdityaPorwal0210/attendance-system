const mongoose = require('mongoose');

// Student Schema
const studentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  enrollment_date: {
    type: Date,
    default: Date.now
  },
  photo_path: {
    type: String,
    required: true
  },
  embedding_path: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated'],
    default: 'active'
  },
  metadata: {
    confidence: Number,
    embedding_model: String,
    enrollment_device: String
  }
}, {
  timestamps: true
});

// Attendance Session Schema
const attendanceSessionSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    unique: true
  },
  video_file: {
    type: String,
    required: true
  },
  class_name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  start_time: String,
  end_time: String,
  instructor: String,
  
  // Processing metadata
  frames_analyzed: Number,
  processing_time: Number,
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  
  // Attendance results
  students_present: [{
    student_id: String,
    name: String,
    appearances: Number,
    avg_similarity: Number,
    status: {
      type: String,
      enum: ['present', 'absent', 'manual'],
      default: 'present'
    }
  }],
  
  students_absent: [{
    student_id: String,
    name: String
  }],
  
  // Statistics
  statistics: {
    total_faces_detected: Number,
    total_recognized: Number,
    total_unrecognized: Number,
    recognition_rate: String,
    avg_classroom_occupancy: Number
  },
  
  // Validation data
  validation: {
    avg_unaccounted: Number,
    frames: [{
      frame_number: Number,
      headcount: Number,
      recognized: Number,
      unaccounted: Number
    }]
  },
  
  // Unresolved faces (for teacher to manually identify)
  unresolved_faces: [{
    face_id: String,
    image_path: String,
    bbox: [Number],
    best_similarity: Number,
    frame_number: Number,
    resolved: {
      type: Boolean,
      default: false
    },
    resolved_to: String,
    resolved_by: String,
    resolved_at: Date
  }]
}, {
  timestamps: true
});

// Attendance Record Schema (individual student attendance)
const attendanceRecordSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
    ref: 'Student'
  },
  session_id: {
    type: String,
    required: true,
    ref: 'AttendanceSession'
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  marked_by: {
    type: String,
    enum: ['system', 'manual'],
    default: 'system'
  },
  appearances: Number,
  avg_similarity: Number,
  notes: String
}, {
  timestamps: true
});

// Indexes for faster queries
studentSchema.index({ student_id: 1 });
attendanceSessionSchema.index({ session_id: 1 });
attendanceSessionSchema.index({ date: -1 });
attendanceRecordSchema.index({ student_id: 1, date: -1 });

// Models
const Student = mongoose.model('Student', studentSchema);
const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

module.exports = {
  Student,
  AttendanceSession,
  AttendanceRecord
};
