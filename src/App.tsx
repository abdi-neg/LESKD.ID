import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Import Komponen Halaman
import LandingPage from './components/auth/LandingPage';
import WaitingRoom from './components/auth/WaitingRoom';
import UpdatePassword from './components/auth/UpdatePassword'; // 🌟 TAMBAHKAN IMPORT INI
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
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Deteksi apakah aplikasi sedang dalam proses memulihkan data ujian dari database
  const isResumingExam = location.pathname === '/exam' && 
                         localStorage.getItem('exam_active_session_id') && 
                         !state.examSession;

  // ==================================================
  // 🔄 JEMBATAN SINKRONISASI PUSAT (Dua Arah & Anti-Gagal)
  // ==================================================
  
  // Efek A: URL Membimbing State (Saat reload / history browser dibuka)
  useEffect(() => {
    if (state.authLoading || !state.profile) return;

    const currentPath = location.pathname;

    if (currentPath === '/exam' && state.currentView !== 'exam-engine') {
      const activeSessionId = localStorage.getItem('exam_active_session_id');
      if (activeSessionId) {
        dispatch({ type: 'SET_VIEW', payload: 'exam-engine' });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }

    if (currentPath === '/exam/review' && state.currentView !== 'exam-review') {
      const savedReviewId = localStorage.getItem('leskd_saved_review_id');
      if (savedReviewId) {
        dispatch({ type: 'SET_VIEW', payload: 'exam-review' });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location.pathname, state.authLoading, state.profile, dispatch, navigate, state.currentView]);


  // Efek B: State Membimbing URL (Navigasi Tombol Internal Aplikasi)
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

    if (state.currentView === 'admin-dashboard' && location.pathname.startsWith('/admin')) {
      return;
    }

    // 🌟 SABUK PENGAMAN UTAMA: Jika user mengakses link reset password dari Gmail, hentikan paksaan redirect otomatis!
    if (location.pathname === '/update-password') {
      return;
    }

    if (targetPath && location.pathname !== targetPath) {
      if (location.pathname === '/exam' && localStorage.getItem('exam_active_session_id')) {
        return;
      }
      navigate(targetPath, { replace: true });
    }
  }, [state.currentView, location.pathname, navigate]);

  const getHomeRoute = () => {
    if (!state.profile) return '/';
    if (!state.profile.is_approved) return '/waiting-room';
    if (state.profile.role.toLowerCase() === 'participant') return '/dashboard';
    return '/admin';
  };

  // Sabuk Pengaman: Jika sedang loading auth ATAU sedang mengambil data soal resume, kunci di layar loading
  if (state.authLoading || isResumingExam) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">
            {isResumingExam ? "Memulihkan sesi ujian Anda..." : "Menghubungkan..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={!state.profile ? <LandingPage /> : <Navigate to={getHomeRoute()} replace />} 
      />
      
      {/* ─── 🌟 RUTE PUBLIK: FORM PENGISIAN KATA SANDI BARU ─── */}
      <Route 
        path="/update-password" 
        element={<UpdatePassword />} 
      />

      <Route 
        path="/waiting-room" 
        element={!state.profile?.is_approved ? <WaitingRoom /> : <Navigate to={getHomeRoute()} replace />} 
      />

      {/* --- RUTE KHUSUS PESERTA --- */}
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

      {/* --- RUTE GABUNGAN --- */}
      <Route 
        path="/exam/review" 
        element={<ProtectedRoute><ExamReview /></ProtectedRoute>} 
      />

      {/* --- RUTE KHUSUS ADMIN --- */}
      <Route 
        path="/admin/*" 
        element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} 
      />

      {/* --- FALLBACK RUTE NYASAR --- */}
      <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </BrowserRouter>
  );
}
