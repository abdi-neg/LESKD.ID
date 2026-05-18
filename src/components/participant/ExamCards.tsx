import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Globe, Heart, Zap, Clock, BookOpen, ChevronRight, Key, RefreshCw } from 'lucide-react';
import { useApp, packageTypeToExamType } from '../../context/AppContext';
import { ExamPackage, PackageType } from '../../types';
import { supabase } from '../../lib/supabase';
import TokenGate from '../exam/TokenGate';

const PKG_META: Record<PackageType, {
  icon: React.ElementType;
  gradient: string;
  tagColor: string;
}> = {
  MINI_TIU: { icon: Brain, gradient: 'from-blue-500 to-blue-700', tagColor: 'bg-blue-100 text-blue-700' },
  MINI_TWK: { icon: Globe, gradient: 'from-emerald-500 to-emerald-700', tagColor: 'bg-emerald-100 text-emerald-700' },
  MINI_TKP: { icon: Heart, gradient: 'from-rose-500 to-rose-700', tagColor: 'bg-rose-100 text-rose-700' },
  FULL: { icon: Zap, gradient: 'from-[#1e3a8a] to-[#1e40af]', tagColor: 'bg-slate-100 text-slate-700' },
};

const TYPE_LABELS: Record<PackageType, string> = {
  MINI_TIU: 'Mini Tryout TIU',
  MINI_TWK: 'Mini Tryout TWK',
  MINI_TKP: 'Mini Tryout TKP',
  FULL: 'Full CAT Simulation',
};

import { EXAM_CONFIGS } from '../../data/mockData';

export default function ExamCards() {
  const { startExam } = useApp();
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<ExamPackage | null>(null);

  async function loadPackages() {
    setLoading(true);
    const { data } = await supabase
      .from('exam_packages')
      .select('*')
      .eq('is_active', true)
      .order('created_at');
    if (data) setPackages(data as ExamPackage[]);
    setLoading(false);
  }

  useEffect(() => { loadPackages(); }, []);

  async function handleTokenSuccess() {
    if (!selectedPkg) return;
    setStarting(true);
    const examType = packageTypeToExamType(selectedPkg.package_type);
    await startExam(examType, selectedPkg);
    setStarting(false);
    setSelectedPkg(null);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Belum ada paket ujian tersedia</p>
        <p className="text-gray-400 text-sm mt-1">Hubungi Admin untuk mengaktifkan paket ujian</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Paket Ujian Tersedia</h2>
        <button onClick={loadPackages} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg, i) => {
          const meta = PKG_META[pkg.package_type] ?? PKG_META.FULL;
          const examType = packageTypeToExamType(pkg.package_type);
          const config = EXAM_CONFIGS[examType];
          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
              onClick={() => setSelectedPkg(pkg)}
            >
              <div className={`bg-gradient-to-br ${meta.gradient} p-5`}>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
                    <meta.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                    <Key className="w-3 h-3" /> Token
                  </span>
                </div>
                <h3 className="text-white font-bold text-sm mt-4 leading-tight">{pkg.name}</h3>
              </div>

              <div className="p-4">
                <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">
                  {pkg.description || TYPE_LABELS[pkg.package_type]}
                </p>
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{config.questionCount} Soal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{config.timeMinutes} Menit</span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-700 group-hover:bg-gray-100 border border-gray-200 flex items-center justify-center gap-1.5 transition-all"
                >
                  Masukkan Token
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedPkg && (
          <TokenGate
            pkg={selectedPkg}
            onSuccess={handleTokenSuccess}
            onClose={() => setSelectedPkg(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {starting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4"
          >
            <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#1e3a8a] font-semibold text-sm">Memuat soal ujian...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
