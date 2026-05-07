const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');
require('dotenv').config();

const app = express();

// ── CORS — allow localhost AND Vercel URL ─────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean); // remove undefined/null entries

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('[CORS] Blocked origin:', origin);
    return callback(new Error(`CORS policy: origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests for all routes
app.options('*', cors());

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'data')));
app.use('/output',  express.static(path.join(__dirname, '..', 'output')));

// ── Database ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('[DB] MongoDB connected successfully'))
  .catch(err => {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  });

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/students',   require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/upload',     require('./routes/upload'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    message:   'Attendance System API is running',
    timestamp: new Date().toISOString(),
    mongodb:   mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    allowed_origins: allowedOrigins
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: { message: err.message || 'Internal Server Error', status: err.status || 500 }
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('============================================================');
  console.log('  ATTENDANCE SYSTEM BACKEND SERVER');
  console.log('============================================================');
  console.log(`  Port:     ${PORT}`);
  console.log(`  Env:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`  CORS:     ${allowedOrigins.join(', ')}`);
  console.log('============================================================');
  console.log('');
});

module.exports = app;
