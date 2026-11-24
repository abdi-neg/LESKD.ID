import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ChevronRight, ArrowLeft, Loader2,
  BarChart3, CheckCircle2, AlertCircle, Award, TrendingUp,
  Target, BookOpen, ClipboardList, LayoutGrid, LineChart,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { useApp } from '../../context/AppContext';

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
  review_snapshot: any;
  diagnostic_breakdown: any;
}

interface SubStat {
  name: string;
  percentage: number;
  correctPoints: number;
  totalMax: number;
}

interface CategoryDiag {
  id: string;
  name: string;
  overallPct: number;
  gained: number;
  maxPts: number;
  strengths: SubStat[];
  weaknesses: SubStat[];
}

const CIRCUMFERENCE = 100.53;

const categoryMeta = [
  { id: 'TWK', name: 'Tes Wawasan Kebangsaan', strokeClass: 'stroke-emerald-500', textClass: 'text-emerald-600', badgeBg: 'bg-emerald-50' },
  { id: 'TIU', name: 'Tes Inteligensia Umum', strokeClass: 'stroke-blue-500', textClass: 'text-blue-600', badgeBg: 'bg-blue-50' },
  { id: 'TKP', name: 'Tes Karakteristik Pribadi', strokeClass: 'stroke-amber-500', textClass: 'text-amber-600', badgeBg: 'bg-amber-50' },
];

function isDrillingPackage(packageType: unknown): boolean {
  return String(packageType ?? '').toUpperCase().trim() === 'TO_SUBKATEGORI';
}

function safePercent(num: number, den: number): number {
  if (den <= 0) return 0;
  const pct = Math.round((num / den) * 100);
  return Number.isNaN(pct) ? 0 : pct;
}

// ─── Per-exam diagnostics ────────────────────────────────────────────────────

