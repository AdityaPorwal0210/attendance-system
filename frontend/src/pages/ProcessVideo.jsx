import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { uploadAPI, attendanceAPI } from '../services/api';

export default function ProcessVideo() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [form, setForm] = useState({ class_name: '', date: new Date().toISOString().split('T')[0], instructor: '', samples: '5', threshold: '0.6' });
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('idle'); // idle | uploading | processing | done

  const onDrop = useCallback(files => { const f = files[0]; if (f) setVideo(f); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'video/*': ['.mp4', '.avi', '.mov', '.mkv'] }, maxFiles: 1, maxSize: 500 * 1024 * 1024
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!video) return toast.error('Please upload a video');
    if (!form.class_name.trim()) return toast.error('Class name is required');

    try {
      setStep('uploading');
      const up = await uploadAPI.uploadVideo(video, p => setProgress(p));

      setStep('processing');
      const res = await attendanceAPI.process({
        video_path: up.data.data.path,
        class_name: form.class_name,
        date: form.date,
        instructor: form.instructor || 'Not specified',
        samples: parseInt(form.samples),
        threshold: parseFloat(form.threshold),
      });

      setStep('done');
      toast.success('Processing started! Redirecting…');
      setTimeout(() => navigate(`/session/${res.data.session_id}`), 1500);
    } catch (err) {
      setStep('idle');
      toast.error(err.response?.data?.error || 'Processing failed');
    }
  };

  const fmt = (b) => b > 1e6 ? `${(b/1e6).toFixed(1)} MB` : `${(b/1e3).toFixed(0)} KB`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Process Classroom Video</h1>
        <p className="text-slate-500 mt-1 text-sm">Upload a recording — AI will mark attendance automatically</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Video Drop */}
        <div className="card">
          <label className="label">Classroom Video *</label>
          {video ? (
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-xl">▶</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 truncate">{video.name}</p>
                <p className="text-slate-500 text-sm">{fmt(video.size)}</p>
              </div>
              {step === 'idle' && (
                <button type="button" onClick={() => setVideo(null)} className="text-slate-500 hover:text-red-400 transition-colors text-sm">Remove</button>
              )}
            </div>
          ) : (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 hover:border-slate-500'}`}>
              <input {...getInputProps()} />
              <div className="text-4xl mb-3 text-slate-600">{isDragActive ? '⬇' : '▶'}</div>
              <p className="text-slate-400 text-sm">{isDragActive ? 'Drop video here' : 'Drag classroom video here or click to browse'}</p>
              <p className="text-slate-600 text-xs mt-1">MP4, AVI, MOV, MKV — up to 500 MB</p>
            </div>
          )}

          {/* Upload Progress */}
          {step === 'uploading' && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading…</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {step === 'processing' && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-xl">
              <div className="spinner" />
              <p className="text-amber-400 text-sm">AI is analyzing frames. Do not close this tab.</p>
            </div>
          )}
        </div>

        {/* Session Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-wider">Session Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Class Name *</label>
              <input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })}
                placeholder="e.g. CS301 - Operating Systems" className="input" required />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Instructor</label>
              <input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })}
                placeholder="Prof. Name" className="input" />
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-wider">AI Settings</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="label mb-0">Frame Samples</label>
                <span className="mono text-indigo-400 text-sm font-bold">{form.samples}</span>
              </div>
              <input type="range" min="3" max="20" value={form.samples} onChange={e => setForm({ ...form, samples: e.target.value })}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-xs text-slate-600 mt-1"><span>3 (fast)</span><span>20 (accurate)</span></div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="label mb-0">Match Threshold</label>
                <span className="mono text-indigo-400 text-sm font-bold">{form.threshold}</span>
              </div>
              <input type="range" min="0.5" max="0.9" step="0.05" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-xs text-slate-600 mt-1"><span>0.5 (lenient)</span><span>0.9 (strict)</span></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-800">
            {[['3 frames','~30 sec'],['5 frames','~1 min'],['10 frames','~2 min']].map(([f,t]) => (
              <div key={f} className="text-center p-2 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300 text-xs font-medium">{f}</p>
                <p className="text-slate-500 text-xs">{t}</p>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={step !== 'idle' || !video} className="btn-primary w-full justify-center py-3 text-base">
          {step === 'idle' ? <>▶ Start Processing</> :
           step === 'uploading' ? <><div className="spinner" /> Uploading ({progress}%)…</> :
           step === 'processing' ? <><div className="spinner" /> Analyzing Video…</> :
           <>✓ Done! Redirecting…</>}
        </button>
      </form>
    </div>
  );
}
