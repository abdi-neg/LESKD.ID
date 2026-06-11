import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, HelpCircle, TrendingDown, Award } from 'lucide-react';

interface DiagnosticItem {
  correct: number;
  total: number;
  percentage: number;
}

interface Props {
  breakdown?: Record<string, DiagnosticItem>;
}

export default function DiagnosticReport({ breakdown }: Props) {
  // Jalur pengaman jika data kosong atau ujian lama belum punya data breakdown
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
        <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500 text-sm">Analisis Diagnosis Belum Tersedia</p>
        <p className="text-xs text-gray-400 mt-1">Sesi ujian ini belum merekam klasifikasi sub-materi secara spesifik.</p>
      </div>
    );
  }

  // 🧠 Kelompokkan materi berdasarkan tingkat penguasaan (Kriteria Kelulusan)
  const topics = Object.entries(breakdown).map(([name, data]) => ({ name, ...data }));
  const weakTopics = topics.filter(t => t.percentage < 60);
  const averageTopics = topics.filter(t => t.percentage >= 60 && t.percentage < 80);
  const strongTopics = topics.filter(t => t.percentage >= 80);

  return (
    <div className="space-y-6">
      
      {/* 💡 BLOK REKOMENDASI KECERDASAN BUATAN */}
      {weakTopics.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 items-start"
        >
          <TrendingDown className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900 text-sm">Rekomendasi Strategi Belajar</h4>
            <p className="text-xs text-rose-700 leading-relaxed mt-1">
              Berdasarkan hasil uji CAT BKN Anda, sistem mendeteksi kelemahan kritis pada materi{' '}
              <span className="font-bold">{weakTopics.map(t => t.name).join(', ')}</span>. 
              Fokuskan sisa waktu Anda untuk mendalami kembali teori dasar pada bab tersebut dan perbanyak latihan soal harian.
            </p>
          </div>
        </motion.div>
      )}

      {weakTopics.length === 0 && strongTopics.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-start"
        >
          <Award className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-900 text-sm">Luar Biasa! Pertahankan Ritme</h4>
            <p className="text-xs text-emerald-700 leading-relaxed mt-1">
              Secara keseluruhan, pemahaman konsep mikro Anda sudah sangat merata. Anda tidak memiliki sub-materi di zona merah. Tetap lakukan simulasi berkala untuk menjaga stabilitas memori taktis Anda!
            </p>
          </div>
        </motion.div>
      )}

      {/* 📊 GRAFIK UTAMA PENGUASAAN SUB-MATERI */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h3 className="font-bold text-gray-800 text-base">Rapor Diagnosis Kekuatan & Kelemahan</h3>
          <p className="text-xs text-gray-400 mt-0.5">Grafik analisis akurasi jawaban per submateri kisi-kisi resmi</p>
        </div>

        <div className="space-y-4">
          {topics.map((topic, index) => {
            // Tentukan warna bar secara dinamis sesuai zona skor
            let colorClass = 'bg-rose-500'; // Zona Merah
            let bgZoneClass = 'bg-rose-50/50';
            let badgeClass = 'bg-rose-100 text-rose-700';
            let icon = <AlertCircle className="w-3.5 h-3.5" />;

            if (topic.percentage >= 80) {
              colorClass = 'bg-emerald-500'; // Zona Hijau
              bgZoneClass = 'bg-emerald-50/50';
              badgeClass = 'bg-emerald-100 text-emerald-700';
              icon = <CheckCircle2 className="w-3.5 h-3.5" />;
            } else if (topic.percentage >= 60) {
              colorClass = 'bg-amber-500'; // Zona Kuning
              bgZoneClass = 'bg-amber-50/50';
              badgeClass = 'bg-amber-100 text-amber-700';
              icon = <HelpCircle className="w-3.5 h-3.5" />;
            }

            return (
              <div key={topic.name} className={`p-3 rounded-xl border border-gray-100/70 transition-all ${bgZoneClass}`}>
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {topic.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium">
                      Poin: {topic.correct}/{topic.total}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${badgeClass}`}>
                      {icon}
                      {topic.percentage}%
                    </span>
                  </div>
                </div>
                
                {/* TRACK PROGRESS BAR */}
                <div className="w-full h-2.5 bg-gray-200/80 rounded-full overflow-hidden">
                  {/* ANIMATED BAR FILL */}
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                    className={`h-full rounded-full ${colorClass}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
