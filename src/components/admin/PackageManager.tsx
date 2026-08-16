import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 🌟 1. TAMBAHAN IMPORT: MonitorPlay (Icon Proyektor)
import { Plus, Trash2, CreditCard as Edit3, Check, X, RefreshCw, Copy, ToggleLeft, ToggleRight, CheckCircle2, BarChart2, ChevronDown, GraduationCap, BookOpen, Calculator, Users, MonitorPlay } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
// 🌟 2. TAMBAHAN IMPORT: useNavigate
import { useNavigate } from 'react-router-dom';
import { ExamPackage, PackageType } from '../../types';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { EXAM_CONFIGS } from '../../data/mockData';

interface QuestionCounts {
  TIU: number;
  TWK: number;
  TKP: number;
}

type PerPackageCounts = Record<string, QuestionCounts>;

const PKG_TYPES: PackageType[] = ['MINI_TIU', 'MINI_TWK', 'MINI_TKP', 'FULL'];
const TYPE_LABELS: Record<PackageType, string> = {
  MINI_TIU: 'Mini Tryout TIU',
  MINI_TWK: 'Mini Tryout TWK',
  MINI_TKP: 'Mini Tryout TKP',
  FULL: 'Full CAT Simulation',
};

// 🌟 UBAH WARNA TKP MENJADI AMBER
const TYPE_COLORS: Record<PackageType, string> = {
  MINI_TIU: 'bg-blue-100 text-blue-700',
  MINI_TWK: 'bg-emerald-100 text-emerald-700',
  MINI_TKP: 'bg-amber-100 text-amber-700',
  FULL: 'bg-[#1e3a8a]/10 text-[#1e3a8a]',
};

function generateToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const emptyForm = {
  name: '',
  description: '',
  package_type: 'FULL' as PackageType,
  token: generateToken(),
  auto_refresh_token: false,
  is_active: true,
};

// 🌟 UBAH WARNA ICON DAN ACCORDION TKP MENJADI AMBER
const CATEGORY_GROUPS: { type: PackageType; label: string; Icon: LucideIcon; iconBg: string; iconColor: string; color: string; border: string; headerBg: string }[] = [
  { type: 'FULL',     label: 'Full Simulasi CAT', Icon: GraduationCap, iconBg: 'bg-[#1e3a8a]/10', iconColor: 'text-[#1e3a8a]',  color: 'text-[#1e3a8a]',  border: 'border-[#1e3a8a]/20', headerBg: 'bg-[#1e3a8a]/5'  },
  { type: 'MINI_TWK', label: 'Mini Tryout TWK',   Icon: BookOpen,      iconBg: 'bg-emerald-100',   iconColor: 'text-emerald-600', color: 'text-emerald-700', border: 'border-emerald-200',  headerBg: 'bg-emerald-50'   },
  { type: 'MINI_TIU', label: 'Mini Tryout TIU',   Icon: Calculator,    iconBg: 'bg-blue-100',      iconColor: 'text-blue-600',    color: 'text-blue-700',    border: 'border-blue-200',    headerBg: 'bg-blue-50'      },
  { type: 'MINI_TKP', label: 'Mini Tryout TKP',   Icon: Users,         iconBg: 'bg-amber-100',     iconColor: 'text-amber-600',   color: 'text-amber-700',   border: 'border-amber-200',   headerBg: 'bg-amber-50'     },
];

interface PackageCategoryListProps {
  packages: ExamPackage[];
  perPkgCounts: PerPackageCounts;
  copiedId: string | null;
  copyToken: (pkg: ExamPackage) => void;
  updateToken: (pkg: ExamPackage, token: string) => void;
  toggleActive: (pkg: ExamPackage) => void;
  startEdit: (pkg: ExamPackage) => void;
  setDeleteId: (id: string) => void;
}

