import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

import ErrorBoundary from './components/common/ErrorBoundary';
import LandingPage from './components/auth/LandingPage';
import WaitingRoom from './components/auth/WaitingRoom';
import UpdatePassword from './components/auth/UpdatePassword';
import ParticipantDashboard from './components/participant/ParticipantDashboard';
import { ExamEngine } from './components/exam/ExamEngine';
import { ExamResults } from './components/exam/ExamResults';
import ExamReview from './components/exam/ExamReview';
import AdminDashboard from './components/admin/AdminDashboard';
import ClassReviewMode from './components/admin/ClassReviewMode';

const APP_CACHE_VERSION = '2026.11.24-v1';

// ==================================================
// PENJAGA VERSI & ANTI STALE-CHUNK VERCEL
// ==================================================
function useAutoUpdateGuard() {
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem('leskd_app_version');
      if (savedVersion !== APP_CACHE_VERSION) {
        const keysToClean: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith('sb-')) continue;
          if (k === 'exam_active_session_id') continue;
          if (k === 'leskd_saved_review_id') continue;
          if (k.includes('snapshot')) {
            keysToClean.push(k);
          }
        }
        keysToClean.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem('leskd_app_version', APP_CACHE_VERSION);
      }
    } catch {
      // Abaikan jika storage dibatasi
    }

    const triggerSafeReload = () => {
      const reloadKey = 'leskd_chunk_reloaded';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    };

    const handlePreloadError = (event: Event) => {
      event.preventDefault();
      triggerSafeReload();
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event?.reason?.message ?? event?.reason ?? '');
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ? true :
        msg.includes('Importing a module script failed') ? true :
        msg.includes('Loading chunk') ? true :
        msg.includes('ChunkLoadError');

      if (isChunkError) {
        triggerSafeReload();
      }
    };

    window.addEventListener('vite:preloadError', handlePreloadError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('vite:preloadError', handlePreloadError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);
}

// ==================================================
// KOMPONEN SATPAM (Mencegah Akses Tanpa Izin)
// ==================================================
function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: string[] }) {
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
      return <Navigate to={userRole === 'participant' ? '/dashboard' : '/admin'} replace />;
    }
  }

  return children;
}

