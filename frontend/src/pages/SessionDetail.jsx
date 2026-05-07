import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { attendanceAPI, studentsAPI } from '../services/api';
import { toast } from 'react-toastify';

const STATUS_BADGE = {
  completed:  'badge-green',
  processing: 'badge-yellow',
  failed:     'badge-red'
};

export default function SessionDetail() {
  const { id } = useParams();
  const [session,     setSession]     = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [marking,     setMarking]     = useState(null);
  const pollRef = useRef(null);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const [sRes, stuRes] = await Promise.all([
        attendanceAPI.getSession(id),
        studentsAPI.getAll()
      ]);
      setSession(sRes.data.data);
      setAllStudents(stuRes.data.data || []);
    } catch {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    return () => clearInterval(pollRef.current);
  }, [id]);

  // Poll while processing
  useEffect(() => {
    clearInterval(pollRef.current);
    if (session?.status === 'processing') {
      pollRef.current = setInterval(fetchAll, 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [session?.status]);

  // ── Mark Present ──────────────────────────────────────────────────────────
  const markPresent = async (student) => {
    setMarking(student.student_id);
    try {
      await attendanceAPI.correctAttendance(id, {
        student_id: student.student_id,
        name:       student.name,        // ← pass name so backend can add it
        status:     'present',
        notes:      'Manually marked present by teacher'
      });
      toast.success(`${student.name} marked present ✓`);
      await fetchAll();                  // ← refresh so UI updates immediately
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update attendance');
    } finally {
      setMarking(null);
    }
  };

  // ── Mark Absent ───────────────────────────────────────────────────────────
  const markAbsent = async (student) => {
    setMarking(student.student_id);
    try {
      await attendanceAPI.correctAttendance(id, {
        student_id: student.student_id,
        name:       student.name,
        status:     'absent',
        notes:      'Manually marked absent by teacher'
      });
      toast.success(`${student.name} marked absent`);
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update attendance');
    } finally {
      setMarking(null);
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!session) return;
    const presentIds     = new Set((session.students_present || []).map(s => s.student_id));
    const absentStudents = allStudents.filter(s => !presentIds.has(s.student_id));

    const rows = [
      ['Student ID', 'Name', 'Status', 'Appearances', 'Confidence', 'Marked By'],
      ...(session.students_present || []).map(s => [
        s.student_id,
        s.name,
        'Present',
        s.appearances || 0,
        s.avg_similarity ? (s.avg_similarity * 100).toFixed(1) + '%' : 'Manual',
        s.marked_by === 'manual' ? 'Teacher' : 'AI'
      ]),
      ...absentStudents.map(s => [
        s.student_id,
        s.name,
        'Absent',
        0,
        '—',
        'System'
      ])
    ];

    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Attendance_${session.class_name}_${new Date(session.date).toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  // ── Loading / Not Found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-lg mb-4">Session not found</p>
        <Link to="/reports" className="btn-ghost">← Back to Reports</Link>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const presentIds     = new Set((session.students_present || []).map(s => s.student_id));
  const absentStudents = allStudents.filter(s => !presentIds.has(s.student_id));
  const filteredAbsent = absentStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  const avgOccupancy = session.statistics?.avg_classroom_occupancy || 0;
  const recognized   = (session.students_present || []).length;
  const unaccounted  = Math.max(0, Math.round(avgOccupancy) - recognized);

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link to="/reports" className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-3">
            ← Back to Reports
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">{session.class_name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date(session.date).toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
            {session.instructor && session.instructor !== 'Not specified' && ` · ${session.instructor}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {session.status === 'completed' && (
            <button onClick={exportCSV} className="btn-ghost text-sm">
              ⬇ Export CSV
            </button>
          )}
          <span className={STATUS_BADGE[session.status] || 'badge-blue'}>
            {session.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Processing Banner ────────────────────────────────────────────── */}
      {session.status === 'processing' && (
        <div className="card border-amber-800/50 bg-amber-900/10">
          <div className="flex items-center gap-4">
            <div className="spinner spinner-lg" />
            <div>
              <p className="font-semibold text-amber-300">AI is processing the video…</p>
              <p className="text-amber-600 text-sm">Auto-refreshing every 4 seconds. Please wait.</p>
            </div>
          </div>
        </div>
      )}

      {session.status === 'failed' && (
        <div className="card border-red-800/50 bg-red-900/10">
          <p className="font-semibold text-red-300">Processing Failed</p>
          <p className="text-red-500 text-sm mt-1">The AI pipeline encountered an error. Please try processing the video again.</p>
        </div>
      )}

      {session.status === 'completed' && (
        <>
          {/* ── Stats ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Frames Analyzed',  value: session.frames_analyzed || 0,              color: 'text-blue-400'    },
              { label: 'Students Present', value: recognized,                                color: 'text-emerald-400' },
              { label: 'Students Absent',  value: absentStudents.length,                    color: 'text-red-400'     },
              { label: 'Recognition Rate', value: session.statistics?.recognition_rate || '—', color: 'text-indigo-400'  },
            ].map((s, i) => (
              <div key={i} className="card text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── YOLO Checksum ─────────────────────────────────────────────── */}
          <div className="card border-indigo-800/40 bg-indigo-900/10">
            <h2 className="font-semibold text-indigo-300 mb-4 text-sm uppercase tracking-wider">
              YOLO Headcount Checksum
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-800/60 rounded-xl">
                <p className="text-3xl font-bold text-slate-100">{Math.round(avgOccupancy)}</p>
                <p className="text-slate-400 text-xs mt-1">Total Bodies Detected</p>
              </div>
              <div className="p-4 bg-emerald-900/30 rounded-xl border border-emerald-800/50">
                <p className="text-3xl font-bold text-emerald-400">{recognized}</p>
                <p className="text-emerald-600 text-xs mt-1">Recognized by AI</p>
              </div>
              <div className={`p-4 rounded-xl border ${unaccounted > 0 ? 'bg-red-900/20 border-red-800/50' : 'bg-slate-800/60 border-slate-700'}`}>
                <p className={`text-3xl font-bold ${unaccounted > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {unaccounted}
                </p>
                <p className={`text-xs mt-1 ${unaccounted > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                  Unaccounted
                </p>
              </div>
            </div>
            {unaccounted > 0 && (
              <div className="mt-3 p-3 bg-slate-800/40 rounded-xl flex items-start gap-2">
                <span className="text-amber-500 text-sm flex-shrink-0">!</span>
                <p className="text-slate-400 text-xs">
                  <strong className="text-slate-300">{unaccounted}</strong> student(s) were
                  physically detected in the room but not identified by AI. They may appear in
                  the <strong className="text-slate-300">Absent</strong> list below — the teacher
                  can search and manually mark them present.
                </p>
              </div>
            )}
          </div>

          {/* ── Two-column: Present + Absent ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* PRESENT */}
            <div className="card">
              <h2 className="font-semibold text-slate-200 mb-5 flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Present ({recognized})
              </h2>

              {recognized === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  No students recognized yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {(session.students_present || []).map((s) => {
                    const conf      = s.avg_similarity ? (s.avg_similarity * 100).toFixed(1) : null;
                    const confColor = !conf ? 'text-slate-500'
                      : conf >= 80 ? 'text-emerald-400'
                      : conf >= 65 ? 'text-amber-400'
                      : 'text-red-400';

                    return (
                      <div key={s.student_id}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group">

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {s.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-200 text-sm truncate">{s.name}</p>
                          <p className="text-slate-500 text-xs mono">{s.student_id}</p>
                        </div>

                        {/* Confidence */}
                        {conf && (
                          <span className={`text-xs font-bold mono flex-shrink-0 ${confColor}`}>
                            {conf}%
                          </span>
                        )}

                        {/* Badge */}
                        <span className={`flex-shrink-0 ${s.marked_by === 'manual' ? 'badge-yellow' : 'badge-blue'}`}>
                          {s.marked_by === 'manual' ? 'Manual' : 'AI'}
                        </span>

                        {/* Mark absent on hover */}
                        <button
                          onClick={() => markAbsent(s)}
                          disabled={marking === s.student_id}
                          title="Mark Absent"
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs ml-1 flex-shrink-0"
                        >
                          {marking === s.student_id ? <div className="spinner" /> : '✕'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ABSENT — MANUAL OVERRIDE */}
            <div className="card border-red-900/20">
              <h2 className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <span className="text-red-400">✕</span>
                Absent ({absentStudents.length})
              </h2>
              <p className="text-slate-500 text-xs mb-4">
                Student physically present but listed here? Search their name and click
                <span className="text-emerald-400 font-semibold"> Mark Present</span>.
              </p>

              {/* Search */}
              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or student ID…"
                  className="input pl-9 py-2 text-sm"
                />
              </div>

              {filteredAbsent.length === 0 ? (
                <div className="text-center py-8">
                  {search ? (
                    <p className="text-slate-500 text-sm">No student found for "{search}"</p>
                  ) : absentStudents.length === 0 ? (
                    <div>
                      <p className="text-emerald-400 text-xl mb-1">✓</p>
                      <p className="text-emerald-600 text-sm">All enrolled students are present!</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredAbsent.map(s => (
                    <div key={s.student_id}
                      className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors">

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold flex-shrink-0">
                        {s.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-300 text-sm truncate">{s.name}</p>
                        <p className="text-slate-500 text-xs mono">{s.student_id}</p>
                      </div>

                      {/* Mark Present */}
                      <button
                        onClick={() => markPresent(s)}
                        disabled={marking === s.student_id}
                        className="btn-success text-xs py-1.5 px-3 flex-shrink-0"
                      >
                        {marking === s.student_id
                          ? <div className="spinner" />
                          : '✓ Mark Present'
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          {session.processing_time && (
            <div className="flex items-center justify-between text-xs text-slate-700 px-1">
              <span>Processed in {session.processing_time.toFixed(1)}s</span>
              <span className="mono">{session.session_id}</span>
            </div>
          )}

        </>
      )}
    </div>
  );
}
