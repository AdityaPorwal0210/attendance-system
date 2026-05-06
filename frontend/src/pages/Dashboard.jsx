import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentsAPI, attendanceAPI } from '../services/api';

const STATUS_BADGE = {
  completed: 'badge-green',
  processing: 'badge-yellow',
  failed: 'badge-red'
};

export default function Dashboard() {
  const [data, setData] = useState({
    students: 0,
    sessions: [],
    loading: true
  });

  useEffect(() => {
    Promise.all([studentsAPI.getAll(), attendanceAPI.getSessions()])
      .then(([s, a]) => setData({
        students: s.data.count || 0,
        sessions: a.data.data || [],
        loading: false
      }))
      .catch(() => setData(d => ({ ...d, loading: false })));
  }, []);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const completed = data.sessions.filter(s => s.status === 'completed').length;
  const processing = data.sessions.filter(s => s.status === 'processing').length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Automated Classroom Attendance System — SGSITS Indore
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Students', value: data.students,        icon: '◉', color: 'text-indigo-400' },
          { label: 'Total Sessions',    value: data.sessions.length, icon: '▶', color: 'text-blue-400'   },
          { label: 'Completed',         value: completed,            icon: '✓', color: 'text-emerald-400' },
          { label: 'Processing',        value: processing,           icon: '◌', color: 'text-amber-400'  },
        ].map((s, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                  {s.label}
                </p>
                <p className="text-3xl font-bold text-slate-100 mt-2">{s.value}</p>
              </div>
              <span className={`text-2xl ${s.color}`}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/enroll"
          className="card-hover group border-indigo-900/50 hover:border-indigo-700/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-xl group-hover:bg-indigo-600/30 transition-colors">
              ◈
            </div>
            <div>
              <p className="font-semibold text-slate-200">Enroll New Student</p>
              <p className="text-slate-500 text-sm">Upload photo, generate face embedding</p>
            </div>
            <span className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
          </div>
        </Link>

        <Link
          to="/process"
          className="card-hover group border-blue-900/50 hover:border-blue-700/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-xl group-hover:bg-blue-600/30 transition-colors">
              ▶
            </div>
            <div>
              <p className="font-semibold text-slate-200">Process Classroom Video</p>
              <p className="text-slate-500 text-sm">AI marks attendance automatically</p>
            </div>
            <span className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
          </div>
        </Link>
      </div>

      {/* Recent Sessions Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-slate-200">Recent Sessions</h2>
          <Link to="/reports" className="text-indigo-400 hover:text-indigo-300 text-sm">
            View all →
          </Link>
        </div>

        {data.sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 text-4xl mb-3">▶</p>
            <p className="text-slate-400 mb-4">No sessions processed yet.</p>
            <Link to="/process" className="btn-primary">Process First Video</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Class', 'Date', 'Instructor', 'Present', 'Status', ''].map(h => (
                  <th
                    key={h}
                    className="pb-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider px-2 first:pl-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.sessions.slice(0, 6).map(s => (
                <tr key={s.session_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-2 first:pl-0 font-medium text-slate-200">{s.class_name}</td>
                  <td className="py-3 px-2 text-slate-400 mono text-xs">
                    {new Date(s.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2 text-slate-400">{s.instructor || '—'}</td>
                  <td className="py-3 px-2 text-slate-300 font-semibold">
                    {s.students_present?.length || 0}
                  </td>
                  <td className="py-3 px-2">
                    <span className={STATUS_BADGE[s.status] || 'badge-blue'}>{s.status}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <Link
                      to={`/session/${s.session_id}`}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                    >
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* How It Works */}
      <div className="card border-slate-800 bg-slate-900/50">
        <h2 className="font-semibold text-slate-300 mb-5 text-sm uppercase tracking-wider">
          How The System Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Enroll Students', desc: 'Upload photo → ArcFace generates 512-d vector',       color: 'bg-indigo-600'  },
            { step: '2', title: 'Upload Video',     desc: 'Upload classroom recording from CCTV or camera',      color: 'bg-blue-600'    },
            { step: '3', title: 'AI Processes',     desc: 'Recognizes faces + YOLO validates total headcount',   color: 'bg-purple-600'  },
            { step: '4', title: 'Review & Export',  desc: 'Resolve unknown faces manually, export CSV report',   color: 'bg-emerald-600' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className={`w-8 h-8 ${s.color} rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {s.step}
              </div>
              <div>
                <p className="font-medium text-slate-300 text-sm">{s.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
