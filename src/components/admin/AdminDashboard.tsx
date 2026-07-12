import { useState, useEffect } from 'react'; 
import { motion } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LogOut, LayoutDashboard, BookOpen, Activity, History,
  Package, Users, Shield, Menu, X, UserCheck, BarChart3
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import QuestionManager from './QuestionManager';
import LiveScoreMonitor from './LiveScoreMonitor';
import ExamHistoryMonitor from './ExamHistoryMonitor'; 
import PackageManager from './PackageManager';
import ManageAdmins from './ManageAdmins';
import ManageParticipants from './ManageParticipants';
import ExamReview from '../exam/ExamReview';
import ParticipantDiagnostic from './ParticipantDiagnostic';
// 🌟 1. IMPORT HALAMAN PEMBAHASAN KELAS DI SINI
import ClassReviewMode from './ClassReviewMode'; 

type TabPath = 'overview' | 'packages' | 'questions' | 'participants' | 'diagnostic' | 'results' | 'live' | 'admins';

interface DashboardStats {
  totalQuestions: number;
  totalParticipants: number;
  totalResults: number;
  pendingAdmins: number;
  pendingParticipants: number;
}

export default function AdminDashboard() {
  const { state, signOut } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const profile = state.profile;
  const isSuperAdmin = profile?.role === 'super_admin';

  const currentSubPath = location.pathname.split('/admin/')[1] || 'overview';

  const allTabs: { id: TabPath; label: string; icon: React.ElementType; superAdminOnly?: boolean }[] = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'packages', label: 'Paket Ujian', icon: Package },
    { id: 'questions', label: 'Kelola Soal', icon: BookOpen },
    { id: 'participants', label: 'Peserta', icon: Users },
    { id: 'diagnostic', label: 'Diagram Kompetensi', icon: BarChart3 },
    { id: 'results', label: 'Hasil Ujian', icon: History },
    { id: 'live', label: 'Monitor Live', icon: Activity },
    { id: 'admins', label: 'Kelola Admin', icon: Shield, superAdminOnly: true },
  ];
  
  const tabs = allTabs.filter((t) => !t.superAdminOnly || isSuperAdmin);

  const handleTabChange = (targetPath: TabPath) => {
    if (targetPath === 'overview') {
      navigate('/admin');
    } else {
      navigate(`/admin/${targetPath}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1e3a8a] text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span 
              className="text-white font-extrabold text-lg cursor-pointer"
              onClick={() => handleTabChange('overview')}
            >
              LESKD.ID
            </span>
            <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-blue-200 text-sm truncate max-w-[160px]">{profile?.full_name}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-white/10 overflow-x-auto">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => {
              // Highlight aktif untuk sub-path, termasuk saat membuka mode proyektor
              const isActive = currentSubPath === tab.id || 
                               (tab.id === 'results' && currentSubPath.startsWith('results')) || 
                               (tab.id === 'diagnostic' && currentSubPath.startsWith('diagnostic')) ||
                               (tab.id === 'packages' && currentSubPath.startsWith('pembahasan-kelas'));
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap
                    ${isActive
                      ? 'text-white border-[#10b981]'
                      : 'text-blue-300 border-transparent hover:text-white'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <motion.div
          key={currentSubPath}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Routes>
            <Route path="/" element={<AdminOverview onNavigate={handleTabChange} isSuperAdmin={isSuperAdmin} />} />
            <Route path="packages" element={<PackageManager />} />
            
            {/* 🌟 2. DAFTARKAN RUTE PEMBAHASAN KELAS DI DALAM DASHBOARD ADMIN */}
            <Route path="pembahasan-kelas/:packageId" element={<ClassReviewMode />} />

            <Route path="questions" element={<QuestionManager />} />
            <Route path="participants" element={<ManageParticipants />} />
            <Route path="diagnostic" element={<ParticipantDiagnostic />} />
            <Route path="results" element={<ExamHistoryMonitor />} />
            <Route path="results/review" element={<ExamReview />} />
            <Route path="live" element={<LiveScoreMonitor />} />
            <Route 
              path="admins" 
              element={isSuperAdmin ? <ManageAdmins /> : <Navigate to="/admin" replace />} 
            />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  );
}

function AdminOverview({ onNavigate, isSuperAdmin }: { onNavigate: (tab: TabPath) => void; isSuperAdmin: boolean }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalQuestions: 0,
    totalParticipants: 0,
    totalResults: 0,
    pendingAdmins: 0,
    pendingParticipants: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [q, p, r, pa, pp] = await Promise.all([
          supabase.from('questions').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'participant').eq('is_approved', true),
          supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
          isSuperAdmin
            ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_approved', false)
            : Promise.resolve({ count: 0 }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'participant').eq('is_approved', false),
        ]);
        
        if (isMounted) {
          setStats({
            totalQuestions: q.count ?? 0,
            totalParticipants: p.count ?? 0,
            totalResults: r.count ?? 0,
            pendingAdmins: pa.count ?? 0,
            pendingParticipants: pp.count ?? 0,
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("Gagal memperbarui ringkasan:", err);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [isSuperAdmin]);

  const statCards = [
    { label: 'Total Soal', value: loading ? '...' : stats.totalQuestions.toString(), tab: 'questions' as TabPath },
    { label: 'Peserta Aktif', value: loading ? '...' : stats.totalParticipants.toString(), tab: 'participants' as TabPath },
    { label: 'Total Hasil Ujian', value: loading ? '...' : stats.totalResults.toString(), tab: 'results' as TabPath },
    { label: 'Peserta Pending', value: loading ? '...' : stats.pendingParticipants.toString(), tab: 'participants' as TabPath },
  ];

  return (
    <div className="space-y-6">
      {(stats.pendingParticipants > 0 || (isSuperAdmin && stats.pendingAdmins > 0)) && (
        <div className="space-y-2">
          {isSuperAdmin && stats.pendingAdmins > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onNavigate('admins')}
              className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left hover:bg-amber-100 transition-colors"
            >
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">{stats.pendingAdmins} Admin menunggu persetujuan</p>
                <p className="text-xs text-amber-600">Klik untuk tinjau dan setujui akun Admin baru</p>
              </div>
              <UserCheck className="w-4 h-4 text-amber-600" />
            </motion.button>
          )}
          {stats.pendingParticipants > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => onNavigate('participants')}
              className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-left hover:bg-blue-100 transition-colors"
            >
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">{stats.pendingParticipants} Peserta menunggu persetujuan</p>
                <p className="text-xs text-blue-600">Klik untuk tinjau dan aktifkan akun Peserta baru</p>
              </div>
              <UserCheck className="w-4 h-4 text-blue-600" />
            </motion.button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => onNavigate(stat.tab)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md transition-shadow"
          >
            <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onNavigate('packages')}
          className="bg-gradient-to-br from-[#1e3a8a] to-blue-700 rounded-3xl p-6 text-white hover:shadow-lg transition-shadow text-left"
        >
          <Package className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="text-xl font-bold mb-1">Paket Ujian</h3>
          <p className="text-blue-200 text-sm">Buat dan kelola paket tryout beserta token akses</p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => onNavigate('questions')}
          className="bg-gradient-to-br from-[#10b981] to-emerald-600 rounded-3xl p-6 text-white hover:shadow-lg transition-shadow text-left"
        >
          <BookOpen className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="text-xl font-bold mb-1">Kelola Soal</h3>
          <p className="text-emerald-100 text-sm">Tambah, edit, dan atur soal ujian per kategori</p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => onNavigate('live')}
          className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-6 text-white hover:shadow-lg transition-shadow text-left"
        >
          <Activity className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="text-xl font-bold mb-1">Monitor Live</h3>
          <p className="text-rose-100 text-sm">Pantau peserta yang sedang mengerjakan ujian</p>
        </motion.button>
      </div>
    </div>
  );
}
