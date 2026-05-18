import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Search, Filter, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';

interface HistoryRecord {
  id: string;
  participant_name: string;
  exam_type: 'TIU' | 'TWK' | 'TKP' | 'FULL';
  total_score: number;
  passed: boolean;
  completed_at: string;
  duration_seconds: number;
}

const mockParticipantHistory: HistoryRecord[] = [
  {
    id: 'h1',
    participant_name: 'Budi Santoso',
    exam_type: 'FULL',
    total_score: 450,
    passed: true,
    completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 5400,
  },
  {
    id: 'h2',
    participant_name: 'Sari Dewi',
    exam_type: 'TIU',
    total_score: 155,
    passed: true,
    completed_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 1800,
  },
  {
    id: 'h3',
    participant_name: 'Ahmad Fauzi',
    exam_type: 'FULL',
    total_score: 380,
    passed: false,
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 6000,
  },
  {
    id: 'h4',
    participant_name: 'Rina Kartika',
    exam_type: 'TWK',
    total_score: 125,
    passed: true,
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 1500,
  },
  {
    id: 'h5',
    participant_name: 'Dian Pratama',
    exam_type: 'TKP',
    total_score: 185,
    passed: true,
    completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 2400,
  },
];

export default function ExamHistoryMonitor() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FULL' | 'TIU' | 'TWK' | 'TKP'>('ALL');

  const filtered = mockParticipantHistory.filter((h) => {
    const matchName = h.participant_name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || h.exam_type === filterType;
    return matchName && matchType;
  });

  const stats = {
    totalExams: mockParticipantHistory.length,
    passed: mockParticipantHistory.filter((h) => h.passed).length,
    failed: mockParticipantHistory.filter((h) => !h.passed).length,
    avgScore: Math.round(
      mockParticipantHistory.reduce((sum, h) => sum + h.total_score, 0) /
        mockParticipantHistory.length
    ),
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
        return 'bg-blue-100 text-blue-700';
      case 'TWK':
        return 'bg-emerald-100 text-emerald-700';
      case 'TKP':
        return 'bg-rose-100 text-rose-700';
      case 'FULL':
        return 'bg-[#1e3a8a]/10 text-[#1e3a8a]';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Riwayat Ujian Peserta</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor semua ujian yang telah selesai</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: BarChart3, label: 'Total Ujian', value: stats.totalExams, color: 'text-[#1e3a8a]', bg: 'bg-blue-50' },
          { icon: CheckCircle, label: 'Lulus', value: stats.passed, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
          { icon: XCircle, label: 'Belum Lulus', value: stats.failed, color: 'text-red-500', bg: 'bg-red-50' },
          { icon: TrendingUp, label: 'Rata-rata Skor', value: stats.avgScore, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
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

      {/* Filters */}
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
                ${filterType === type
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Peserta</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Jenis Ujian</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Skor</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Waktu</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((record, i) => (
                <motion.tr
                  key={record.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
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
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-bold text-gray-800">{record.total_score}</span>
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
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
