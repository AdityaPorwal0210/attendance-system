import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceAPI } from '../services/api';
import { toast } from 'react-toastify';

const STATUS = { completed: 'badge-green', processing: 'badge-yellow', failed: 'badge-red' };

export default function Reports() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    attendanceAPI.getSessions()
      .then(r => setSessions(r.data.data || []))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter(s =>
    s.class_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.instructor?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-96"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Attendance Reports</h1>
          <p className="text-slate-500 mt-1 text-sm">{sessions.length} session(s) total</p>
        </div>
        <Link to="/process" className="btn-primary">▶ Process New Video</Link>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by class name or instructor…"
          className="input pl-10" />
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-600 text-4xl mb-3">≡</p>
            <p className="text-slate-400 mb-1">{search ? 'No sessions match your search' : 'No sessions yet'}</p>
            {!search && <Link to="/process" className="btn-primary mt-4">Process First Video</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Class','Date','Instructor','Frames','Present','Rate','Status',''].map(h => (
                    <th key={h} className="pb-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider px-3 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map(s => (
                  <tr key={s.session_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 first:pl-0 font-medium text-slate-200">{s.class_name}</td>
                    <td className="py-3 px-3 text-slate-400 mono text-xs">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-slate-400">{s.instructor || '—'}</td>
                    <td className="py-3 px-3 text-slate-400">{s.frames_analyzed || '—'}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{s.students_present?.length || 0}</td>
                    <td className="py-3 px-3 text-slate-400">{s.statistics?.recognition_rate || '—'}</td>
                    <td className="py-3 px-3"><span className={STATUS[s.status] || 'badge-blue'}>{s.status}</span></td>
                    <td className="py-3 px-3 text-right">
                      <Link to={`/session/${s.session_id}`} className="text-indigo-400 hover:text-indigo-300 font-medium text-xs">
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
