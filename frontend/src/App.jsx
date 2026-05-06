import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EnrollStudent from './pages/EnrollStudent';
import ProcessVideo from './pages/ProcessVideo';
import Reports from './pages/Reports';
import Students from './pages/Students';
import SessionDetail from './pages/SessionDetail';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/enroll" element={<EnrollStudent />} />
          <Route path="/process" element={<ProcessVideo />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/students" element={<Students />} />
          <Route path="/session/:id" element={<SessionDetail />} />
        </Routes>
      </Layout>
      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
    </Router>
  );
}
