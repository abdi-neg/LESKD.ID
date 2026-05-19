import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Check, X, Search, Filter,
  BookOpen, Image, Loader2, RefreshCw, FileUp, Package, ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { Question, Category, AnswerOption, ExamPackage, PackageType, OptionType } from '../../types';
import { supabase } from '../../lib/supabase';
import DocxImporter from './DocxImporter';

const CATEGORIES: Category[] = ['TIU', 'TWK', 'TKP'];
const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

// Required questions per category per package type
const PACKAGE_REQUIREMENTS: Record<PackageType, Partial<Record<Category, number>>> = {
  MINI_TIU: { TIU: 35 },
  MINI_TWK: { TWK: 30 },
  MINI_TKP: { TKP: 45 },
  FULL: { TIU: 35, TWK: 30, TKP: 45 },
};

const TYPE_LABELS: Record<PackageType, string> = {
  MINI_TIU: 'Mini Tryout TIU',
  MINI_TWK: 'Mini Tryout TWK',
  MINI_TKP: 'Mini Tryout TKP',
  FULL: 'Full CAT Simulasi',
};

const emptyForm = {
  category: 'TIU' as Category,
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  option_e: '',
  correct_answer: 'A' as AnswerOption,
  explanation: '',
  image_url: null as string | null,
  option_type: 'text' as OptionType,
  points_a: 0,
  points_b: 0,
  points_c: 0,
  points_d: 0,
  points_e: 0,
};

const catColors: Record<string, string> = {
  TIU: 'bg-blue-100 text-blue-700',
  TWK: 'bg-emerald-100 text-emerald-700',
  TKP: 'bg-rose-100 text-rose-700',
};

// Dummy subcomponent to fix undefined PackageCompletenessCard
function PackageCompletenessCard({ counts, requirements }: { pkg: ExamPackage; counts: any; requirements: any }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs text-gray-500 flex gap-4">
      <div><b>TIU:</b> {counts.TIU} / {requirements.TIU || 0}</div>
      <div><b>TWK:</b> {counts.TWK} / {requirements.TWK || 0}</div>
      <div><b>TKP:</b> {counts.TKP} / {requirements.TKP || 0}</div>
    </div>
  );
}

