import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ChevronRight, ArrowLeft, Loader2,
  BarChart3, CheckCircle2, AlertCircle, Award, TrendingUp,
  Target, BookOpen, ClipboardList,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';

interface ExamResultRow {
  id: string;
  package_name: string;
  package_type: string;
  score_tiu: number;
  score_twk: number;
  score_tkp: number;
  total_score: number;
  passed: boolean;
  completed_at: string;
  questions_snapshot: any[] | null;
  answers_snapshot: any | null;
}

interface SubStat {
  name: string;
  percentage: number;
  correctPoints: number;
  totalMax: number;
}

interface CategoryDiag {
  id: 'TWK' | 'TIU' | 'TKP';
  name: string;
  overallPct: number;
  gained: number;
  maxPts: number;
  strengths: SubStat[];
  weaknesses: SubStat[];
}

const CIRCUMFERENCE = 100.53;

const categoryMeta = [
  { id: 'TWK' as const, name: 'Tes Wawasan Kebangsaan', strokeClass: 'stroke-emerald-500', textClass: 'text-emerald-600', badgeBg: 'bg-emerald-50' },
  { id: 'TIU' as const, name: 'Tes Inteligensia Umum', strokeClass: 'stroke-blue-500', textClass: 'text-blue-600', badgeBg: 'bg-blue-50' },
  { id: 'TKP' as const, name: 'Tes Karakteristik Pribadi', strokeClass: 'stroke-rose-500', textClass: 'text-rose-600', badgeBg: 'bg-rose-50' },
];

function computeDiagnostics(questions: any[], answers: any): CategoryDiag[] {
  const getAnswer = (qId: string) => {
    if (!answers) return null;
    const ans = Array.isArray(answers)
      ? answers.find((a: any) => a?.question_id === qId || a?.questionId === qId)
      : answers[qId];
    return typeof ans === 'string' ? ans : ans?.selectedAnswer || ans?.answer || null;
  };

  return categoryMeta.map((cat) => {
    const catQs = questions.filter((q: any) => q?.category === cat.id);
    if (catQs.length === 0) return null;

    let gained = 0;
    const subMap: Record<string, { correctPoints: number; totalMax: number }> = {};

    catQs.forEach((q: any) => {
      const sub = q?.sub_category || q?.sub_kategori || q?.SUB_CATEGORY || 'Umum';
      const sel = getAnswer(q.id);
      if (!subMap[sub]) subMap[sub] = { correctPoints: 0, totalMax: 0 };
      subMap[sub].totalMax += 5;

      if (cat.id === 'TKP') {
        const pts = sel ? Number(q[`points_${String(sel).toLowerCase()}`] || 0) : 0;
        gained += pts;
        subMap[sub].correctPoints += pts;
      } else {
        const correct = sel && String(sel).toUpperCase() === String(q?.correct_answer).toUpperCase();
        const pts = correct ? 5 : 0;
        gained += pts;
        subMap[sub].correctPoints += pts;
      }
    });

    const maxPts = catQs.length * 5;
    const overallPct = Math.round((gained / maxPts) * 100) || 0;

    const subList: SubStat[] = Object.keys(subMap).map((name) => {
      const s = subMap[name];
      return { name, percentage: Math.round((s.correctPoints / s.totalMax) * 100) || 0, ...s };
    });

    return {
      id: cat.id,
      name: cat.name,
      overallPct,
      gained,
      maxPts,
      strengths: subList.filter((s) => s.percentage >= 70),
      weaknesses: subList.filter((s) => s.percentage < 70),
    };
  }).filter(Boolean) as CategoryDiag[];
}

// ─── Donut chart ────────────────────────────────────────────────────────────

