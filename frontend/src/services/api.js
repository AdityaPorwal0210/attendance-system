import axios from 'axios';

// Get base URL from environment variable
// VITE_API_URL should be just the domain: https://attendance-system-a8mc.onrender.com
// We always add /api here so it never doubles up
const RAW_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Strip trailing slash, then add /api
const BASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';

console.log('[API] Connecting to:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Students ──────────────────────────────────────────────────────────────────
export const studentsAPI = {
  getAll:  ()         => api.get('/students'),
  getOne:  (id)       => api.get(`/students/${id}`),
  enroll:  (data)     => api.post('/students/enroll', data),
  update:  (id, data) => api.put(`/students/${id}`, data),
  delete:  (id)       => api.delete(`/students/${id}`),
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceAPI = {
  process:            (data)            => api.post('/attendance/process', data),
  getSessions:        ()                => api.get('/attendance/sessions'),
  getSession:         (id)              => api.get(`/attendance/sessions/${id}`),
  getStudentHistory:  (id)              => api.get(`/attendance/student/${id}`),
  correctAttendance:  (sessionId, data) => api.post(`/attendance/sessions/${sessionId}/correct`, data),
  resolveUnknownFace: (sessionId, data) => api.post(`/attendance/sessions/${sessionId}/resolve-face`, data),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadAPI = {
  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.post('/upload/photo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadVideo: (file, onProgress) => {
    const fd = new FormData();
    fd.append('video', file);
    return api.post('/upload/video', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
};

export default api;