export default function QuestionManager() {
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<ExamPackage | null>(null);
  const [pkgDropdownOpen, setPkgDropdownOpen] = useState(false);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<Category | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadPackages() {
      setLoadingPkgs(true);
      const { data } = await supabase
        .from('exam_packages')
        .select('*')
        .order('created_at');
      if (data) setPackages(data as ExamPackage[]);
      setLoadingPkgs(false);
    }
    loadPackages();
  }, []);

  async function loadQuestions() {
    if (!selectedPkg) return;
    setLoading(true);
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('package_id', selectedPkg.id)
      .order('category')
      .order('created_at');
    if (data) setQuestions(data as Question[]);
    setLoading(false);
  }

  useEffect(() => {
    if (selectedPkg) {
      setQuestions([]);
      setSearch('');
      setFilterCat('ALL');
      loadQuestions();
    } else {
      setQuestions([]);
    }
  }, [selectedPkg]);

  const catCounts = {
    TIU: questions.filter((q) => q.category === 'TIU').length,
    TWK: questions.filter((q) => q.category === 'TWK').length,
    TKP: questions.filter((q) => q.category === 'TKP').length,
  };

  const requirements = selectedPkg ? PACKAGE_REQUIREMENTS[selectedPkg.package_type] : {};

  const filtered = questions.filter((q) => {
    const matchCat = filterCat === 'ALL' || q.category === filterCat;
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, image_url: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('question-images')
      .upload(path, file, { upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from('question-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPkg) return;
    setSaving(true);

    let imageUrl = form.image_url;
    if (imageFile) {
      setUploadingImage(true);
      imageUrl = await uploadImage(imageFile);
      setUploadingImage(false);
    }

    const payload = { ...form, image_url: imageUrl, package_id: selectedPkg.id };

    if (editId) {
      await supabase.from('questions').update(payload).eq('id', editId);
    } else {
      await supabase.from('questions').insert(payload);
    }

    setSaving(false);
    cancelForm();
    loadQuestions();
  }

  function startEdit(q: any) {
    setForm({
      category: q.category,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      image_url: q.image_url ?? null,
      option_type: q.option_type ?? 'text',
      points_a: q.points_a ?? 0,
      points_b: q.points_b ?? 0,
      points_c: q.points_c ?? 0,
      points_d: q.points_d ?? 0,
      points_e: q.points_e ?? 0,
    });
    setImageFile(null);
    setImagePreview(q.image_url ?? null);
    setEditId(q.id);
    setShowForm(true);
    setShowImporter(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function confirmDelete(id: string) {
    await supabase.from('questions').delete().eq('id', id);
    setDeleteId(null);
    loadQuestions();
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kelola Soal</h2>
          <p className="text-gray-500 text-sm mt-0.5">Pilih paket terlebih dahulu untuk mengelola soal</p>
        </div>
        <button onClick={() => { if (selectedPkg) loadQuestions(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Package Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-[#1e3a8a]" />
          <span className="text-sm font-semibold text-gray-700">Paket Ujian yang Dikelola</span>
        </div>

        {loadingPkgs ? (
          <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
        ) : packages.length === 0 ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Belum ada paket ujian. Buat paket di tab &ldquo;Paket Ujian&rdquo; terlebih dahulu.
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setPkgDropdownOpen(!pkgDropdownOpen)}
              className="w-full flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm text-left hover:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 transition-colors bg-white"
            >
              {selectedPkg ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                    selectedPkg.package_type === 'MINI_TIU' ? 'bg-blue-100 text-blue-700' :
                    selectedPkg.package_type === 'MINI_TWK' ? 'bg-emerald-100 text-emerald-700' :
                    selectedPkg.package_type === 'MINI_TKP' ? 'bg-rose-100 text-rose-700' :
                    'bg-[#1e3a8a]/10 text-[#1e3a8a]'
                  }`}>
                    {TYPE_LABELS[selectedPkg.package_type]}
                  </span>
                  <span className="font-medium text-gray-800 truncate">{selectedPkg.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${selectedPkg.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedPkg.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400">-- Pilih paket ujian --</span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${pkgDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {pkgDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto"
                >
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => { setSelectedPkg(pkg); setPkgDropdownOpen(false); cancelForm(); setShowImporter(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                        ${selectedPkg?.id === pkg.id ? 'bg-blue-50' : ''}`}
                    >
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                        pkg.package_type === 'MINI_TIU' ? 'bg-blue-100 text-blue-700' :
                        pkg.package_type === 'MINI_TWK' ? 'bg-emerald-100 text-emerald-700' :
                        pkg.package_type === 'MINI_TKP' ? 'bg-rose-100 text-rose-700' :
                        'bg-[#1e3a8a]/10 text-[#1e3a8a]'
                      }`}>
                        {TYPE_LABELS[pkg.package_type]}
                      </span>
                      <span className="font-medium text-gray-800 flex-1 truncate text-sm">{pkg.name}</span>
                      {selectedPkg?.id === pkg.id && <Check className="w-4 h-4 text-[#1e3a8a] flex-shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!selectedPkg && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Pilih paket ujian di atas</p>
          <p className="text-sm text-gray-400 mt-1">Soal akan ditampilkan berdasarkan paket yang dipilih</p>
        </div>
      )}

      {selectedPkg && (
        <>
          <PackageCompletenessCard pkg={selectedPkg} counts={catCounts} requirements={requirements} />

          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setShowImporter(!showImporter); if (showForm) cancelForm(); }}
              className={`flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm ${showImporter ? 'bg-amber-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
            >
              <FileUp className="w-4 h-4" />
              Import Word
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { cancelForm(); setShowForm(true); setShowImporter(false); }}
              className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Soal
            </motion.button>
          </div>

          <AnimatePresence>
            {showImporter && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <DocxImporter packageId={selectedPkg.id} packageType={selectedPkg.package_type} onImported={() => { setShowImporter(false); loadQuestions(); }} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#1e3a8a]" />
                      {editId ? 'Edit Soal' : 'Tambah Soal Baru'}
                    </h3>
                    <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    <Package className="w-4 h-4 text-[#1e3a8a]" />
                    <span className="text-xs text-gray-500">Paket:</span>
                    <span className="text-sm font-semibold text-[#1e3a8a]">{selectedPkg.name}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {form.category !== 'TKP' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Jawaban Benar</label>
                        <select
                          value={form.correct_answer}
                          onChange={(e) => setForm({ ...form, correct_answer: e.target.value as AnswerOption })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                        >
                          {OPTIONS.map((o) => <option key={o} value={o}>Opsi {o}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Teks Pertanyaan</label>
                    <textarea
                      value={form.question_text}
                      onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                      rows={3}
                      required
                      placeholder="Masukkan pertanyaan di sini..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a] resize-none"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Gambar Soal (opsional)</label>
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview soal" className="max-h-48 max-w-full rounded-xl border border-gray-200 object-contain" />
                        <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1e3a8a] hover:bg-blue-50/30">
                        <Image className="w-7 h-7 text-gray-300 mb-2" />
                        <span className="text-sm text-gray-500">Klik untuk upload gambar</span>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Pilihan Jawaban</label>
                    <div className="flex gap-2">
                      {(['text', 'image'] as OptionType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm({ ...form, option_type: t })}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${form.option_type === t ? 'border-[#1e3a8a] bg-[#1e3a8a]/5 text-[#1e3a8a]' : 'border-gray-200 bg-white text-gray-500'}`}
                        >
                          {t === 'text' ? 'Teks' : 'Gambar (Figural)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options Input Block with TKP Points */}
                  <div className="space-y-3 mb-4">
                    {OPTIONS.map((opt) => {
                      const keyTxt = `option_${opt.toLowerCase()}` as keyof typeof form;
                      const keyPts = `points_${opt.toLowerCase()}` as keyof typeof form;
                      const isCorrect = opt === form.correct_answer && form.category !== 'TKP';

                      return (
                        <div key={opt} className={`p-3 rounded-2xl border ${isCorrect ? 'border-[#10b981] bg-emerald-50' : 'border-gray-200'}`}>
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div className="flex-1 w-full">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Opsi {opt}</label>
                              <input
                                value={form[keyTxt] as string}
                                onChange={(e) => setForm({ ...form, [keyTxt]: e.target.value })}
                                required
                                placeholder={form.option_type === 'text' ? `Isi teks opsi ${opt}` : `Masukkan URL Gambar opsi ${opt}`}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                              />
                            </div>
                            {form.category === 'TKP' && (
                              <div className="w-full sm:w-28">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Poin (1-5)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={form[keyPts] as number}
                                  onChange={(e) => setForm({ ...form, [keyPts]: parseInt(e.target.value) || 0 })}
                                  required
                                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center font-bold bg-amber-50 text-amber-900 focus:ring-amber-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pembahasan / Penjelasan Jawaban</label>
                    <textarea
                      value={form.explanation}
                      onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                      rows={3}
                      placeholder="Jelaskan mengapa jawaban tersebut benar..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={cancelForm} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm">Batal</button>
                    <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#10b981] text-white font-semibold text-sm disabled:opacity-60">
                      {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Soal'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari soal..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {(['ALL', ...CATEGORIES] as const).map((cat) => (
                <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterCat === cat ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {cat === 'ALL' ? 'Semua' : cat} {cat !== 'ALL' && `(${catCounts[cat]})`}
                </button>
              ))}
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {filtered.map((q: any, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColors[q.category]}`}>{q.category}</span>
                      <span className="text-xs text-gray-400">#{q.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium line-clamp-2">{q.question_text}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {OPTIONS.map((opt) => {
                        const val = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                        const isCorrect = opt === q.correct_answer && q.category !== 'TKP';
                        const pts = q[`points_${opt.toLowerCase()}` as any];
                        return (
                          <span key={opt} className={`text-xs px-2 py-0.5 rounded-md ${isCorrect ? 'bg-[#10b981] text-white font-semibold' : 'bg-gray-100 text-gray-500'}`}>
                            {opt}: {val?.slice(0, 15)}{val?.length > 15 ? '...' : ''} 
                            {q.category === 'TKP' && <b className="ml-1 text-amber-700">({pts || 0}p)</b>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => startEdit(q)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => { if(confirm('Hapus soal ini?')) confirmDelete(q.id) }} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