function DonutChart({ pct, strokeClass }: { pct: number; strokeClass: string }) {
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * pct) / 100;
  return (
    <div className="relative flex items-center justify-center h-28">
      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
        <circle strokeWidth="3.2" stroke="#e5e7eb" fill="none" cx="18" cy="18" r="16" />
        <motion.circle
          className={strokeClass}
          strokeWidth="3.2"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeLinecap="round"
          stroke="currentColor"
          fill="none"
          cx="18"
          cy="18"
          r="16"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black text-gray-900">{pct}%</span>
      </div>
    </div>
  );
}

// ─── Per-participant detail view ─────────────────────────────────────────────

function ParticipantDetail({ participant, onBack }: { participant: Profile; onBack: () => void }) {
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<ExamResultRow | null>(null);
  const [diags, setDiags] = useState<CategoryDiag[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('exam_results')
        .select('id, package_name, package_type, score_tiu, score_twk, score_tkp, total_score, passed, completed_at, questions_snapshot, answers_snapshot')
        .eq('participant_id', participant.id)
        .eq('is_deleted', false)
        .order('completed_at', { ascending: false });
      if (data) setResults(data as ExamResultRow[]);
      setLoading(false);
    }
    load();
  }, [participant.id]);

  async function handleSelectResult(row: ExamResultRow) {
    setSelectedResult(row);
    setDiags([]);
    setDiagLoading(true);

    let questions = row.questions_snapshot;
    let answers = row.answers_snapshot;

    // If snapshots not stored, fetch from exam_sessions
    if (!questions || !answers) {
      const { data: sessions } = await supabase
        .from('exam_sessions')
        .select('id')
        .eq('result_id', row.id)
        .limit(1);

      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        const [{ data: qData }, { data: aData }] = await Promise.all([
          supabase.from('exam_answers').select('question_id, selected_answer, questions(*)').eq('session_id', sessionId),
          supabase.from('exam_answers').select('question_id, selected_answer').eq('session_id', sessionId),
        ]);
        if (qData) {
          questions = qData.map((r: any) => r.questions).filter(Boolean);
          answers = aData?.map((r: any) => ({ question_id: r.question_id, answer: r.selected_answer }));
        }
      }
    }

    if (questions && questions.length > 0) {
      setDiags(computeDiagnostics(questions, answers));
    }
    setDiagLoading(false);
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {participant.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{participant.full_name}</h2>
            <p className="text-sm text-gray-500">{participant.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: result list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /> Riwayat Ujian
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Peserta belum memiliki riwayat ujian.
            </div>
          ) : (
            results.map((r) => {
              const isSelected = selectedResult?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectResult(r)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-[#1e3a8a] bg-blue-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.package_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.completed_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                        {r.passed ? 'Lulus' : 'Belum'}
                      </span>
                      <span className="text-sm font-bold text-[#1e3a8a]">{r.total_score}</span>
                      <ChevronRight className={`w-4 h-4 transition-colors ${isSelected ? 'text-[#1e3a8a]' : 'text-gray-300'}`} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: diagnostics */}
        <div className="lg:col-span-2">
          {!selectedResult ? (
            <div className="h-full min-h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 gap-2 p-8">
              <Target className="w-8 h-8 opacity-50" />
              <p className="text-sm font-medium">Pilih riwayat ujian di sebelah kiri untuk melihat diagram kompetensi</p>
            </div>
          ) : diagLoading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat data diagnostik...</span>
            </div>
          ) : diags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <AlertCircle className="w-6 h-6 opacity-50" />
              <p className="text-sm">Data soal tidak tersedia untuk ujian ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score summary bar */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4">
                {[
                  { label: 'Total Skor', value: selectedResult.total_score, color: 'text-[#1e3a8a]' },
                  { label: 'TIU', value: selectedResult.score_tiu, color: 'text-blue-600' },
                  { label: 'TWK', value: selectedResult.score_twk, color: 'text-emerald-600' },
                  { label: 'TKP', value: selectedResult.score_tkp, color: 'text-rose-600' },
                ].map((s) => (
                  <div key={s.label} className="text-center flex-1 min-w-12">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
                <div className="text-center flex-1 min-w-12">
                  <p className={`text-2xl font-black ${selectedResult.passed ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {selectedResult.passed ? 'Lulus' : 'Belum'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Status</p>
                </div>
              </div>

              {/* Category donut charts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {diags.map((diag) => {
                  const meta = categoryMeta.find((m) => m.id === diag.id)!;
                  return (
                    <motion.div
                      key={diag.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col"
                    >
                      <div className="text-center mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest uppercase ${meta.badgeBg} ${meta.textClass}`}>
                          {diag.id}
                        </span>
                        <p className="text-xs font-semibold text-gray-700 mt-1 truncate">{diag.name}</p>
                      </div>

                      <DonutChart pct={diag.overallPct} strokeClass={meta.strokeClass} />

                      <p className="text-center text-[11px] text-gray-400 font-medium mb-3">
                        {diag.gained} / {diag.maxPts} pts
                      </p>

                      <div className="flex-1 space-y-3 border-t border-gray-50 pt-3 text-[11px]">
                        <div>
                          <p className="font-extrabold text-emerald-700 flex items-center gap-1 mb-1">
                            <CheckCircle2 className="w-3 h-3" /> Dikuasai
                          </p>
                          {diag.strengths.length > 0 ? diag.strengths.map((s, i) => (
                            <div key={i} className="flex justify-between text-gray-700">
                              <span className="truncate max-w-[110px]">&bull; {s.name}</span>
                              <span className="text-emerald-600 font-bold">{s.percentage}%</span>
                            </div>
                          )) : (
                            <p className="text-gray-400 italic">Belum ada.</p>
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-rose-600 flex items-center gap-1 mb-1">
                            <AlertCircle className="w-3 h-3" /> Perlu Ditingkatkan
                          </p>
                          {diag.weaknesses.length > 0 ? diag.weaknesses.map((w, i) => (
                            <div key={i} className="flex justify-between text-gray-700">
                              <span className="truncate max-w-[110px]">&bull; {w.name}</span>
                              <span className="text-rose-500 font-bold">{w.percentage}%</span>
                            </div>
                          )) : (
                            <p className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <Award className="w-3 h-3 text-amber-500" /> Semua aman!
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main list view ──────────────────────────────────────────────────────────

export default function ParticipantDiagnostic() {
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [examCounts, setExamCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'participant')
        .order('full_name', { ascending: true });
      if (data) {
        const profiles = data as Profile[];
        setParticipants(profiles);

        // Batch-fetch exam counts
        const ids = profiles.map((p) => p.id);
        if (ids.length > 0) {
          const { data: counts } = await supabase
            .from('exam_results')
            .select('participant_id')
            .in('participant_id', ids)
            .eq('is_deleted', false);
          if (counts) {
            const map: Record<string, number> = {};
            counts.forEach((r: any) => {
              map[r.participant_id] = (map[r.participant_id] || 0) + 1;
            });
            setExamCounts(map);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = participants.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return <ParticipantDetail participant={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#1e3a8a]" />
          Diagram Kompetensi Peserta
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Pantau peta kekuatan dan kelemahan sub-materi setiap peserta berdasarkan riwayat ujian mereka
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau email peserta..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Tidak ada peserta ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p, i) => {
              const count = examCounts[p.id] || 0;
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelected(p)}
                  className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-4 flex items-center gap-4 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                        {p.is_approved ? 'Aktif' : 'Pending'}
                      </span>
                      {count > 0 && (
                        <span className="text-[10px] font-medium text-gray-400 flex items-center gap-0.5">
                          <BookOpen className="w-3 h-3" /> {count} ujian
                        </span>
                      )}
                      {count === 0 && (
                        <span className="text-[10px] text-gray-300">Belum ada ujian</span>
                      )}
                    </div>
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-300 group-hover:text-[#1e3a8a] transition-colors shrink-0" />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
