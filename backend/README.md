# Backend Setup Guide

## Prerequisites

- Node.js v16+ installed
- MongoDB (Atlas or local)
- Python environment already set up from Phase 1

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

This will install:
- express (web framework)
- mongoose (MongoDB ODM)
- multer (file uploads)
- cors (cross-origin requests)
- dotenv (environment variables)
- bcrypt (password hashing)
- jsonwebtoken (authentication)
- morgan (logging)

## Step 2: Configure Environment

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB - Choose one option:

# Option 1: MongoDB Atlas (Recommended for development)
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/attendance_system?retryWrites=true&w=majority

# Option 2: Local MongoDB
# MONGODB_URI=mongodb://localhost:27017/attendance_system

# JWT Secret (generate random string)
JWT_SECRET=your-super-secret-key-change-this

# Python
PYTHON_PATH=../venv/bin/python
# Windows: PYTHON_PATH=..\\venv\\Scripts\\python.exe

# Client URL
CLIENT_URL=http://localhost:3000
```

### MongoDB Atlas Setup:

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Create new cluster (M0 Free tier)
4. Click "Connect" → "Connect your application"
5. Copy connection string
6. Replace `<password>` with your database password
7. Replace `<dbname>` with `attendance_system`

## Step 3: Test the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

Expected output:
```
=============================================================
🎓 ATTENDANCE SYSTEM BACKEND SERVER
=============================================================
🚀 Server running on http://localhost:5000
📊 Environment: development
🗄️  Database: Connected
=============================================================
```

## Step 4: Test API Endpoints

### Health Check:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Attendance System API is running",
  "timestamp": "2024-02-26T...",
  "mongodb": "connected"
}
```

### Get Students:
```bash
curl http://localhost:5000/api/students
```

### Upload Info:
```bash
curl http://localhost:5000/api/upload/info
```

## API Routes

### Students API (`/api/students`)

- `GET /api/students` - Get all students
- `GET /api/students/:student_id` - Get single student
- `POST /api/students/enroll` - Enroll new student
- `PUT /api/students/:student_id` - Update student
- `DELETE /api/students/:student_id` - Deactivate student

### Attendance API (`/api/attendance`)

- `POST /api/attendance/process` - Process video for attendance
- `GET /api/attendance/sessions` - Get all sessions
- `GET /api/attendance/sessions/:session_id` - Get session details
- `GET /api/attendance/student/:student_id` - Get student history
- `POST /api/attendance/sessions/:session_id/correct` - Manual correction

### Upload API (`/api/upload`)

- `POST /api/upload/photo` - Upload enrollment photo
- `POST /api/upload/video` - Upload classroom video
- `GET /api/upload/info` - Get upload limits

## Testing with Postman/cURL

### Enroll Student:

```bash
# First upload photo
curl -X POST http://localhost:5000/api/upload/photo \
  -F "photo=@/path/to/photo.jpg"

# Then enroll with returned path
curl -X POST http://localhost:5000/api/students/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "TEST001",
    "name": "John Doe",
    "email": "john@example.com",
    "photo_path": "data/enrollment_photos/photo-xxxxx.jpg"
  }'
```

### Process Attendance:

```bash
# Upload video
curl -X POST http://localhost:5000/api/upload/video \
  -F "video=@/path/to/classroom.mp4"

# Process attendance
curl -X POST http://localhost:5000/api/attendance/process \
  -H "Content-Type: application/json" \
  -d '{
    "video_path": "data/test_videos/video-xxxxx.mp4",
    "class_name": "CS101",
    "date": "2024-02-26",
    "instructor": "Prof. Smith",
    "samples": 5,
    "threshold": 0.6
  }'

# Check session status
curl http://localhost:5000/api/attendance/sessions/SESSION_xxxxx
```

## Troubleshooting

### "MongoDB connection error"

**Solution:** Check your MONGODB_URI in `.env`

For local MongoDB:
```bash
# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongodb           # Linux
```

### "EADDRINUSE: address already in use"

**Solution:** Port 5000 is already in use

Change PORT in `.env` to 5001 or kill existing process:
```bash
# Find process
lsof -i :5000

# Kill it
kill -9 <PID>
```

### "Python script not found"

**Solution:** Check PYTHON_PATH in `.env`

```bash
# Find Python path
which python3

# Update .env
PYTHON_PATH=/path/to/venv/bin/python
```

## Next Steps

After backend is running:
1. Test all API endpoints
2. Set up React frontend
3. Connect frontend to backend
4. Deploy to production

## Development Tips

- Use `npm run dev` for auto-restart during development
- Check logs in console for errors
- MongoDB data persists across restarts
- Test endpoints with Postman or cURL before frontend integration
