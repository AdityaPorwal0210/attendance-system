import axios from 'axios';

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' 
});
export const studentsAPI = {
  getAll: () => api.get('/students'),
  getOne: (id) => api.get(`/students/${id}`),
  enroll: (data) => api.post('/students/enroll', data),
  delete: (id) => api.delete(`/students/${id}`),
};

export const attendanceAPI = {
  process: (data) => api.post('/attendance/process', data),
  getSessions: () => api.get('/attendance/sessions'),
  getSession: (id) => api.get(`/attendance/sessions/${id}`),
  getStudentHistory: (id) => api.get(`/attendance/student/${id}`),
  correctAttendance: (sessionId, data) => api.post(`/attendance/sessions/${sessionId}/correct`, data),
  resolveUnknownFace: (sessionId, data) => api.post(`/attendance/sessions/${sessionId}/resolve-face`, data),
};

export const uploadAPI = {
  uploadPhoto: (file) => {
    const fd = new FormData(); fd.append('photo', file);
    return api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadVideo: (file, onProgress) => {
    const fd = new FormData(); fd.append('video', file);
    return api.post('/upload/video', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round(e.loaded * 100 / e.total))
    });
  },
};

export default api;
