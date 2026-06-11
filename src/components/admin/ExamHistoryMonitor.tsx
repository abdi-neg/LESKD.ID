import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Search, Filter, TrendingUp, CheckCircle, 
  XCircle, Clock, Trash2, Undo, ArrowLeft, Loader2, AlertCircle, BookOpen 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface HistoryRecord {
  id: string;
  participant_name: string;
  exam_type: 'TIU' | 'TWK' | 'TKP' | 'FULL';
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

  async function handleSoftDelete(id: string) {
    if (!confirm('Pindahkan riwayat ujian peserta ini ke keranjang sampah?')) return;
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

  const filtered = records.filter((h) => {
    const matchName = h.participant_name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || h.exam_type === filterType;
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
      case 'TIU': return 'bg-blue-100 text-blue-700';
      case 'TWK': return 'bg-emerald-100 text-emerald-700';
      case 'TKP': return 'bg-rose-100 text-rose-700';
      case 'FULL': return 'bg-[#1e3a8a]/10 text-[#1e3a8a]';
      default: return 'bg-gray-100 text-gray-700';
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
            {showTrash ? 'Daftar riwayat ujian terhapus yang bisa Anda pulihkan' : 'Monitor semua ujian live yang telah selesai'}
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
          className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex gap-3 items-center text-sm font-medium"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Anda sedang membuka mode berkas sampah. Menghapus data di daftar utama tidak akan merusak kestabilan platform karena data dapat dikembalikan kapan saja dari sini.</span>
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
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Peserta</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Jenis Ujian</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right w-44">Skor</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Waktu</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((record, i) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a8a] to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {record.participant_name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{record.participant_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getExamTypeColor(record.exam_type)}`}>
                        {record.exam_type}
                      </span>
                    </td>
                    
                    {/* 🌟 PERBAIKAN: RE-DESIGN TOTAL DETAIL SCORE ROW (Jauh Lebih Rapi & Profesional) */}
                    <td className="px-5 py-4 text-right">
                      <div className="text-base font-black text-gray-900 tracking-tight">{record.total_score}</div>
                      {record.exam_type === 'FULL' ? (
                        <div className="flex items-center gap-1 justify-end mt-1.5 text-[10px] font-extrabold tracking-wide">
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/60">
                            TIU <span className="font-black ml-0.5">{record.score_tiu}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                            TWK <span className="font-black ml-0.5">{record.score_twk}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100/60">
                            TKP <span className="font-black ml-0.5">{record.score_tkp}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium inline-block mt-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          Mini Paket
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                        ${record.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {record.passed ? (
                          <><CheckCircle className="w-3 h-3" /> Lulus</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Belum</>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(record.duration_seconds)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {formatDate(record.completed_at)}
                    </td>
                    
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!showTrash && (
                          <button
                            onClick={() => dispatch({ type: 'OPEN_REVIEW', payload: record.id })}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1 shadow-sm"
                            title="Lihat Detail Pembahasan & Lembar Jawaban Peserta"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Pembahasan</span>
                          </button>
                        )}
                        
                        {showTrash ? (
                          <button
                            disabled={actionId === record.id}
                            onClick={() => handleRestore(record.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1 disabled:opacity-40"
                          >
                            {actionId === record.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Undo className="w-3 h-3" />
                            )}
                            <span>Pulihkan</span>
                          </button>
                        ) : (
                          <button
                            disabled={actionId === record.id}
                            onClick={() => handleSoftDelete(record.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors inline-flex items-center disabled:opacity-40 shadow-sm"
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
