import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Import Komponen Halaman
import LandingPage from './components/auth/LandingPage';
import WaitingRoom from './components/auth/WaitingRoom';
import ParticipantDashboard from './components/participant/ParticipantDashboard';
import { ExamEngine } from './components/exam/ExamEngine';
import { ExamResults } from './components/exam/ExamResults';
import ExamReview from './components/exam/ExamReview';
import AdminDashboard from './components/admin/AdminDashboard';

// ==================================================
// 🛡️ KOMPONEN SATPAM (Mencegah Akses Tanpa Izin)
// ==================================================
function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) {
  const { state } = useApp();

  if (state.authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Memuat Rute...</p>
        </div>
      </div>
    );
  }

  if (!state.profile) {
    return <Navigate to="/" replace />;
  }

  if (!state.profile.is_approved) {
    return <Navigate to="/waiting-room" replace />;
  }

  if (allowedRoles) {
    const userRole = state.profile.role.toLowerCase();
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

// ==================================================
// 🗺️ PEMETAAN RUTE URL (ROUTER)
// ==================================================
function AppRouter() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // ==================================================
  // 🔄 JEMBATAN SINKRONISASI PUSAT (State to URL Bridge)
  // ==================================================
  useEffect(() => {
    const viewToPath: Record<string, string> = {
      'landing': '/',
      'waiting-room': '/waiting-room',
      'participant-dashboard': '/dashboard',
      'exam-engine': '/exam',
      'exam-results': '/exam/results',
      'exam-review': '/exam/review',
      'admin-dashboard': '/admin',
    };

    const targetPath = viewToPath[state.currentView];

    // Proteksi khusus rute admin: Jika sedang membuka sub-menu admin (misal: /admin/live), 
    // jangan paksa browser kembali melompat ke /admin utama.
    if (state.currentView === 'admin-dashboard' && location.pathname.startsWith('/admin')) {
      return;
    }

    // Jika URL saat ini berbeda dengan rute panggung yang aktif, paksa URL mengikuti panggung
    if (targetPath && location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [state.currentView, location.pathname, navigate]);

  const getHomeRoute = () => {
    if (!state.profile) return '/';
    if (!state.profile.is_approved) return '/waiting-room';
    if (state.profile.role.toLowerCase() === 'participant') return '/dashboard';
    return '/admin';
  };

  if (state.authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Menghubungkan...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* --- RUTE PUBLIK --- */}
      <Route 
        path="/" 
        element={!state.profile ? <LandingPage /> : <Navigate to={getHomeRoute()} replace />} 
      />
      <Route 
        path="/waiting-room" 
        element={!state.profile?.is_approved ? <WaitingRoom /> : <Navigate to={getHomeRoute()} replace />} 
      />

      {/* --- RUTE KHUSUS PESERTA (PARTICIPANT) --- */}
      <Route 
        path="/dashboard" 
        element={<ProtectedRoute allowedRoles={['participant']}><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/exam" 
        element={<ProtectedRoute allowedRoles={['participant']}><ExamEngine /></ProtectedRoute>} 
      />
      <Route 
        path="/exam/results" 
        element={<ProtectedRoute allowedRoles={['participant']}><ExamResults /></ProtectedRoute>} 
      />

      {/* --- RUTE GABUNGAN (BISA PESERTA & ADMIN) --- */}
      <Route 
        path="/exam/review" 
        element={<ProtectedRoute><ExamReview /></ProtectedRoute>} 
      />

      {/* --- RUTE KHUSUS ADMIN --- */}
      <Route 
        path="/admin/*" 
        element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} 
      />

      {/* --- RUTE NYASAR (404 Fallback) --- */}
      <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
    </Routes>
  );
}

// ==================================================
// 🚀 ROOT APP
// ==================================================
export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </BrowserRouter>
  );
}
