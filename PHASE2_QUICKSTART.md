# 🚀 Phase 2 Quick Start - Backend Setup

## What You Got in Phase 2

✅ **Complete Node.js + Express Backend**
- REST API for all operations
- MongoDB integration
- File upload handling
- Python script execution from Node.js
- Full CRUD for students and attendance

## Step-by-Step Setup (5 minutes)

### 1. Install Node.js (if not installed)

Check if you have it:
```bash
node --version
npm --version
```

If not, download from: https://nodejs.org/ (get LTS version)

### 2. Set Up MongoDB

**Easy Option - MongoDB Atlas (Cloud):**

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create new project → "AttendanceSystem"
4. Build Database → M0 FREE tier
5. Create cluster (takes 3-5 minutes)
6. Database Access → Add Database User
   - Username: `attendance_admin`
   - Password: (auto-generate and save it)
7. Network Access → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0)
8. Connect → "Connect your application"
9. Copy connection string (looks like: `mongodb+srv://username:password@cluster0...`)

### 3. Install Backend Dependencies

```bash
# Navigate to backend folder
cd attendance_system/backend

# Install all packages
npm install
```

This installs:
- Express (web server)
- Mongoose (MongoDB)
- Multer (file uploads)
- And more...

### 4. Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit .env (use notepad, vscode, or any text editor)
```

**On Windows:**
```bash
notepad .env
```

**On macOS:**
```bash
open -e .env
```

**Edit these values in .env:**

```env
PORT=5000
NODE_ENV=development

# Paste your MongoDB connection string here
MONGODB_URI=mongodb+srv://attendance_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/attendance_system?retryWrites=true&w=majority

JWT_SECRET=my-super-secret-key-12345

# Python path (adjust for your system)
# macOS/Linux:
PYTHON_PATH=../venv/bin/python

# Windows:
# PYTHON_PATH=..\\venv\\Scripts\\python.exe

CLIENT_URL=http://localhost:3000
```

### 5. Start the Server

```bash
# Development mode (auto-restarts on changes)
npm run dev
```

**Expected output:**
```
=============================================================
🎓 ATTENDANCE SYSTEM BACKEND SERVER
=============================================================
🚀 Server running on http://localhost:5000
📊 Environment: development
🗄️  Database: Connected
=============================================================

✅ MongoDB connected successfully
```

### 6. Test It Works

Open a **NEW terminal** (keep the server running) and test:

```bash
# Health check
curl http://localhost:5000/api/health

# Or open in browser:
# http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Attendance System API is running",
  "timestamp": "2024-02-26T10:30:00.000Z",
  "mongodb": "connected"
}
```

## 🎯 Test the API

### Test 1: Get Students

```bash
curl http://localhost:5000/api/students
```

Response (empty array first time):
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

### Test 2: Upload a Photo

```bash
curl -X POST http://localhost:5000/api/upload/photo \
  -F "photo=@data/enrollment_photos/my_photo.jpg"
```

### Test 3: Enroll Student via API

```bash
curl -X POST http://localhost:5000/api/students/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "API_TEST_001",
    "name": "API Test Student",
    "email": "test@example.com",
    "photo_path": "data/enrollment_photos/my_photo.jpg"
  }'
```

This will:
1. Call the Python enrollment script
2. Generate face embedding
3. Save to MongoDB
4. Return success

## 🗂️ Backend Architecture

```
backend/
├── server.js              # Main Express server
├── models/
│   └── index.js          # MongoDB schemas (Student, Attendance)
├── routes/
│   ├── students.js       # Student CRUD operations
│   ├── attendance.js     # Attendance processing
│   └── upload.js         # File upload handling
├── .env                  # Environment config (YOU CREATE THIS)
├── .env.example          # Template
└── package.json          # Dependencies
```

## 📡 Available API Endpoints

### Students:
- `GET    /api/students` - List all students
- `GET    /api/students/:id` - Get one student
- `POST   /api/students/enroll` - Enroll new student
- `PUT    /api/students/:id` - Update student
- `DELETE /api/students/:id` - Remove student

### Attendance:
- `POST   /api/attendance/process` - Process video
- `GET    /api/attendance/sessions` - List all sessions
- `GET    /api/attendance/sessions/:id` - Get session details
- `GET    /api/attendance/student/:id` - Get student history
- `POST   /api/attendance/sessions/:id/correct` - Manual correction

### Upload:
- `POST   /api/upload/photo` - Upload photo
- `POST   /api/upload/video` - Upload video
- `GET    /api/upload/info` - Get upload limits

## 🐛 Common Issues

### "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### "MongoDB connection error"
**Solutions:**
1. Check your MONGODB_URI in `.env`
2. Make sure password is correct
3. Check IP whitelist in MongoDB Atlas (allow 0.0.0.0/0)
4. Check internet connection

### "Port 5000 already in use"
**Solution:** Change PORT in `.env` to 5001

### "Python script failed"
**Solutions:**
1. Make sure Python venv is activated
2. Check PYTHON_PATH in `.env` is correct
3. Test Python script manually first

## ✅ What's Working Now

After setup, you have:
- ✅ REST API server running
- ✅ MongoDB database connected
- ✅ File upload working
- ✅ Python integration ready
- ✅ Student enrollment via API
- ✅ Video processing via API

## 🚀 Next: React Frontend

Once backend is running, we'll build the React dashboard:
- Student enrollment interface
- Video upload & processing
- Attendance report viewer
- Manual face resolution UI

---

**Questions? Issues? Let me know your error messages!** 🎓