function PackageCategoryList({ packages, perPkgCounts, copiedId, copyToken, updateToken, toggleActive, startEdit, setDeleteId }: PackageCategoryListProps) {
  const [openCategories, setOpenCategories] = useState<Set<PackageType>>(new Set());
  
  // 🌟 3. INISIALISASI NAVIGATE DI SINI
  const navigate = useNavigate();

  const toggleCategory = (type: PackageType) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {CATEGORY_GROUPS.map(({ type, label, Icon, iconBg, iconColor, color, border, headerBg }) => {
        const group = packages.filter((p) => p.package_type === type);
        if (group.length === 0) return null;
        const isOpen = openCategories.has(type);

        return (
          <div key={type} className={`rounded-2xl border ${border} overflow-hidden bg-white shadow-sm`}>
            {/* Accordion Header */}
            <button
              onClick={() => toggleCategory(type)}
              className={`w-full flex items-center justify-between px-4 py-3.5 ${headerBg} hover:brightness-95 transition-all`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <span className={`text-sm font-bold ${color}`}>{label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 ${color}`}>
                  {group.length} paket
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 ${color} opacity-70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Accordion Body */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key={`body-${type}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className="overflow-y-auto scrollbar-thin divide-y divide-gray-50"
                    style={{ maxHeight: '372px' }}
                  >
                    {group.map((pkg) => {
                      const examType = pkg.package_type === 'MINI_TIU' ? 'TIU'
                        : pkg.package_type === 'MINI_TWK' ? 'TWK'
                        : pkg.package_type === 'MINI_TKP' ? 'TKP' : 'FULL';
                      const config = EXAM_CONFIGS[examType as keyof typeof EXAM_CONFIGS];

                      return (
                        <div key={pkg.id} className="px-4 py-4 hover:bg-gray-50/60 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pkg.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {pkg.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                                {pkg.auto_refresh_token && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Auto-Refresh</span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-800 mb-1 text-sm">{pkg.name}</h3>
                              {pkg.description && <p className="text-xs text-gray-400 mb-2">{pkg.description}</p>}
                              <div className="flex flex-wrap items-center gap-2.5">
                                <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-1.5">
                                  <span className="text-xs text-gray-400">Token:</span>
                                  <span className="font-mono font-bold text-gray-800 tracking-widest text-xs">{pkg.token}</span>
                                  <button onClick={() => copyToken(pkg)} className="text-gray-400 hover:text-[#1e3a8a] transition-colors">
                                    {copiedId === pkg.id ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => updateToken(pkg, generateToken())}
                                    className="text-gray-400 hover:text-[#1e3a8a] transition-colors"
                                    title="Generate token baru"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="text-xs text-gray-400">{config.questionCount} soal · {config.timeMinutes} menit</span>
                                <QuestionCountBadge pkg={pkg} counts={perPkgCounts[pkg.id] ?? { TIU: 0, TWK: 0, TKP: 0 }} />
                              </div>
                            </div>
                            
                            {/* 🌟 4. PENEMPATAN TOMBOL "BAHAS KELAS" DI SINI */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              
                              {/* TOMBOL BARU: BAHAS KELAS (PROYEKTOR) */}
                              <button 
                                onClick={() => navigate(`/admin/pembahasan-kelas/${pkg.id}`)} 
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                                title="Buka Mode Proyektor untuk Pembahasan Kelas"
                              >
                                <MonitorPlay className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold hidden sm:block">Bahas Kelas</span>
                              </button>

                              {/* Tombol Status */}
                              <button onClick={() => toggleActive(pkg)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${pkg.is_active ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                                {pkg.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              </button>
                              
                              {/* Tombol Edit */}
                              <button onClick={() => startEdit(pkg)} className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center transition-colors">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Tombol Hapus */}
                              <button onClick={() => setDeleteId(pkg.id)} className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function PackageManager() {
  const { state } = useApp();
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [initialLoading, setInitialLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [perPkgCounts, setPerPkgCounts] = useState<PerPackageCounts>({});

  async function loadQuestionCounts(pkgList: ExamPackage[]) {
    if (pkgList.length === 0) return;
    const { data } = await supabase
      .from('questions')
      .select('category, package_id')
      .in('package_id', pkgList.map((p) => p.id));

    const counts: PerPackageCounts = {};
    pkgList.forEach((p) => {
      counts[p.id] = { TIU: 0, TWK: 0, TKP: 0 };
    });
    (data ?? []).forEach((row: { category: string; package_id: string }) => {
      if (counts[row.package_id] && (row.category === 'TIU' || row.category === 'TWK' || row.category === 'TKP')) {
        counts[row.package_id][row.category as keyof QuestionCounts]++;
      }
    });
    setPerPkgCounts(counts);
  }

  async function load(isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const { data } = await supabase.from('exam_packages').select('*').order('created_at');
      const pkgList = (data ?? []) as ExamPackage[];
      setPackages(pkgList);
      await loadQuestionCounts(pkgList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setInitialLoading(false); 
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, created_by: state.profile?.id, token_updated_at: new Date().toISOString() };

    if (editId) {
      await supabase.from('exam_packages').update(payload).eq('id', editId);
    } else {
      await supabase.from('exam_packages').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    load(); 
  }

  function startEdit(pkg: ExamPackage) {
    setForm({
      name: pkg.name,
      description: pkg.description,
      package_type: pkg.package_type,
      token: pkg.token,
      auto_refresh_token: pkg.auto_refresh_token,
      is_active: pkg.is_active,
    });
    setEditId(pkg.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function updateToken(pkg: ExamPackage, newToken: string) {
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, token: newToken } : p));
    await supabase
      .from('exam_packages')
      .update({ token: newToken, token_updated_at: new Date().toISOString() })
      .eq('id', pkg.id);
    load(true); 
  }

  async function toggleActive(pkg: ExamPackage) {
    const targetStatus = !pkg.is_active;
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, is_active: targetStatus } : p));
    
    await supabase
      .from('exam_packages')
      .update({ is_active: targetStatus })
      .eq('id', pkg.id);
      
    load(true); 
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await supabase.from('exam_packages').delete().eq('id', deleteId);
    setDeleteId(null);
    load(true); 
  }

  function copyToken(pkg: ExamPackage) {
    navigator.clipboard.writeText(pkg.token);
    copiedId === pkg.id ? null : setCopiedId(pkg.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Paket Ujian</h2>
          <p className="text-gray-500 text-sm mt-1">{packages.length} paket terdaftar</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setForm({ ...emptyForm, token: generateToken() }); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Paket
        </motion.button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-800">{editId ? 'Edit Paket' : 'Buat Paket Baru'}</h3>
                <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Paket</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Contoh: Tryout TIU Reguler"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Paket</label>
                  <select
                    value={form.package_type}
                    onChange={(e) => setForm({ ...form, package_type: e.target.value as PackageType })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                  >
                    {PKG_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Deskripsi singkat paket ujian"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Token Akses (6 digit)</label>
                  <div className="flex gap-2">
                    <input
                      value={form.token}
                      onChange={(e) => setForm({ ...form, token: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      required
                      maxLength={6}
                      placeholder="000000"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, token: generateToken() })}
                      className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
                      title="Generate acak"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, auto_refresh_token: !form.auto_refresh_token })}
                      className="text-gray-400"
                    >
                      {form.auto_refresh_token
                        ? <ToggleRight className="w-8 h-8 text-[#10b981]" />
                        : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Auto-Refresh Token</p>
                      <p className="text-xs text-gray-500">Perbarui token otomatis tiap 60 menit</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    >
                      {form.is_active
                        ? <ToggleRight className="w-8 h-8 text-[#10b981]" />
                        : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Aktif</p>
                      <p className="text-xs text-gray-500">Tampilkan ke peserta</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 text-sm">Batal</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editId ? 'Simpan' : 'Buat Paket'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <QuestionCountBadges perPkgCounts={perPkgCounts} packages={packages} />

      {initialLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-16 animate-pulse" />)}</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">Belum ada paket ujian</p>
        </div>
      ) : (
        <PackageCategoryList
          packages={packages}
          perPkgCounts={perPkgCounts}
          copiedId={copiedId}
          copyToken={copyToken}
          updateToken={updateToken}
          toggleActive={toggleActive}
          startEdit={startEdit}
          setDeleteId={setDeleteId}
        />
      )}

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Hapus Paket?</h3>
              <p className="text-gray-500 text-sm mb-6">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">Batal</button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const REQUIRED_COUNTS: Record<PackageType, Partial<Record<keyof QuestionCounts, number>>> = {
  MINI_TIU: { TIU: 35 },
  MINI_TWK: { TWK: 30 },
  MINI_TKP: { TKP: 45 },
  FULL: { TIU: 35, TWK: 30, TKP: 45 },
};

// 🌟 UBAH WARNA TKP MENJADI AMBER
const CAT_BADGE: Record<string, string> = {
  TIU: 'bg-blue-100 text-blue-700',
  TWK: 'bg-emerald-100 text-emerald-700',
  TKP: 'bg-amber-100 text-amber-700',
};

type SummaryTab = 'all' | 'full' | 'mini';

function QuestionCountBadges({ perPkgCounts, packages }: { perPkgCounts: PerPackageCounts; packages: ExamPackage[] }) {
  const [tab, setTab] = useState<SummaryTab>('all');
  const [open, setOpen] = useState(false);

  if (packages.length === 0) return null;

  const filtered = packages.filter((pkg) => {
    if (tab === 'full') return pkg.package_type === 'FULL';
    if (tab === 'mini') return pkg.package_type !== 'FULL';
    return true;
  });

  const tabs: { key: SummaryTab; label: string; count: number }[] = [
    { key: 'all', label: 'Semua', count: packages.length },
    { key: 'full', label: 'Full Simulasi', count: packages.filter((p) => p.package_type === 'FULL').length },
    { key: 'mini', label: 'Mini Tryout', count: packages.filter((p) => p.package_type !== 'FULL').length },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Accordion trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-[#1e3a8a]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">Ringkasan Kelengkapan Soal Per Paket</p>
            {!open && (
              <p className="text-xs text-gray-400 mt-0.5">{packages.length} paket · klik untuk lihat detail</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Accordion body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="summary-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* Tab filter */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl mt-4 mb-4 w-fit">
                {tabs.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {label}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Grid */}
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Tidak ada paket di kategori ini.</p>
              ) : (
                <div className="overflow-y-auto pr-1 scrollbar-thin" style={{ maxHeight: '280px' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((pkg) => {
                    const counts = perPkgCounts[pkg.id] ?? { TIU: 0, TWK: 0, TKP: 0 };
                    const reqs = REQUIRED_COUNTS[pkg.package_type];
                    const cats = Object.keys(reqs) as (keyof QuestionCounts)[];
                    const allComplete = cats.every((c) => counts[c] >= (reqs[c] ?? 0));
                    const anyProgress = cats.some((c) => counts[c] > 0);

                    return (
                      <div
                        key={pkg.id}
                        className={`rounded-xl border p-3.5 transition-colors
                          ${allComplete
                            ? 'bg-emerald-50 border-emerald-200'
                            : anyProgress
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{pkg.name}</p>
                            <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${TYPE_COLORS[pkg.package_type]}`}>
                              {TYPE_LABELS[pkg.package_type]}
                            </span>
                          </div>
                          {allComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-[#10b981] flex-shrink-0 mt-0.5" />
                          ) : (
                            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-amber-400" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cats.map((cat) => {
                            const current = counts[cat];
                            const required = reqs[cat] ?? 0;
                            const done = current >= required;
                            return (
                              <div
                                key={cat}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold
                                  ${done ? 'bg-[#10b981]/15 text-[#059669]' : current > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}
                              >
                                <span className="font-bold">{cat}</span>
                                <span className="opacity-70">{current}/{required}</span>
                                {done && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestionCountBadge({ pkg, counts }: { pkg: ExamPackage; counts: QuestionCounts }) {
  const reqs = REQUIRED_COUNTS[pkg.package_type];
  const cats = Object.keys(reqs) as (keyof QuestionCounts)[];
  const allComplete = cats.every((c) => counts[c] >= (reqs[c] ?? 0));

  const parts = cats.map((c) => `${c}: ${counts[c]}/${reqs[c]}`).join(' · ');

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${allComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
      {allComplete && <CheckCircle2 className="w-3 h-3" />}
      {parts}
    </span>
  );
}
