import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Award, Target, HelpCircle } from 'lucide-react';

interface DiagnosticReportProps {
  questions: any[];
  answers: any;
}

export default function DiagnosticReport({ questions, answers }: DiagnosticReportProps) {
  if (!questions || questions.length === 0) return null;

  // 1. Ambil pilihan jawaban peserta (Helper)
  const getSelectedAnswer = (qId: string) => {
    if (!answers) return null;
    const ans = Array.isArray(answers) 
      ? answers.find((a) => a?.question_id === qId || a?.questionId === qId)
      : answers[qId];
    return typeof ans === 'string' ? ans : ans?.selectedAnswer || ans?.answer || null;
  };

  // 2. Rumpun kategori utama SKD
  const mainCategories = [
    { id: 'TWK', name: 'Tes Wawasan Kebangsaan', color: 'stroke-emerald-500 text-emerald-600 bg-emerald-50' },
    { id: 'TIU', name: 'Tes Inteligensia Umum', color: 'stroke-blue-500 text-blue-600 bg-blue-50' },
    { id: 'TKP', name: 'Tes Karakteristik Pribadi', color: 'stroke-rose-500 text-rose-600 bg-rose-50' },
  ];

  // Rumus sakti keliling SVG Circle (Radius = 16) -> 2 * pi * 16 = 100.53
  const circumference = 100.53;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-8">
      {/* HEADER SECTION */}
      <div className="text-center md:text-left border-b border-gray-50 pb-4">
        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center justify-center md:justify-start gap-2 text-[#1e3a8a]">
          <Target className="w-5 h-5 text-[#10b981]" />
          PETA KEKUATAN DAN KELEMAHAN MALAIKAT
        </h2>
        <p className="text-xs text-gray-400 mt-1 font-medium">
          Analisis peta sebaran kompetensi sub-materi berdasarkan hasil tryout Anda
        </p>
      </div>

      {/* THREE DONUT CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mainCategories.map((category) => {
          // Saring soal milik kategori ini
          const catQuestions = questions.filter((q) => q?.category === category.id);
          if (catQuestions.length === 0) return null;

          let totalGainedPoints = 0;
          let maxPossiblePoints = catQuestions.length * 5;

          // Hitung nilai dan kumpulkan sub-kategori
          const subMap: Record<string, { correctPoints: number; totalMax: number }> = {};

          catQuestions.forEach((q) => {
            const subName = q?.sub_category || q?.sub_kategori || 'Umum';
            const selected = getSelectedAnswer(q.id);

            if (!subMap[subName]) {
              subMap[subName] = { correctPoints: 0, totalMax: 0 };
            }
            subMap[subName].totalMax += 5;

            if (category.id === 'TKP') {
              const points = selected ? Number(q[`points_${String(selected).toLowerCase()}`] || 0) : 0;
              totalGainedPoints += points;
              subMap[subName].correctPoints += points;
            } else {
              const isCorrect = selected && String(selected).toUpperCase() === String(q?.correct_answer).toUpperCase();
              const score = isCorrect ? 5 : 0;
              totalGainedPoints += score;
              subMap[subName].correctPoints += score;
            }
          });

          const overallPercentage = Math.round((totalGainedPoints / maxPossiblePoints) * 100) || 0;
          const strokeDashoffset = circumference - (circumference * overallPercentage) / 100;

          // Pecah sub-materi menjadi Kekuatan (>=70%) dan Kelemahan (<70%)
          const subList = Object.keys(subMap).map((name) => {
            const item = subMap[name];
            const pct = Math.round((item.correctPoints / item.totalMax) * 100) || 0;
            return { name, percentage: pct };
          });

          const strengths = subList.filter((s) => s.percentage >= 70);
          const weaknesses = subList.filter((s) => s.percentage < 70);

          return (
            <div key={category.id} className="flex flex-col border border-gray-100 rounded-2xl p-5 bg-gray-50/30 shadow-sm/50">
              {/* Tittle Sub-tes */}
              <div className="text-center mb-4">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider uppercase bg-white border border-gray-100 ${category.color.split(' ')[1]}`}>
                  {category.id}
                </span>
                <h3 className="text-sm font-bold text-gray-800 mt-2 truncate">{category.name}</h3>
              </div>

              {/* METODE DIAGRAM DONUT SVG PURE CSS */}
              <div className="relative flex items-center justify-center h-36 mb-5">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Lingkaran Background Gray */}
                  <circle
                    className="text-gray-100"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    cx="18"
                    cy="18"
                    r="16"
                  />
                  {/* Lingkaran Utama Nilai */}
                  <motion.circle
                    className={category.color.split(' ')[0]}
                    strokeWidth="3.2"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    cx="18"
                    cy="18"
                    r="16"
                  />
                </svg>
                {/* Teks di Tengah Lingkaran */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-gray-900 tracking-tight">{overallPercentage}%</span>
                  <span className="text-[10px] text-gray-400 font-bold mt-0.5 tracking-wide">
                    {totalGainedPoints} / {maxPossiblePoints} PTS
                  </span>
                </div>
              </div>

              {/* LIST KEKUATAN & KELEMAHAN SUB-MATERI */}
              <div className="flex-1 space-y-4 border-t border-gray-100 pt-4 text-xs">
                {/* Bagian Kekuatan */}
                <div>
                  <h4 className="font-extrabold text-emerald-700 flex items-center gap-1 mb-1.5 bg-emerald-50/60 px-2 py-0.5 rounded-md w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Materi Dikuasai
                  </h4>
                  {strengths.length > 0 ? (
                    <div className="space-y-1.5 pl-1">
                      {strengths.map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center text-gray-700 font-medium">
                          <span className="truncate max-w-[170px]">&bull; {s.name}</span>
                          <span className="text-emerald-600 font-bold">{s.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-[11px] pl-1">Belum ada materi mencapai batas aman.</p>
                  )}
                </div>

                {/* Bagian Kelemahan */}
                <div>
                  <h4 className="font-extrabold text-rose-700 flex items-center gap-1 mb-1.5 bg-rose-50/60 px-2 py-0.5 rounded-md w-fit">
                    <AlertCircle className="w-3.5 h-3.5" /> Perlu Peningkatan
                  </h4>
                  {weaknesses.length > 0 ? (
                    <div className="space-y-1.5 pl-1">
                      {weaknesses.map((w, idx) => (
                        <div key={idx} className="flex justify-between items-center text-gray-700 font-medium">
                          <span className="truncate max-w-[170px]">&bull; {w.name}</span>
                          <span className="text-rose-500 font-bold">{w.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-emerald-600 font-bold text-[11px] pl-1 flex items-center gap-0.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" /> Sempurna! Semua materi aman.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
