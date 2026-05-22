import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { 
  History, Search, Calendar, Award, CheckCircle, 
  XCircle, Clock, FileText, ChevronRight, Trash2 
} from 'lucide-react';

interface ExamResultRow {
  id: string;
  user_id: string;
  package_id: string | null;
  exam_type: 'TIU' | 'TWK' | 'TKP' | 'FULL';
  score_tiu: number;
  score_twk: number;
  score_tkp: number;
  score_total: number;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  exam_packages: {
    name: string;
  } | null;
}

export default function MasterResults() {
  const { dispatch, deleteHistory } = useApp();
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Load data riwayat ujian dari Supabase
  async function loadResults() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          id,
          user_id,
          package_id,
          exam_type,
          score_tiu,
          score_twk,
          score_tkp,
          score_total,
          created_at,
          profiles (full_name, email),
          exam_packages (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults((data as any) || []);
    } catch (err) {
      console.error('Gagal memuat riwayat ujian:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  // 🚀 LOGIKA UTAMA: Fungsi hapus riwayat ujian
  const handleDeleteResult = async (resultId: string, participantName: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus riwayat ujian dari "${participantName}"?\n\nTindakan ini bersifat permanen dan akan menghapus data di database serta berkas lokal.`
    );

    if (!confirmDelete) return;

    const success = await deleteHistory(resultId);
    if (success) {
      alert("Riwayat ujian berhasil dihapus secara permanen!");
      // Filter out data dari state agar baris tabel langsung hilang otomatis
      setResults((prev) => prev.filter((item) => item.id !== resultId));
    } else {
      alert("Gagal menghapus data riwayat. Silakan coba kembali.");
    }
  };

  // Filter pencarian dan kategori
  const filteredResults = results.filter((r) => {
    const fullName = r.profiles?.full_name?.toLowerCase() ?? '';
    const email = r.profiles?.email?.toLowerCase() ?? '';
    const packageName = r.exam_packages?.name?.toLowerCase() ?? '';
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) || 
      email.includes(searchTerm.toLowerCase()) ||
      packageName.includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || r.exam_type === filterType;

    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <History className="w-6 h-6 text-[#1e3a8a]" />
          Master Hasil Ujian Peserta
        </h1>
        <p className="text-gray-500 text-sm mt-1">Daftar rekapitulasi nilai dan lembar review jawaban seluruh peserta</p>
      </div>

      {/* Kontrol Filter & Pencarian */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama peserta, email, atau paket ujian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] focus:bg-white transition-all"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] focus:bg-white transition-all"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="FULL">Tryout SKD Full</option>
            <option value="TIU">Mini Tryout TIU</option>
            <option value="TWK">Mini Tryout TWK</option>
            <option value="TKP">Mini Tryout TKP</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Riwayat */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Memuat data hasil ujian...</div>
        ) : filteredResults.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">Tidak ada riwayat hasil ujian yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Peserta</th>
                  <th className="px-6 py-4">Paket / Jenis</th>
                  <th className="px-6 py-4 text-center">TIU</th>
                  <th className="px-6 py-4 text-center">TWK</th>
                  <th className="px-6 py-4 text-center">TKP</th>
                  <th className="px-6 py-4 text-center">Total</th>
                  <th className="px-6 py-4">Waktu Selesai</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                {filteredResults.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{row.profiles?.full_name ?? 'Peserta Terhapus'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{row.profiles?.email ?? '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-700">
                        {row.exam_packages?.name ?? `Mini Tryout ${row.exam_type}`}
                      </span>
                      <div className="text-xs text-blue-600 font-medium mt-0.5">{row.exam_type} Module</div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{row.score_tiu}</td>
                    <td className="px-6 py-4 text-center font-medium">{row.score_twk}</td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-600">{row.score_tkp}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        {row.score_total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 flex items-center gap-1.5 h-full pt-6">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Tombol Tinjau Jawaban */}
                        <button
                          onClick={() => dispatch({ type: 'OPEN_REVIEW', payload: row.id })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] text-xs font-semibold rounded-xl transition-all"
                          title="Tinjau Jawaban Peserta"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Detail
                        </button>

                        {/* Tombol Hapus Riwayat Permanen */}
                        <button
                          onClick={() => handleDeleteResult(row.id, row.profiles?.full_name ?? 'Peserta')}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Hapus Riwayat Ujian"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
