# 🎓 Automated Classroom Attendance System
**SGSITS Indore | B.Tech IT | 2023-2024**
Developed by: Aditya Porwal,Aditya Shrotiya,Kalash Jain

---

## 🚀 QUICK START (3 Steps)

### Step 1 - Python Setup
```bash
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

### Step 2 - Backend Setup
```bash
cd backend
npm install
cp .env.example .env      # Edit with your MongoDB URI
npm run dev               # Runs on http://localhost:5000
```

### Step 3 - Frontend Setup
```bash
cd frontend
npm install
npm run dev               # Opens http://localhost:3000
```

---

## 📁 Project Structure

```
attendance_system/
├── python_scripts/          # AI Core (Phase 1)
│   ├── enroll_student.py   
│   ├── extract_frames.py   
│   ├── recognize_faces.py  
│   ├── yolo_headcount.py   
│   └── attendance_pipeline.py
├── backend/                 # Node.js API (Phase 2)
│   ├── server.js
│   ├── models/index.js
│   ├── routes/
│   ├── package.json
│   └── .env.example
├── frontend/                # React Dashboard (Phase 3)
│   ├── src/pages/
│   ├── src/components/
│   ├── package.json
│   └── vite.config.js
├── data/                    # Storage
├── output/                  # Results
└── requirements.txt
```

---

## PHASE 1: PYTHON AI SETUP

### Prerequisites
- Python 3.8 to 3.11 → https://python.org/downloads
- Windows users: Check "Add to PATH" during install

### Install Dependencies
```bash
# Activate venv first, then:
pip install -r requirements.txt
```

### Enroll a Student
```bash
python python_scripts/enroll_student.py \
  --photo data/enrollment_photos/your_photo.jpg \
  --student_id STU001 \
  --name "Your Name"
```

### Run Attendance on Video
```bash
python python_scripts/attendance_pipeline.py \
  --video data/test_videos/classroom.mp4 \
  --enrolled_dir data/enrolled_students \
  --samples 5
```

---

## PHASE 2: BACKEND SETUP

### Prerequisites
- Node.js 18+ → https://nodejs.org (choose LTS)
- MongoDB Atlas free account → https://mongodb.com/atlas

### MongoDB Atlas Setup (Free)
1. Register at https://www.mongodb.com/cloud/atlas/register
2. Create project → Build Database → M0 FREE
3. Create database user (note username & password)
4. Network Access → Add IP → Allow from Anywhere
5. Connect → Drivers → Copy connection string

### Configure .env
```bash
cd backend
cp .env.example .env
```
Edit .env:
```
PORT=5000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/attendance_db
JWT_SECRET=mysecretkey123
PYTHON_PATH=../venv/bin/python
# Windows: PYTHON_PATH=..\venv\Scripts\python.exe
CLIENT_URL=http://localhost:3000
```

### Start Backend
```bash
cd backend
npm install
npm run dev
# Test: http://localhost:5000/api/health
```

---

## PHASE 3: FRONTEND SETUP

### Start Frontend
```bash
cd frontend
npm install
npm run dev
# Open: http://localhost:3000
```

---

## USING THE SYSTEM

1. **Enroll Student** → Upload photo + enter ID + name
2. **Process Video** → Upload classroom video + enter class details
3. **View Reports** → See attendance with confidence scores
4. **Students List** → Manage enrolled students

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| No face detected | Use clear, front-facing photo in good light |
| MongoDB error | Check URI in .env, allow all IPs in Atlas |
| Module not found | Make sure venv is activated |
| Port in use | Change PORT in .env to 5001 |
| Low accuracy | Lower threshold to 0.55, use better photos |

---

## TECH STACK

| Component | Technology |
|-----------|-----------|
| Face Detection | InsightFace (RetinaFace) |
| Face Recognition | ArcFace 512-d vectors |
| People Counting | YOLOv8n |
| Matching | Cosine Similarity |
| Backend API | Node.js + Express |
| Database | MongoDB |
| Frontend | React + Tailwind CSS |
| Video Processing | OpenCV |
