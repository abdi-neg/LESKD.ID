import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Search, Filter, TrendingUp, CheckCircle, 
  XCircle, Clock, Trash2, Undo, ArrowLeft, Loader2, AlertCircle, BookOpen 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface HistoryRecord {
  id: string;
  participant_name: string;
  exam_type: 'TIU' | 'TWK' | 'TKP' | 'FULL' | 'MINI_TIU' | 'MINI_TWK' | 'MINI_TKP';
  total_score: number;
  score_tiu: number;
  score_twk: number;
  score_tkp: number;
  passed: boolean;
  completed_at: string;
  duration_seconds: number;
}

export default function ExamHistoryMonitor() {
  const { dispatch } = useApp(); 
  const navigate = useNavigate(); 
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FULL' | 'TIU' | 'TWK' | 'TKP'>('ALL');
  
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrash, setShowTrash] = useState(false); 
  const [actionId, setActionId] = useState<string | null>(null); 

  async function loadExamHistory() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('status', 'completed')
        .eq('is_deleted', showTrash) 
        .order('completed_at', { ascending: false });

      if (!error && data) {
        const mappedRecords: HistoryRecord[] = data.map((r: any) => ({
          id: r.id,
          participant_name: r.user_name || r.participant_name || 'Peserta',
          exam_type: r.package_type || r.exam_type || 'FULL',
          total_score: r.total_score || 0,
          score_tiu: r.score_tiu || 0,
          score_twk: r.score_twk || 0,
          score_tkp: r.score_tkp || 0,
          passed: r.passed ?? false,
          completed_at: r.completed_at || new Date().toISOString(),
          duration_seconds: r.duration_seconds || 0,
        }));
        setRecords(mappedRecords);
      }
    } catch (err) {
      console.error("Gagal menarik data histori admin:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExamHistory();
  }, [showTrash]);

  // 🌟 SOFT DELETE: Pindah ke keranjang sampah (Otomatis hilang dari layar peserta)
  async function handleSoftDelete(id: string) {
    if (!window.confirm('Pindahkan riwayat ujian peserta ini ke keranjang sampah?')) return;
    setActionId(id);
    
    const { error } = await supabase
      .from('exam_results')
      .update({ is_deleted: true })
      .eq('id', id);

    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== id));
    } else {
      alert('Gagal memindahkan data ke tong sampah.');
    }
    setActionId(null);
  }

  // 🌟 RESTORE: Kembalikan dari keranjang sampah
  async function handleRestore(id: string) {
    setActionId(id);
    
    const { error } = await supabase
      .from('exam_results')
      .update({ is_deleted: false })
      .eq('id', id);

    if (!error) {
      alert('Riwayat ujian peserta berhasil dipulihkan ke daftar utama!');
      setRecords(prev => prev.filter(r => r.id !== id));
    } else {
      alert('Gagal memulihkan data.');
    }
    setActionId(null);
  }

  // 🌟 HARD DELETE: Hapus permanen dari database
  async function handleHardDelete(id: string) {
    if (!window.confirm('PERINGATAN: Apakah Anda yakin ingin membumihanguskan data ujian ini? Data yang dihapus permanen tidak akan bisa dikembalikan lagi.')) return;
    setActionId(id);
    
    const { error } = await supabase
      .from('exam_results')
      .delete()
      .eq('id', id);

    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== id));
    } else {
      alert('Gagal menghapus data secara permanen.');
    }
    setActionId(null);
  }

  const filtered = records.filter((h) => {
    const matchName = h.participant_name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || 
                      h.exam_type === filterType || 
                      h.exam_type === `MINI_${filterType}`;
    return matchName && matchType;
  });

  const stats = {
    totalExams: filtered.length,
    passed: filtered.filter((h) => h.passed).length,
    failed: filtered.filter((h) => !h.passed).length,
    avgScore: filtered.length > 0
      ? Math.round(filtered.reduce((sum, h) => sum + h.total_score, 0) / filtered.length)
      : 0,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}j ${minutes}m`;
    return `${minutes}m`;
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'TIU':
      case 'MINI_TIU': 
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'TWK':
      case 'MINI_TWK': 
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'TKP':
      case 'MINI_TKP': 
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'FULL': 
        return 'bg-gray-100 text-gray-700 border border-gray-200';
      default: 
        return 'bg-gray-50 text-gray-600 border border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {showTrash ? 'Keranjang Sampah Riwayat' : 'Riwayat Ujian Peserta'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {showTrash ? 'Daftar riwayat ujian terhapus yang bisa Anda pulihkan atau buang permanen' : 'Monitor semua ujian live yang telah selesai'}
          </p>
        </div>

        <button
          onClick={() => setShowTrash(!showTrash)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border shadow-sm
            ${showTrash 
              ? 'bg-gray-800 hover:bg-gray-900 text-white border-transparent' 
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}
        >
          {showTrash ? (
            <><ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Utama</>
          ) : (
            <><Trash2 className="w-4 h-4 text-rose-500" /> Buka Keranjang Sampah</>
          )}
        </button>
      </div>

      {/* STRATEGIC VIEW SWITCHER */}
      {!showTrash ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: BarChart3, label: 'Total Ujian', value: loading ? '...' : stats.totalExams, color: 'text-[#1e3a8a]', bg: 'bg-blue-50' },
            { icon: CheckCircle, label: 'Lulus PG', value: loading ? '...' : stats.passed, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
            { icon: XCircle, label: 'Belum Lulus', value: loading ? '...' : stats.failed, color: 'text-red-500', bg: 'bg-red-50' },
            { icon: TrendingUp, label: 'Rata-rata Skor', value: loading ? '...' : stats.avgScore, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex gap-3 items-center text-sm font-medium"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>Anda berada di mode Keranjang Sampah. Klik "Hapus Permanen" untuk melenyapkan data percobaan/dummy dari database selamanya.</span>
        </motion.div>
      )}

      {/* FILTERS PANEL */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama peserta..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {(['ALL', 'FULL', 'TIU', 'TWK', 'TKP'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${filterType === type ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin" />
              <p className="text-sm text-gray-400 font-medium animate-pulse">Menghubungkan ke server Supabase...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
              {showTrash ? 'Keranjang sampah kosong.' : 'Tidak ditemukan riwayat pengerjaan ujian peserta.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-[11px] font-bold uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-4 pl-6">Peserta</th>
                  <th className="px-3 py-4">Jenis</th>
                  <th className="px-3 py-4 text-center">TIU</th>
                  <th className="px-3 py-4 text-center">TWK</th>
                  <th className="px-3 py-4 text-center">TKP</th>
                  <th className="px-4 py-4 text-center border-l border-gray-100 text-gray-700 font-extrabold">TOTAL</th>
                  <th className="px-3 py-4 text-center">Status</th>
                  <th className="px-3 py-4">Durasi</th>
                  <th className="px-3 py-4">Tanggal Pengerjaan</th>
                  <th className="px-5 py-4 pr-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700 bg-white">
                {filtered.map((record, i) => {
                  const isFull = record.exam_type === 'FULL';
                  const isTIU = record.exam_type === 'TIU' || record.exam_type === 'MINI_TIU';
                  const isTWK = record.exam_type === 'TWK' || record.exam_type === 'MINI_TWK';
                  const isTKP = record.exam_type === 'TKP' || record.exam_type === 'MINI_TKP';

                  return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="hover:bg-gray-50/30 transition-colors"
                    >
                      {/* Nama Peserta */}
                      <td className="px-5 py-3.5 pl-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-gradient-to-br from-[#1e3a8a] to-blue-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                            {record.participant_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800 max-w-[140px] truncate">{record.participant_name}</span>
                        </div>
                      </td>
                      
                      {/* Jenis Paket */}
                      <td className="px-3 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getExamTypeColor(record.exam_type)}`}>
                          {record.exam_type}
                        </span>
                      </td>
                      
                      {/* SKOR TIU */}
                      <td className="px-3 py-3.5 text-center text-sm font-medium text-gray-600">
                        {isFull || isTIU ? record.score_tiu : <span className="text-gray-300">-</span>}
                      </td>

                      {/* SKOR TWK */}
                      <td className="px-3 py-3.5 text-center text-sm font-medium text-gray-600">
                        {isFull || isTWK ? record.score_twk : <span className="text-gray-300">-</span>}
                      </td>

                      {/* SKOR TKP */}
                      <td className="px-3 py-3.5 text-center text-sm font-medium text-gray-600">
                        {isFull || isTKP ? record.score_tkp : <span className="text-gray-300">-</span>}
                      </td>

                      {/* SKOR TOTAL */}
                      <td className="px-4 py-3.5 text-center text-sm font-bold text-[#1e3a8a] bg-blue-50/20 border-l border-gray-100">
                        {record.total_score}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full
                          ${record.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-rose-50 text-rose-700 border border-rose-200/50'}`}>
                          {record.passed ? (
                            <><CheckCircle className="w-3 h-3" /> Lulus</>
                          ) : (
                            <><XCircle className="w-3 h-3" /> Belum</>
                          )}
                        </div>
                      </td>
                      
                      {/* Durasi */}
                      <td className="px-3 py-3.5 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatDuration(record.duration_seconds)}
                        </div>
                      </td>
                      
                      {/* Tanggal */}
                      <td className="px-3 py-3.5 text-xs text-gray-400 font-medium">
                        {formatDate(record.completed_at)}
                      </td>
                      
                      {/* Tombol Aksi */}
                      <td className="px-5 py-3.5 pr-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!showTrash && (
                            <button
                              onClick={() => {
                                dispatch({ type: 'OPEN_REVIEW', payload: record.id });
                                navigate('/admin/results/review');
                              }}
                              className="px-2 py-1 bg-[#1e3a8a] hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="Tinjau Pembahasan Peserta"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Tinjau</span>
                            </button>
                          )}
                          
                          {showTrash ? (
                            <>
                              {/* Tombol Restore */}
                              <button
                                disabled={actionId === record.id}
                                onClick={() => handleRestore(record.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 disabled:opacity-40 border border-emerald-200"
                              >
                                {actionId === record.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo className="w-3 h-3" />}
                                <span>Pulihkan</span>
                              </button>
                              
                              {/* Tombol Hard Delete */}
                              <button
                                disabled={actionId === record.id}
                                onClick={() => handleHardDelete(record.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 disabled:opacity-40 border border-rose-200"
                              >
                                {actionId === record.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                <span>Hapus Permanen</span>
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={actionId === record.id}
                              onClick={() => handleSoftDelete(record.id)}
                              className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors inline-flex items-center border border-gray-200 hover:border-rose-200 disabled:opacity-40"
                              title="Pindahkan ke Kotak Sampah"
                            >
                              {actionId === record.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
