import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { 
  History, Search, Calendar, Award, CheckCircle, 
  XCircle, Clock, FileText, Trash2 
} from 'lucide-react';

interface ExamResultRow {
  id: string;
  participant_id: string; // 👈 Sesuai DB
  package_id: string | null;
  package_name: string; // 👈 Sesuai DB
  package_type: string; // 👈 Sesuai DB
  score_tiu: number;
  score_twk: number;
  score_tkp: number;
  total_score: number; // 👈 Sesuai DB
  created_at: string;
  completed_at: string; // 👈 Sesuai DB
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export default function MasterResults() {
  const { dispatch, deleteHistory } = useApp();
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Load data riwayat ujian dari Supabase dengan nama kolom yang benar
  async function loadResults() {
    setLoading(true);
    try {
      // 1. Ambil data dari tabel exam_results menggunakan urutan completed_at karena created_at mungkin tidak ada/berbeda
      const { data: examData, error: examError } = await supabase
        .from('exam_results')
        .select('*')
        .order('completed_at', { ascending: false });

      if (examError) throw examError;

      if (examData && examData.length > 0) {
        // 2. Ambil data profil untuk dicocokkan manual
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email');

        // 3. Gabungkan data berdasarkan participant_id
        const formatted = examData.map((result: any) => {
          const matchedProfile = profileData?.find((p) => p.id === result.participant_id); // 👈 pakai participant_id

          return {
            id: result.id,
            participant_id: result.participant_id,
            package_id: result.package_id,
            package_name: result.package_name || 'Tanpa Nama Paket',
            package_type: result.package_type || 'FULL',
            score_tiu: result.score_tiu || 0,
            score_twk: result.score_twk || 0,
            score_tkp: result.score_tkp || 0,
            total_score: result.total_score || 0, // 👈 pakai total_score
            created_at: result.completed_at || result.created_at, 
            completed_at: result.completed_at,
            profiles: matchedProfile ? { full_name: matchedProfile.full_name, email: matchedProfile.email } : null
          };
        });

        setResults(formatted);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Gagal memuat riwayat ujian:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  // Fungsi hapus riwayat ujian
  const handleDeleteResult = async (resultId: string, participantName: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus riwayat ujian dari "${participantName}"?\n\nTindakan ini bersifat permanen dan akan menghapus data di database serta berkas lokal.`
    );

    if (!confirmDelete) return;

    const success = await deleteHistory(resultId);
    if (success) {
      alert("Riwayat ujian berhasil dihapus secara permanen!");
      setResults((prev) => prev.filter((item) => item.id !== resultId));
    } else {
      alert("Gagal menghapus data riwayat. Silakan coba kembali.");
    }
  };

  // Filter pencarian dan kategori module
  const filteredResults = results.filter((r) => {
    const fullName = r.profiles?.full_name?.toLowerCase() ?? '';
    const email = r.profiles?.email?.toLowerCase() ?? '';
    const packageName = r.package_name.toLowerCase();
    
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) || 
      email.includes(searchTerm.toLowerCase()) ||
      packageName.includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || r.package_type === filterType;

    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
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
                      <span className="font-medium text-gray-700">{row.package_name}</span>
                      <div className="text-xs text-blue-600 font-medium mt-0.5">{row.package_type} Module</div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{row.score_tiu}</td>
                    <td className="px-6 py-4 text-center font-medium">{row.score_twk}</td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-600">{row.score_tkp}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        {row.total_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(row.created_at)}
                      </div>
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
