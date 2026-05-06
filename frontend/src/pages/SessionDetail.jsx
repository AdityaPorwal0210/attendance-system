import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { attendanceAPI, studentsAPI } from '../services/api';
import { toast } from 'react-toastify';

const STATUS = { completed: 'badge-green', processing: 'badge-yellow', failed: 'badge-red' };

// ── Unrecognized Face Card ──────────────────────────────────────────────────
function FaceCard({ face, students, onResolve }) {
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  const resolve = async () => {
    if (!selected) return toast.error('Please select a student');
    setSaving(true);
    try {
      await onResolve(face.face_id, selected);
      toast.success('Face resolved!');
    } catch {
      toast.error('Failed to resolve');
    } finally {
      setSaving(false);
    }
  };

  if (face.resolved) {
    return (
      <div className="card border-emerald-800/50 bg-emerald-900/10 face-card">
        <div className="w-full aspect-square bg-slate-800 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
          {face.image_path
            ? <img src={`http://localhost:5000/${face.image_path}`} className="w-full h-full object-cover" alt="face" />
            : <div className="text-4xl text-slate-600">◉</div>}
        </div>
        <div className="text-center">
          <span className="badge-green">✓ Resolved</span>
          <p className="text-emerald-400 text-sm font-medium mt-2">{face.resolved_to}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card face-card border-amber-800/30 bg-amber-900/5">
      {/* Face crop */}
      <div className="w-full aspect-square bg-slate-800 rounded-xl overflow-hidden mb-3 border-2 border-amber-700/40 flex items-center justify-center relative">
        {face.image_path
          ? <img src={`http://localhost:5000/${face.image_path}`} className="w-full h-full object-cover" alt="Unknown face" />
          : <div className="text-center"><div className="text-5xl text-slate-600 mb-2">?</div><p className="text-slate-600 text-xs">No crop available</p></div>}
        <div className="absolute top-2 right-2">
          <span className="badge-yellow text-xs">Unidentified</span>
        </div>
        {face.best_similarity !== undefined && (
          <div className="absolute bottom-2 left-2 bg-slate-900/80 rounded-lg px-2 py-1">
            <p className="text-xs text-slate-400 mono">Best match: {(face.best_similarity * 100).toFixed(0)}%</p>
          </div>
        )}
      </div>

      {/* Resolution controls */}
      <p className="text-xs text-slate-500 mb-2 font-medium">Assign to student:</p>
      <select value={selected} onChange={e => setSelected(e.target.value)}
        className="input text-sm mb-3 py-2">
        <option value="">— Select student —</option>
        {students.map(s => (
          <option key={s.student_id} value={s.student_id}>
            {s.name} ({s.student_id})
          </option>
        ))}
      </select>
      <button onClick={resolve} disabled={!selected || saving}
        className="btn-success w-full justify-center text-sm py-2">
        {saving ? <div className="spinner" /> : '✓ Mark Present'}
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const fetchSession = async () => {
    try {
      const [sRes, stuRes] = await Promise.all([
        attendanceAPI.getSession(id),
        studentsAPI.getAll()
      ]);
      setSession(sRes.data.data);
      setStudents(stuRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    return () => clearInterval(pollRef.current);
  }, [id]);

  // Poll while processing
  useEffect(() => {
    clearInterval(pollRef.current);
    if (session?.status === 'processing') {
      pollRef.current = setInterval(fetchSession, 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [session?.status]);

  const handleResolve = async (faceId, studentId) => {
    const student = students.find(s => s.student_id === studentId);
    await attendanceAPI.resolveUnknownFace(id, {
      face_id: faceId,
      student_id: studentId,
      student_name: student?.name || studentId,
    });
    fetchSession();
  };

  const handleManualToggle = async (studentId, currentStatus) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    try {
      await attendanceAPI.correctAttendance(id, { student_id: studentId, status: newStatus, notes: 'Manual correction' });
      fetchSession();
      toast.success(`Marked ${newStatus}`);
    } catch { toast.error('Update failed'); }
  };

  const exportCSV = () => {
    if (!session) return;
    const rows = [
      ['Student ID', 'Name', 'Status', 'Appearances', 'Confidence'],
      ...(session.students_present || []).map(s => [
        s.student_id, s.name, 'Present', s.appearances, (s.avg_similarity * 100).toFixed(1) + '%'
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `attendance_${session.class_name}_${new Date(session.date).toLocaleDateString()}.csv`;
    a.click();
    toast.success('Exported!');
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="spinner spinner-lg" /></div>;
  if (!session) return <div className="text-center py-20 text-slate-500"><p className="text-lg">Session not found</p><Link to="/reports" className="btn-ghost mt-4">← Back to Reports</Link></div>;

  const present = session.students_present || [];
  const unresolved = (session.unresolved_faces || []).filter(f => !f.resolved);
  const resolved = (session.unresolved_faces || []).filter(f => f.resolved);

  // YOLO checksum values
  const avgOccupancy = session.statistics?.avg_classroom_occupancy || 0;
  const recognized = present.length;
  const unaccounted = Math.max(0, Math.round(avgOccupancy) - recognized);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link to="/reports" className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-3">
            ← Back to Reports
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">{session.class_name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {session.instructor && ` · ${session.instructor}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {session.status === 'completed' && (
            <button onClick={exportCSV} className="btn-ghost text-sm">⬇ Export CSV</button>
          )}
          <span className={STATUS[session.status] || 'badge-blue'}>{session.status?.toUpperCase()}</span>
        </div>
      </div>

      {/* Processing spinner */}
      {session.status === 'processing' && (
        <div className="card border-amber-800/50 bg-amber-900/10">
          <div className="flex items-center gap-4">
            <div className="spinner spinner-lg" />
            <div>
              <p className="font-semibold text-amber-300">AI is processing the video…</p>
              <p className="text-amber-600 text-sm">Detecting faces and counting people. Auto-refreshing every 4 seconds.</p>
            </div>
          </div>
        </div>
      )}

      {session.status === 'completed' && (
        <>
          {/* ── STATS GRID ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Frames Analyzed', value: session.frames_analyzed || 0, icon: '≡', color: 'text-blue-400' },
              { label: 'Students Present', value: present.length, icon: '◉', color: 'text-emerald-400' },
              { label: 'Recognition Rate', value: session.statistics?.recognition_rate || '—', icon: '%', color: 'text-indigo-400' },
              { label: 'Avg Occupancy', value: `${avgOccupancy} ppl`, icon: '▲', color: 'text-purple-400' },
            ].map((s, i) => (
              <div key={i} className="card">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-lg ${s.color}`}>{s.icon}</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── YOLO CHECKSUM ──────────────────────────────────────────── */}
          <div className="card border-indigo-800/50 bg-indigo-900/10">
            <h2 className="font-semibold text-indigo-300 mb-4 flex items-center gap-2">
              <span>◈</span> YOLO Headcount Checksum
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-800/60 rounded-xl">
                <p className="text-3xl font-bold text-slate-100">{Math.round(avgOccupancy)}</p>
                <p className="text-slate-400 text-xs mt-1">Total Bodies (YOLO)</p>
              </div>
              <div className="text-center p-4 bg-emerald-900/30 rounded-xl border border-emerald-800/50">
                <p className="text-3xl font-bold text-emerald-400">{recognized}</p>
                <p className="text-emerald-600 text-xs mt-1">Recognized by AI</p>
              </div>
              <div className={`text-center p-4 rounded-xl border ${unaccounted > 0 ? 'bg-red-900/20 border-red-800/50' : 'bg-slate-800/60 border-slate-700'}`}>
                <p className={`text-3xl font-bold ${unaccounted > 0 ? 'text-red-400' : 'text-slate-400'}`}>{unaccounted}</p>
                <p className={`text-xs mt-1 ${unaccounted > 0 ? 'text-red-600' : 'text-slate-500'}`}>Unaccounted</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 p-3 bg-slate-800/40 rounded-xl">
              <span className="text-amber-500 text-sm">⚠</span>
              <p className="text-slate-400 text-xs">
                <strong>Formula:</strong> Total Bodies − Recognized = Unaccounted.{' '}
                {unaccounted > 0
                  ? `${unaccounted} student(s) were detected in the room but could not be identified — they may be occluded, facing away, or not yet enrolled.`
                  : 'All detected students were successfully identified.'}
              </p>
            </div>
          </div>

          {/* ── UNRECOGNIZED FACES — TEACHER RESOLUTION ────────────────── */}
          {(session.unresolved_faces?.length > 0) && (
            <div className="card border-amber-800/40">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-amber-300 flex items-center gap-2">
                    <span>?</span> Unidentified Faces — Teacher Action Required
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    These faces were detected but not confidently matched. Click a crop, select the student, and mark present.
                  </p>
                </div>
                <span className="badge-yellow">{unresolved.length} pending</span>
              </div>

              {unresolved.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-emerald-400 text-xl mb-1">✓</p>
                  <p className="text-slate-400 text-sm">All unidentified faces have been resolved!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {unresolved.map(face => (
                    <FaceCard key={face.face_id} face={face} students={students} onResolve={handleResolve} />
                  ))}
                </div>
              )}

              {resolved.length > 0 && (
                <details className="mt-6">
                  <summary className="text-slate-500 text-sm cursor-pointer hover:text-slate-300">
                    ▸ {resolved.length} resolved face(s)
                  </summary>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mt-3">
                    {resolved.map(face => (
                      <FaceCard key={face.face_id} face={face} students={students} onResolve={handleResolve} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ── PRESENT STUDENTS TABLE ──────────────────────────────────── */}
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-6 flex items-center gap-2">
              <span className="text-emerald-400">◉</span> Present Students ({present.length})
            </h2>

            {present.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p className="text-3xl mb-2">◉</p>
                <p>No students recognized in this session</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['#', 'Student', 'ID', 'Appearances', 'Confidence', 'Marked By', 'Action'].map(h => (
                        <th key={h} className="pb-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {present.map((s, i) => {
                      const conf = (s.avg_similarity * 100).toFixed(1);
                      const confColor = conf >= 80 ? 'text-emerald-400' : conf >= 65 ? 'text-amber-400' : 'text-red-400';
                      const markedBy = s.marked_by === 'manual' ? 'Manual' : 'AI';
                      const markedColor = s.marked_by === 'manual' ? 'badge-yellow' : 'badge-blue';
                      return (
                        <tr key={s.student_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2 first:pl-0 text-slate-600">{i + 1}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {s.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-200">{s.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 mono text-slate-500 text-xs">{s.student_id}</td>
                          <td className="py-3 px-2 text-slate-400">
                            {s.appearances}/{session.frames_analyzed}
                            <div className="w-20 h-1 bg-slate-800 rounded-full mt-1">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(s.appearances / session.frames_analyzed) * 100}%` }} />
                            </div>
                          </td>
                          <td className={`py-3 px-2 font-bold mono ${confColor}`}>{conf}%</td>
                          <td className="py-3 px-2"><span className={markedColor}>{markedBy}</span></td>
                          <td className="py-3 px-2">
                            <button onClick={() => handleManualToggle(s.student_id, 'present')}
                              className="text-slate-600 hover:text-red-400 transition-colors text-xs font-medium">
                              Mark Absent
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── PROCESSING INFO ─────────────────────────────────────────── */}
          {session.processing_time && (
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span>Processed in {session.processing_time.toFixed(1)}s</span>
              <span>{session.session_id}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
