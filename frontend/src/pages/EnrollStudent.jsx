import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { uploadAPI, studentsAPI } from '../services/api';

export default function EnrollStudent() {
  const [form, setForm] = useState({ student_id: '', name: '', email: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const onDrop = useCallback(files => {
    const f = files[0];
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
    setDone(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return toast.error('Please upload a photo');
    if (!form.student_id.trim() || !form.name.trim()) return toast.error('Student ID and Name are required');
    setLoading(true);
    try {
      const up = await uploadAPI.uploadPhoto(photo);
      await studentsAPI.enroll({ ...form, photo_path: up.data.data.path });
      setDone(form.name);
      setForm({ student_id: '', name: '', email: '' });
      setPhoto(null);
      setPreview(null);
      toast.success(`${form.name} enrolled successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Enroll Student</h1>
        <p className="text-slate-500 mt-1 text-sm">Register a student's face for automatic attendance recognition</p>
      </div>

      {done && (
        <div className="card border-emerald-800 bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-lg">✓</div>
            <div>
              <p className="font-semibold text-emerald-300">{done} enrolled successfully!</p>
              <p className="text-emerald-500 text-sm">Face embedding generated and saved to database</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo Upload */}
        <div className="space-y-3">
          <label className="label">Student Photo *</label>
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/50">
              <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }}
                className="absolute top-3 right-3 bg-slate-900/80 hover:bg-red-900/80 text-slate-300 hover:text-red-300 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                Remove
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent px-4 py-3">
                <p className="text-xs text-emerald-400 font-medium">✓ Photo ready for enrollment</p>
              </div>
            </div>
          ) : (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 h-64 flex flex-col items-center justify-center
              ${isDragActive ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'}`}>
              <input {...getInputProps()} />
              <div className="text-4xl mb-3 text-slate-600">{isDragActive ? '⬇' : '◈'}</div>
              <p className="text-slate-400 text-sm font-medium">{isDragActive ? 'Drop photo here' : 'Drag photo here or click to browse'}</p>
              <p className="text-slate-600 text-xs mt-2">JPG, PNG up to 10MB</p>
            </div>
          )}

          <div className="bg-slate-800/50 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Photo Requirements</p>
            {['Clear, front-facing photo', 'Good lighting, no shadows on face', 'No sunglasses or mask', 'Minimum 640 × 480 px'].map(r => (
              <p key={r} className="text-xs text-slate-500 flex items-center gap-2"><span className="text-indigo-500">·</span>{r}</p>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div>
            <label className="label">Student ID *</label>
            <input value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}
              placeholder="e.g. 0801IT201013" className="input" required />
          </div>
          <div>
            <label className="label">Full Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Aditya" className="input" required />
          </div>
          <div>
            <label className="label">Email <span className="text-slate-600">(optional)</span></label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="student@sgsits.ac.in" className="input" />
          </div>

          <div className="pt-2 space-y-3">
            <button type="submit" disabled={loading || !photo} className="btn-primary w-full justify-center py-3">
              {loading ? <><div className="spinner" /> Processing face…</> : <>◈ Enroll Student</>}
            </button>
            <button type="button" onClick={() => { setForm({ student_id: '', name: '', email: '' }); setPhoto(null); setPreview(null); }}
              className="btn-ghost w-full justify-center">Clear Form</button>
          </div>

          {/* Pipeline info */}
          <div className="border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What happens when you enroll:</p>
            {['RetinaFace detects the face in photo', 'ArcFace generates 512-d embedding vector', 'Vector saved to database for future matching'].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500">{i + 1}</div>
                <p className="text-xs text-slate-500">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
