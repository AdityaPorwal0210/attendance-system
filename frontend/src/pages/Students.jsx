import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentsAPI } from '../services/api';
import { toast } from 'react-toastify';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetch = () => {
    studentsAPI.getAll()
      .then(r => setStudents(r.data.data || []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the system?`)) return;
    setDeleting(id);
    try {
      await studentsAPI.delete(id);
      toast.success(`${name} removed`);
      fetch();
    } catch { toast.error('Failed to remove student'); }
    finally { setDeleting(null); }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  const COLORS = ['from-indigo-600 to-purple-700', 'from-blue-600 to-cyan-700',
    'from-emerald-600 to-teal-700', 'from-orange-600 to-red-700', 'from-pink-600 to-rose-700'];

  if (loading) return <div className="flex items-center justify-center h-96"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Enrolled Students</h1>
          <p className="text-slate-500 mt-1 text-sm">{students.length} student(s) in database</p>
        </div>
        <Link to="/enroll" className="btn-primary">◈ Enroll New Student</Link>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or student ID…" className="input pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-600 text-4xl mb-3">◉</p>
          <p className="text-slate-400 mb-1">{search ? 'No students match your search' : 'No students enrolled yet'}</p>
          {!search && <Link to="/enroll" className="btn-primary mt-4">Enroll First Student</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s, i) => (
            <div key={s.student_id} className="card-hover group">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${COLORS[i % COLORS.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 truncate">{s.name}</p>
                  <p className="text-slate-500 text-xs mono mt-0.5">{s.student_id}</p>
                  {s.email && <p className="text-slate-600 text-xs truncate mt-0.5">{s.email}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                <span className="badge-green">Active</span>
                <div className="flex items-center gap-2">
                  <p className="text-slate-600 text-xs">
                    {new Date(s.enrollment_date || s.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => handleDelete(s.student_id, s.name)}
                    disabled={deleting === s.student_id}
                    className="text-slate-700 hover:text-red-500 transition-colors text-xs opacity-0 group-hover:opacity-100">
                    {deleting === s.student_id ? '…' : '✕'}
                  </button>
                </div>
              </div>

              {/* Embedding indicator */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full w-full" />
                </div>
                <p className="text-slate-600 text-xs mono flex-shrink-0">512-d ✓</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
