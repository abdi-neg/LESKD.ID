import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './components/auth/LandingPage';
import WaitingRoom from './components/auth/WaitingRoom';
import ParticipantDashboard from './components/participant/ParticipantDashboard';

// 🔑 PERBAIKAN: Menggunakan Named Import { } untuk mencegah nilai undefined pada komponen ujian
import { ExamEngine } from './components/exam/ExamEngine';
import { ExamResults } from './components/exam/ExamResults';
import { ExamReview } from './components/exam/ExamReview';

import AdminDashboard from './components/admin/AdminDashboard';

function AppRouter() {
  const { state } = useApp();

  if (state.authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  switch (state.currentView) {
    case 'landing':
      return <LandingPage />;
    case 'waiting-room':
      return <WaitingRoom />;
    case 'participant-dashboard':
      return <ParticipantDashboard />;
    case 'exam-engine':
      return <ExamEngine />;
    case 'exam-results':
      return <ExamResults />;
    case 'exam-review':
      return <ExamReview />;
    case 'admin-dashboard':
      return <AdminDashboard />;
    default:
      return <LandingPage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