function computeDiagnostics(questions: any[], answers: any): CategoryDiag[] {
  const getAnswer = (qId: string): any => {
    if (!answers) return null;
    if (Array.isArray(answers)) {
      const a = answers.find((x: any) => (x?.question_id === qId ? true : x?.questionId === qId));
      return a?.selectedAnswer ?? a?.answer ?? null;
    }
    const a = answers[qId];
    if (!a) return null;
    return typeof a === 'string' ? a : (a?.selectedAnswer ?? a?.answer ?? null);
  };

  return categoryMeta
    .map((cat) => {
      const catQs = questions.filter((q: any) => q?.category === cat.id);
      if (catQs.length === 0) return null;

      let gained = 0;
      const subMap: Record<string, { correctPoints: number; totalMax: number }> = {};

      catQs.forEach((q: any) => {
        const sub = q?.sub_category ?? q?.sub_kategori ?? q?.SUB_KATEGORI ?? q?.SUB_CATEGORY ?? 'Umum';
        const sel = getAnswer(q.id);
        if (!subMap[sub]) subMap[sub] = { correctPoints: 0, totalMax: 0 };
        subMap[sub].totalMax += 5;

        if (cat.id === 'TKP') {
          const rawPts = sel ? Number(q[`points_${String(sel).toLowerCase()}`] ?? 0) : 0;
          const pts = Number.isNaN(rawPts) ? 0 : rawPts;
          gained += pts;
          subMap[sub].correctPoints += pts;
        } else {
          const correct = Boolean(sel) && String(sel).toUpperCase() === String(q?.correct_answer).toUpperCase();
          const pts = correct ? 5 : 0;
          gained += pts;
          subMap[sub].correctPoints += pts;
        }
      });

      const maxPts = catQs.length * 5;
      const overallPct = safePercent(gained, maxPts);
      const subList: SubStat[] = Object.keys(subMap).map((name) => {
        const s = subMap[name];
        return { name, percentage: safePercent(s.correctPoints, s.totalMax), ...s };
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
    })
    .filter(Boolean) as CategoryDiag[];
}

// ─── Aggregate diagnostics (all main exams combined) ─────────────────────────

function computeAggregateDiagnostics(results: ExamResultRow[]): CategoryDiag[] {
  type Pair = { question: any; answer: any };
  const allPairs: Pair[] = [];

  for (const result of results) {
    let snap = result.review_snapshot;
    if (typeof snap === 'string') {
      try {
        snap = JSON.parse(snap);
        if (typeof snap === 'string') {
          snap = JSON.parse(snap);
        }
      } catch (e) {
        console.error('Gagal memecah JSON:', e);
      }
    }

    if (!snap?.questions) continue;

    for (const q of snap.questions) {
      const ans = snap.answers?.[q.id];
      const selectedAnswer = typeof ans === 'string' ? ans : (ans?.selectedAnswer ?? ans?.answer ?? null);
      allPairs.push({ question: q, answer: selectedAnswer });
    }
  }

  if (allPairs.length === 0) return [];

  return categoryMeta
    .map((cat) => {
      const catPairs = allPairs.filter((p) => p.question?.category === cat.id);
      if (catPairs.length === 0) return null;

      let gained = 0;
      const subMap: Record<string, { correctPoints: number; totalMax: number }> = {};

      for (const { question: q, answer: sel } of catPairs) {
        const sub = q?.sub_category ?? q?.sub_kategori ?? q?.SUB_KATEGORI ?? q?.SUB_CATEGORY ?? 'Umum';
        if (!subMap[sub]) subMap[sub] = { correctPoints: 0, totalMax: 0 };
        subMap[sub].totalMax += 5;

        if (cat.id === 'TKP') {
          const rawPts = sel ? Number(q[`points_${String(sel).toLowerCase()}`] ?? 0) : 0;
          const pts = Number.isNaN(rawPts) ? 0 : rawPts;
          gained += pts;
          subMap[sub].correctPoints += pts;
        } else {
          const correct = Boolean(sel) && String(sel).toUpperCase() === String(q?.correct_answer).toUpperCase();
          gained += correct ? 5 : 0;
          subMap[sub].correctPoints += correct ? 5 : 0;
        }
      }

      const maxPts = catPairs.length * 5;
      const overallPct = safePercent(gained, maxPts);
      const subList: SubStat[] = Object.keys(subMap).map((name) => {
        const s = subMap[name];
        return { name, percentage: safePercent(s.correctPoints, s.totalMax), ...s };
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
    })
    .filter(Boolean) as CategoryDiag[];
}

// ─── Shared donut chart ───────────────────────────────────────────────────────

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

// ─── Shared category card (donut + sub-list) ──────────────────────────────────

function CategoryCard({ diag }: { diag: CategoryDiag }) {
  const meta = categoryMeta.find((m) => m.id === diag.id) ?? categoryMeta[0];
  return (
    <motion.div
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
          {diag.strengths.length > 0 ? (
            diag.strengths.map((s, i) => (
              <div key={i} className="flex justify-between text-gray-700">
                <span className="truncate max-w-[110px]">• {s.name}</span>
                <span className="text-emerald-600 font-bold">{s.percentage}%</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic">Belum ada.</p>
          )}
        </div>
        <div>
          <p className="font-extrabold text-rose-600 flex items-center gap-1 mb-1">
            <AlertCircle className="w-3 h-3" /> Perlu Ditingkatkan
          </p>
          {diag.weaknesses.length > 0 ? (
            diag.weaknesses.map((w, i) => (
              <div key={i} className="flex justify-between text-gray-700">
                <span className="truncate max-w-[110px]">• {w.name}</span>
                <span className="text-rose-500 font-bold">{w.percentage}%</span>
              </div>
            ))
          ) : (
            <p className="text-emerald-600 font-bold flex items-center gap-0.5">
              <Award className="w-3 h-3 text-amber-500" /> Semua aman!
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Score trend charts ───────────────────────────────────────────────────────

const SUB_CATS = [
  { id: 'TIU', key: 'score_tiu' as const, label: 'Tes Inteligensia Umum', color: '#3b82f6', max: 175 },
  { id: 'TWK', key: 'score_twk' as const, label: 'Tes Wawasan Kebangsaan', color: '#10b981', max: 150 },
  { id: 'TKP', key: 'score_tkp' as const, label: 'Tes Karakteristik Pribadi', color: '#f59e0b', max: 225 },
];

function sparkPath(values: number[], max: number, w: number, h: number): string {
  if (values.length < 2) return '';
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - (Math.min(v, max) / max) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function sparkArea(values: number[], max: number, w: number, h: number): string {
  const line = sparkPath(values, max, w, h);
  if (!line) return '';
  return `${line} L ${w} ${h} L 0 ${h} Z`;
}

function ScoreTrendChart({ results }: { results: ExamResultRow[] }) {
  const sorted = useMemo(
    () =>
      [...results]
        .filter((r) => typeof r.total_score === 'number')
        .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()),
    [results]
  );

  if (sorted.length === 0) return null;

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const VW = 500;
  const VH = 155;
  const PL = 38;
  const PR = 16;
  const PT = 26;
  const PB = 28;
  const plotW = VW - PL - PR;
  const plotH = VH - PT - PB;
  const MAX = 550;
  const n = sorted.length;
  const barGap = Math.max(4, Math.min(10, (plotW / n) * 0.2));
  const barW = Math.max(10, plotW / n - barGap);
  const getBarX = (i: number) => PL + i * (plotW / n) + barGap / 2;
  const getBarH = (score: number) => Math.max(4, (Math.min(score, MAX) / MAX) * plotH);
  const yLabels = [0, 150, 300, 450, 550];

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#1e3a8a]" />
            Tren Total Skor Tryout Utama
          </h4>
          <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" /> Lulus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-400 shrink-0" /> Belum Lulus
            </span>
          </div>
        </div>

        {sorted.length < 2 ? (
          <p className="text-center text-xs text-gray-400 py-4 bg-gray-50 rounded-xl">
            Butuh minimal 2 riwayat tryout utama untuk menampilkan grafik perkembangan.
          </p>
        ) : (
          <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {yLabels.map((val) => {
              const y = PT + (1 - val / MAX) * plotH;
              return (
                <g key={val}>
                  <line
                    x1={PL}
                    y1={y}
                    x2={VW - PR}
                    y2={y}
                    stroke={val === 0 ? '#d1d5db' : '#f3f4f6'}
                    strokeWidth="1"
                  />
                  <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize="8.5" fill="#9ca3af">
                    {val}
                  </text>
                </g>
              );
            })}
            {sorted.map((r, i) => {
              const bH = getBarH(r.total_score);
              const bX = getBarX(i);
              const bY = PT + plotH - bH;
              const fill = r.passed ? '#10b981' : '#fb7185';
              const fillBg = r.passed ? '#d1fae5' : '#ffe4e6';
              return (
                <g key={r.id}>
                  <rect x={bX} y={PT} width={barW} height={plotH} fill={fillBg} rx="4" />
                  <rect x={bX} y={bY} width={barW} height={bH} fill={fill} rx="4" />
                  <text
                    x={bX + barW / 2}
                    y={bY - 5}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#374151"
                    fontWeight="700"
                  >
                    {r.total_score}
                  </text>
                  <text
                    x={bX + barW / 2}
                    y={VH - 2}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#9ca3af"
                  >
                    {formatDate(r.completed_at)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SUB_CATS.map((cat) => {
          const values = sorted
            .map((r) => r[cat.key])
            .filter((v) => typeof v === 'number');

          const latest = values.length > 0 ? values[values.length - 1] : null;
          const avg =
            values.length > 0
              ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
              : null;
          const trend =
            values.length >= 2
              ? values[values.length - 1] > values[0]
                ? 'up'
                : values[values.length - 1] < values[0]
                  ? 'down'
                  : 'stable'
              : 'stable';

          const SW = 200;
          const SH = 52;
          const line = sparkPath(values, cat.max, SW, SH);
          const area = sparkArea(values, cat.max, SW, SH);
          const lastDotY =
            values.length > 0
              ? SH - (Math.min(values[values.length - 1], cat.max) / cat.max) * SH
              : SH / 2;

          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase"
                    style={{ background: `${cat.color}18`, color: cat.color }}
                  >
                    {cat.id}
                  </span>
                  <p className="text-[11px] text-gray-500 mt-1 leading-tight max-w-[110px]">{cat.label}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black leading-none" style={{ color: cat.color }}>
                    {latest ?? '—'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">skor terakhir</p>
                </div>
              </div>

              {values.length >= 2 ? (
                <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full" preserveAspectRatio="none">
                  <path d={area} fill={cat.color} fillOpacity="0.08" />
                  <path
                    d={line}
                    fill="none"
                    stroke={cat.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <circle cx={SW} cy={lastDotY} r="3.5" fill={cat.color} stroke="white" strokeWidth="1.5" />
                </svg>
              ) : (
                <div className="h-[52px] flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-[11px] text-gray-300">Grafik belum tersedia</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50 text-[11px]">
                <span className="text-gray-400">
                  Rata-rata:{' '}
                  <span className="font-bold text-gray-600">{avg ?? '—'}</span>
                </span>
                {values.length >= 2 && (
                  <span
                    className={`font-bold ${
                      trend === 'up'
                        ? 'text-emerald-600'
                        : trend === 'down'
                          ? 'text-rose-500'
                          : 'text-gray-400'
                    }`}
                  >
                    {trend === 'up' ? '▲ Meningkat' : trend === 'down' ? '▼ Menurun' : '─ Stabil'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Overall / aggregate view (HEMAT EGRESS DENGAN CACHE SESSIONSTORAGE) ─────

function OverallView({
  results,
  participantId,
  onSwitchPerExam
}: {
  results: ExamResultRow[];
  participantId: string;
  onSwitchPerExam: () => void;
}) {
  const mainCompleted = results.filter(
    (r) => typeof r.total_score === 'number' && !isDrillingPackage(r.package_type)
  );
  const drillingCount = results.filter((r) => isDrillingPackage(r.package_type)).length;

  const passed = mainCompleted.filter((r) => r.passed).length;
  const avgScore =
    mainCompleted.length > 0
      ? Math.round(mainCompleted.reduce((s, r) => s + r.total_score, 0) / mainCompleted.length)
      : 0;
  const bestScore =
    mainCompleted.length > 0 ? Math.max(...mainCompleted.map((r) => r.total_score)) : 0;
  const passRate =
    mainCompleted.length > 0 ? Math.round((passed / mainCompleted.length) * 100) : 0;

  const [globalDiags, setGlobalDiags] = useState<CategoryDiag[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  const cacheSignature = `${mainCompleted.length}_${mainCompleted[0]?.id ?? 'none'}`;

  useEffect(() => {
    let isCancelled = false;

    async function loadAllDiagnostics() {
      if (mainCompleted.length === 0) {
        setGlobalDiags([]);
        setLoadingGlobal(false);
        return;
      }

      const cacheKey = `leskd_diag_overall_${participantId}_${cacheSignature}`;

      // 1. Cek cache sessionStorage dulu (0 Byte egress Supabase saat Admin refresh halaman)
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed)) {
            setGlobalDiags(parsed);
            setLoadingGlobal(false);
            return;
          }
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }

      // 2. Tarik maksimal 20 tryout utama terbaru (tidak termasuk Drilling Sub-Kategori)
      setLoadingGlobal(true);
      try {
        const { data } = await supabase
          .from('exam_results')
          .select('id, review_snapshot')
          .eq('participant_id', participantId)
          .neq('package_type', 'TO_SUBKATEGORI')
          .not('review_snapshot', 'is', null)
          .not('is_deleted', 'eq', true)
          .order('completed_at', { ascending: false })
          .limit(20);

        if (!isCancelled && data) {
          const computed = computeAggregateDiagnostics(data as any);
          setGlobalDiags(computed);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(computed));
          } catch {
            // Abaikan jika kapasitas sessionStorage penuh
          }
        }
      } catch (err) {
        console.error('Gagal menarik data diagnostik keseluruhan peserta:', err);
      } finally {
        if (!isCancelled) setLoadingGlobal(false);
      }
    }

    loadAllDiagnostics();
    return () => {
      isCancelled = true;
    };
  }, [participantId, cacheSignature]);

  if (mainCompleted.length === 0 && drillingCount > 0) {
    return (
      <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-8 text-center space-y-3">
        <Target className="w-9 h-9 text-purple-600 mx-auto" />
        <h4 className="text-base font-bold text-gray-800">
          Peserta Baru Memiliki {drillingCount} Sesi Drilling Sub-Kategori
        </h4>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Ringkasan Keseluruhan dan Tren Skor hanya menghitung paket Tryout Utama agar rata-rata tidak terdistorsi kuis singkat. Anda tetap dapat melihat diagram tiap sesi Drilling di tab Per Ujian.
        </p>
        <button
          type="button"
          onClick={onSwitchPerExam}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm"
        >
          <LayoutGrid className="w-4 h-4" />
          Buka Tab Per Ujian
        </button>
      </div>
    );
  }

  const statsCards = [
    { label: 'Tryout Utama', value: mainCompleted.length, color: 'text-[#1e3a8a]', bg: 'bg-blue-50' },
    { label: 'Rata-rata Skor', value: avgScore, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Skor Terbaik', value: bestScore, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
    {
      label: 'Tingkat Kelulusan',
      value: mainCompleted.length > 0 ? `${passRate}%` : '-',
      color: passRate >= 50 ? 'text-emerald-600' : 'text-rose-500',
      bg: passRate >= 50 ? 'bg-emerald-50' : 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${s.bg} rounded-2xl p-4`}
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <ScoreTrendChart results={mainCompleted} />

      {/* Aggregate competency donuts */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5 flex-wrap">
          <Target className="w-4 h-4 text-[#1e3a8a]" />
          Diagram Kompetensi Kumulatif
          <span className="ml-1 text-[10px] font-normal text-gray-400">
            (Dari {mainCompleted.length} tryout utama{drillingCount > 0 ? `, ${drillingCount} sesi drilling di tab Per Ujian` : ''})
          </span>
        </h4>

        {loadingGlobal ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#1e3a8a] bg-blue-50 rounded-2xl border border-dashed border-blue-200">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-semibold">Menganalisis data tryout utama peserta...</p>
          </div>
        ) : globalDiags.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {globalDiags.map((diag) => (
              <CategoryCard key={diag.id} diag={diag} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <AlertCircle className="w-6 h-6 opacity-50" />
            <p className="text-sm">Belum ada data snapshot tryout utama untuk dihitung.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Per-participant detail view (SINKRON URL ?tab=&exam=) ───────────────────

function ParticipantDetail({ participant, onBack }: { participant: Profile; onBack: () => void }) {
  const { fetchExamSnapshot } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'per-exam' ? 'per-exam' : 'overall';
  const examIdFromUrl = searchParams.get('exam');

  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [diags, setDiags] = useState<CategoryDiag[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  const restoredExamRef = useRef<string>('');

  useEffect(() => {
    let isCancelled = false;
    restoredExamRef.current = '';
    setSelectedResult(null);
    setDiags([]);

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('exam_results')
        .select('id, package_name, package_type, score_tiu, score_twk, score_tkp, total_score, passed, completed_at, diagnostic_breakdown')
        .eq('participant_id', participant.id)
        .not('is_deleted', 'eq', true)
        .order('completed_at', { ascending: false });

      if (!isCancelled) {
        if (data) setResults(data as ExamResultRow[]);
        setLoading(false);
      }
    }
    load();
    return () => {
      isCancelled = true;
    };
  }, [participant.id]);

  async function loadExamDiagnostics(row: ExamResultRow, syncUrl = true) {
    setSelectedResult(row);
    setDiags([]);

    if (syncUrl) {
      restoredExamRef.current = row.id;
      setSearchParams(
        { participant: String(participant.id), tab: 'per-exam', exam: String(row.id) },
        { replace: true }
      );
    }

    const cacheKey = `leskd_diag_exam_${row.id}`;

    // 1. Cek cache sessionStorage dulu (0 Byte egress Supabase saat di-refresh)
    try {
      const cachedRaw = sessionStorage.getItem(cacheKey);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed)) {
          setDiags(parsed);
          return;
        }
      }
    } catch {
      sessionStorage.removeItem(cacheKey);
    }

    // 2. Lazy load dari Supabase 1x jika belum ada di cache tab
    setDiagLoading(true);
    const data = await fetchExamSnapshot(row.id);

    if (data && data.review_snapshot) {
      let snap = data.review_snapshot;
      if (typeof snap === 'string') {
        try {
          snap = JSON.parse(snap);
          if (typeof snap === 'string') {
            snap = JSON.parse(snap);
          }
        } catch (e) {
          console.error('Gagal memecah JSON:', e);
        }
      }

      if (snap?.questions && snap.questions.length > 0) {
        const computed = computeDiagnostics(snap.questions, snap.answers);
        setDiags(computed);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(computed));
        } catch {
          // Abaikan
        }
      }
    }
    setDiagLoading(false);
  }

  // Pulihkan otomatis ujian yang sedang dibuka di tab Per Ujian saat di-refresh
  useEffect(() => {
    if (activeTab !== 'per-exam') return;
    if (!examIdFromUrl) return;
    if (results.length === 0) return;
    if (restoredExamRef.current === examIdFromUrl) return;

    const foundRow = results.find((r) => String(r.id) === String(examIdFromUrl));
    if (foundRow) {
      restoredExamRef.current = examIdFromUrl;
      loadExamDiagnostics(foundRow, false);
    }
  }, [activeTab, examIdFromUrl, results]);

  const handleTabSwitch = (nextTab: string) => {
    if (nextTab === 'overall') {
      setSearchParams({ participant: String(participant.id), tab: 'overall' }, { replace: true });
    } else {
      const nextParams: Record<string, string> = {
        participant: String(participant.id),
        tab: 'per-exam',
      };
      if (selectedResult?.id) {
        nextParams.exam = String(selectedResult.id);
      }
      setSearchParams(nextParams, { replace: true });
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const isSelectedDrilling = selectedResult ? isDrillingPackage(selectedResult.package_type) : false;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {participant.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-800 truncate">{participant.full_name}</h2>
            <p className="text-sm text-gray-500 truncate">{participant.email}</p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'overall', label: 'Ringkasan Keseluruhan', icon: LineChart },
          { id: 'per-exam', label: 'Per Ujian', icon: LayoutGrid },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabSwitch(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-white text-[#1e3a8a] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat riwayat ujian...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Peserta belum memiliki riwayat ujian.</p>
        </div>
      ) : activeTab === 'overall' ? (
        <OverallView
          results={results}
          participantId={participant.id}
          onSwitchPerExam={() => handleTabSwitch('per-exam')}
        />
      ) : (
        /* ── Per-exam tab ─────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: result list */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" /> Riwayat Ujian
            </h3>
            {results.map((r) => {
              const isSelected = selectedResult?.id === r.id;
              const isRowDrilling = isDrillingPackage(r.package_type);
              return (
                <button
                  key={r.id}
                  onClick={() => loadExamDiagnostics(r, true)}
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
                      {isRowDrilling ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Drilling
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            r.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {r.passed ? 'Lulus' : 'Belum'}
                        </span>
                      )}
                      <span className="text-sm font-bold text-[#1e3a8a]">{r.total_score}</span>
                      <ChevronRight className={`w-4 h-4 transition-colors ${isSelected ? 'text-[#1e3a8a]' : 'text-gray-300'}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: per-exam diagnostics */}
          <div className="lg:col-span-2">
            {!selectedResult ? (
              <div className="h-full min-h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 gap-2 p-8">
                <Target className="w-8 h-8 opacity-50" />
                <p className="text-sm font-medium">Pilih riwayat ujian di sebelah kiri untuk melihat diagram kompetensi</p>
              </div>
            ) : diagLoading ? (
              <div className="flex items-center justify-center h-48 gap-2 text-[#1e3a8a]">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-semibold">Menarik detail dari database...</span>
              </div>
            ) : diags.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <AlertCircle className="w-6 h-6 opacity-50" />
                <p className="text-sm">Data soal tidak tersedia untuk ujian ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score summary */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4">
                  {[
                    { label: 'Total Skor', value: selectedResult.total_score, color: 'text-[#1e3a8a]' },
                    { label: 'TIU', value: selectedResult.score_tiu, color: 'text-blue-600' },
                    { label: 'TWK', value: selectedResult.score_twk, color: 'text-emerald-600' },
                    { label: 'TKP', value: selectedResult.score_tkp, color: 'text-amber-600' },
                  ].map((s) => (
                    <div key={s.label} className="text-center flex-1 min-w-12">
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                  <div className="text-center flex-1 min-w-12">
                    {isSelectedDrilling ? (
                      <p className="text-lg sm:text-xl font-black text-purple-600 pt-1">
                        Drilling
                      </p>
                    ) : (
                      <p className={`text-2xl font-black ${selectedResult.passed ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {selectedResult.passed ? 'Lulus' : 'Belum'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">Status</p>
                  </div>
                </div>
                {/* Donut charts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {diags.map((diag) => (
                    <CategoryCard key={diag.id} diag={diag} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main list view (SINKRON URL ?participant=) ──────────────────────────────

export default function ParticipantDiagnostic() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examCounts, setExamCounts] = useState<Record<string, number>>({});

  const participantIdFromUrl = searchParams.get('participant');

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

        const ids = profiles.map((p) => p.id);
        if (ids.length > 0) {
          const { data: counts } = await supabase
            .from('exam_results')
            .select('participant_id')
            .in('participant_id', ids)
            .not('is_deleted', 'eq', true);
          if (counts) {
            const map: Record<string, number> = {};
            counts.forEach((r: any) => {
              map[r.participant_id] = (map[r.participant_id] ?? 0) + 1;
            });
            setExamCounts(map);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const selectedParticipant = useMemo(() => {
    if (!participantIdFromUrl) return null;
    return participants.find((p) => String(p.id) === String(participantIdFromUrl)) ?? null;
  }, [participants, participantIdFromUrl]);

  const q = search.toLowerCase();
  const filtered = participants.filter((p) => {
    const matchName = p.full_name.toLowerCase().includes(q);
    const matchEmail = p.email.toLowerCase().includes(q);
    return matchName ? true : matchEmail;
  });

  // Saat halaman di-refresh pada URL ?participant=..., tampilkan loading halus (bukan berkedip ke daftar peserta)
  if (loading && participantIdFromUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#1e3a8a]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-semibold">Memuat diagram kompetensi peserta...</p>
      </div>
    );
  }

  if (selectedParticipant) {
    return (
      <ParticipantDetail
        participant={selectedParticipant}
        onBack={() => setSearchParams({}, { replace: false })}
      />
    );
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
              const count = examCounts[p.id] ?? 0;
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSearchParams({ participant: String(p.id) }, { replace: false })}
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
                      {count > 0 ? (
                        <span className="text-[10px] font-medium text-gray-400 flex items-center gap-0.5">
                          <BookOpen className="w-3 h-3" /> {count} ujian
                        </span>
                      ) : (
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