// ==================================================
// PEMETAAN RUTE URL (ROUTER) — STAY ON PAGE SAAT REFRESH
// ==================================================
function AppRouter() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const prevViewRef = useRef<string>(state.currentView);
  const [resumeTimedOut, setResumeTimedOut] = useState(false);

  const isResumingExam =
    location.pathname === '/exam' &&
    Boolean(localStorage.getItem('exam_active_session_id')) &&
    !state.examSession;

  useEffect(() => {
    if (!isResumingExam) {
      setResumeTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setResumeTimedOut(true), 7000);
    return () => clearTimeout(timer);
  }, [isResumingExam]);

  // Efek A: URL Membimbing State (Saat Refresh / Navigasi Menu Admin / Tombol Back Browser)
  useEffect(() => {
    if (state.authLoading) return;
    if (!state.profile) return;

    const currentPath = location.pathname;

    // PERBAIKAN BUG: Jika Admin pindah dari /admin/results/review ke menu admin lain (misal /admin/questions),
    // segera reset currentView ke 'admin-dashboard' agar tidak ditarik ke rute /exam/review
    if (
      currentPath.startsWith('/admin') &&
      !currentPath.startsWith('/admin/results/review') &&
      state.currentView === 'exam-review'
    ) {
      try {
        localStorage.removeItem('leskd_saved_review_id');
      } catch {
        // Abaikan
      }
      dispatch({ type: 'SET_VIEW', payload: 'admin-dashboard' });
      return;
    }

    if (currentPath === '/exam' && state.currentView !== 'exam-engine') {
      const activeSessionId = localStorage.getItem('exam_active_session_id');
      if (activeSessionId) {
        dispatch({ type: 'SET_VIEW', payload: 'exam-engine' });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    if (currentPath === '/exam/results' && !state.examSession) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (currentPath === '/exam/review') {
      const params = new URLSearchParams(location.search);
      const urlReviewId = params.get('id');
      const savedReviewId = urlReviewId ? urlReviewId : localStorage.getItem('leskd_saved_review_id');

      if (savedReviewId) {
        localStorage.setItem('leskd_saved_review_id', savedReviewId);
        const currentReviewId = (state as any).reviewResultId;
        if (state.currentView !== 'exam-review' ? true : currentReviewId !== savedReviewId) {
          dispatch({ type: 'OPEN_REVIEW', payload: savedReviewId });
        }
      } else if (!state.examSession) {
        const home = state.profile.role.toLowerCase() === 'participant' ? '/dashboard' : '/admin/results';
        navigate(home, { replace: true });
      }
    }
  }, [
    location.pathname,
    location.search,
    state.authLoading,
    state.profile,
    state.examSession,
    state.currentView,
    dispatch,
    navigate
  ]);

  // Efek B: State Membimbing URL
  useEffect(() => {
    if (state.authLoading) return;
    if (location.pathname === '/update-password') return;

    const previousView = prevViewRef.current;
    prevViewRef.current = state.currentView;

    // PENGAMAN UTAMA ADMIN: Jika Admin berada di rute /admin/* mana pun,
    // biarkan AdminDashboard yang mengatur sub-rute dan jangan pernah alihkan ke /exam/review full-screen
    const isAdminUser = state.profile ? state.profile.role.toLowerCase() !== 'participant' : false;
    if (isAdminUser && location.pathname.startsWith('/admin')) {
      return;
    }

    const isInitialHydration = previousView === 'landing' && Boolean(state.profile);
    if (isInitialHydration) {
      if (location.pathname.startsWith('/admin')) return;
      if (location.pathname === '/exam/review') return;
      if (location.pathname === '/exam' && Boolean(localStorage.getItem('exam_active_session_id'))) return;
      if (location.pathname === '/dashboard' && state.profile?.role.toLowerCase() === 'participant') return;
    }

    if (state.currentView === 'admin-dashboard' && location.pathname.startsWith('/admin')) {
      return;
    }

    if (state.currentView === 'exam-review') {
      const reviewId = (state as any).reviewResultId ?? localStorage.getItem('leskd_saved_review_id');
      if (reviewId) {
        localStorage.setItem('leskd_saved_review_id', String(reviewId));
        const targetReviewUrl = `/exam/review?id=${encodeURIComponent(String(reviewId))}`;
        const currentFullUrl = `${location.pathname}${location.search}`;
        if (currentFullUrl !== targetReviewUrl) {
          navigate(targetReviewUrl, { replace: true });
        }
      } else if (location.pathname !== '/exam/review') {
        navigate('/exam/review', { replace: true });
      }
      return;
    }

    const viewToPath: Record<string, string> = {
      landing: '/',
      'waiting-room': '/waiting-room',
      'participant-dashboard': '/dashboard',
      'exam-engine': '/exam',
      'exam-results': '/exam/results',
      'admin-dashboard': '/admin',
    };

    const targetPath = viewToPath[state.currentView];
    if (targetPath && location.pathname !== targetPath) {
      if (location.pathname === '/exam' && Boolean(localStorage.getItem('exam_active_session_id'))) {
        return;
      }
      navigate(targetPath, { replace: true });
    }
  }, [state.currentView, state.authLoading, state.profile, location.pathname, location.search, navigate]);

  const getHomeRoute = () => {
    if (!state.profile) return '/';
    if (!state.profile.is_approved) return '/waiting-room';
    if (state.profile.role.toLowerCase() === 'participant') return '/dashboard';
    return '/admin';
  };

  if (state.authLoading ? true : isResumingExam) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">
            {isResumingExam ? 'Memulihkan sesi ujian Anda...' : 'Menghubungkan...'}
          </p>
          {resumeTimedOut && (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('exam_active_session_id');
                navigate('/dashboard', { replace: true });
              }}
              className="mt-5 px-4 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors"
            >
              Kembali ke Dashboard
            </button>
          )}
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

      <Route
        path="/update-password"
        element={<UpdatePassword />}
      />

      <Route
        path="/waiting-room"
        element={!state.profile?.is_approved ? <WaitingRoom /> : <Navigate to={getHomeRoute()} replace />}
      />

      {/* RUTE KHUSUS PESERTA */}
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

      {/* RUTE GABUNGAN */}
      <Route
        path="/exam/review"
        element={<ProtectedRoute><ExamReview /></ProtectedRoute>}
      />

      {/* RUTE KHUSUS ADMIN */}
      <Route
        path="/admin/pembahasan-kelas/:packageId"
        element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><ClassReviewMode /></ProtectedRoute>}
      />

      <Route
        path="/admin/*"
        element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>}
      />

      <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
    </Routes>
  );
}

export default function App() {
  useAutoUpdateGuard();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <AppRouter />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
