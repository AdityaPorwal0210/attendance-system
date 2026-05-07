import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { path: '/', icon: '⬡', label: 'Dashboard' },
  { path: '/enroll', icon: '◈', label: 'Enroll Student' },
  { path: '/process', icon: '▶', label: 'Process Video' },
  { path: '/reports', icon: '≡', label: 'Reports' },
  { path: '/students', icon: '◉', label: 'Students' },
];

export default function Layout({ children, onLogout }) {
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-lg">🎓</div>
            <div>
              <p className="font-bold text-slate-100 text-sm leading-none">AttendAI</p>
              <p className="text-slate-500 text-xs mt-0.5">SGSITS Indore</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ path, icon, label }) => {
            const active = pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150
                  ${active
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}>
                <span className="text-base w-5 text-center">{icon}</span>
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <p className="text-xs text-slate-600 text-center">Aditya • Aditya • Kalash</p>
          <p className="text-xs text-slate-700 text-center">B.Tech IT 2025-26</p>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-900/20 border border-transparent hover:border-red-900/40 transition-all duration-150"
          >
            <span>⏻</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
