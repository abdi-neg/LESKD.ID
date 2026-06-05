import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Trophy, Eye, LayoutGrid, Brain, Shield, Heart, BookOpen } from 'lucide-react';

interface ExamHistoryRecord {
  id: string;
  package_type: 'MINI_TIU' | 'MINI_TWK' | 'MINI_TKP' | 'FULL';
  package_name: string;
  total_score: number;
  score_tiu?: number;
  score_twk?: number;
  score_tkp?: number;
  questions_correct: number;
  questions_total: number;
  passed: boolean;
  duration_seconds: number;
  completed_at: string;
}

interface Props {
  records: ExamHistoryRecord[];
  onViewDetails?: (record: ExamHistoryRecord) => void;
  onViewReview?: (resultId: string) => void;
}

const PACKAGE_LABEL: Record<string, string> = {
  MINI_TIU: 'Mini TIU',
  MINI_TWK: 'Mini TWK',
  MINI_TKP: 'Mini TKP',
  FULL: 'FULL',
};

const PACKAGE_COLOR: Record<string, string> = {
  MINI_TIU: 'bg-blue-100 text-blue-700',
  MINI_TWK: 'bg-emerald-100 text-emerald-700',
  MINI_TKP: 'bg-rose-100 text-rose-700',
  FULL: 'bg-[#1e3a8a]/10 text-[#1e3a8a]',
};

const PACKAGE_ICON: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  MINI_TIU: { icon: Brain,      bg: 'bg-blue-100',      color: 'text-blue-500'    },
  MINI_TWK: { icon: Shield,     bg: 'bg-emerald-100',   color: 'text-emerald-500' },
  MINI_TKP: { icon: Heart,      bg: 'bg-rose-100',      color: 'text-rose-500'    },
  FULL:     { icon: LayoutGrid, bg: 'bg-[#1e3a8a]/10',  color: 'text-[#1e3a8a]'  },
};

export default function ExamHistory({ records, onViewDetails, onViewReview }: Props) {
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

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Belum ada riwayat ujian</p>
        <p className="text-sm mt-1">Mulai tryout untuk melihat riwayat di sini</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record, i) => {
        return (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* SISI KIRI: INFORMASI HASIL UJIAN */}
              <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
                <div className="relative flex-shrink-0">
                  {(() => {
                    const pkg = PACKAGE_ICON[record.package_type] ?? PACKAGE_ICON.FULL;
                    const Icon = pkg.icon;
                    return (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pkg.bg}`}>
                        <Icon className={`w-6 h-6 ${pkg.color}`} />
                      </div>
                    );
                  })()}
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center
                    ${record.passed ? 'bg-emerald-400' : 'bg-gray-300'}`}>
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PACKAGE_COLOR[record.package_type] ?? 'bg-gray-100 text-gray-700'}`}>
                      {PACKAGE_LABEL[record.package_type] ?? record.package_type}
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[160px]">{record.package_name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md
                      ${record.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {record.passed ? 'Lulus' : 'Belum Lulus'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <div className="text-sm">
                      <p className="text-gray-500 text-xs">Skor</p>
                      <p className="font-bold text-gray-800">{record.total_score}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500 text-xs">Benar</p>
                      <p className="font-bold text-gray-800">{record.questions_correct}/{record.questions_total}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500 text-xs">Waktu</p>
                      <p className="font-bold text-gray-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(record.duration_seconds)}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500 text-xs">Tanggal</p>
                      <p className="font-bold text-gray-800 text-xs">{new Date(record.completed_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>

                  {record.package_type === 'FULL' && record.score_tiu !== undefined && (
                    <div className="flex gap-2 text-xs mb-2">
                      <div className="bg-blue-50 px-2.5 py-1 rounded-md">
                        <span className="text-gray-600">TIU:</span>
                        <span className="font-bold text-gray-800 ml-1">{record.score_tiu}</span>
                      </div>
                      <div className="bg-emerald-50 px-2.5 py-1 rounded-md">
                        <span className="text-gray-600">TWK:</span>
                        <span className="font-bold text-gray-800 ml-1">{record.score_twk}</span>
                      </div>
                      <div className="bg-rose-50 px-2.5 py-1 rounded-md">
                        <span className="text-gray-600">TKP:</span>
                        <span className="font-bold text-gray-800 ml-1">{record.score_tkp}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">{formatDate(record.completed_at)}</p>
                </div>
              </div>

              {/* SISI KANAN: DUA TOMBOL AKSI BERDAMPINGAN */}
              <div className="flex sm:flex-col items-center sm:items-stretch gap-2 w-full sm:w-auto justify-end flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                {/* Tombol 1: Lihat Detail Skor */}
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(record)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-blue-100"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Lihat Skor</span>
                  </button>
                )}
                
                {/* Tombol 2: Pembahasan Soal */}
                {onViewReview && (
                  <button
                    onClick={() => onViewReview(record.id)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Pembahasan</span>
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
