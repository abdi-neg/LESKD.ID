import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, CreditCard as Edit3, Check, X, Search, Filter,
  BookOpen, Image, Loader2, RefreshCw, FileUp, Package, ChevronDown,
  CheckCircle2, AlertCircle,
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
};

const catColors: Record<string, string> = {
  TIU: 'bg-blue-100 text-blue-700',
  TWK: 'bg-emerald-100 text-emerald-700',
  TKP: 'bg-rose-100 text-rose-700',
};

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

  // Load packages on mount
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

  // Per-category counts for selected package
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

  // Image helpers
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

  function startEdit(q: Question) {
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

      {/* Package not selected state */}
      {!selectedPkg && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">Pilih paket ujian di atas</p>
          <p className="text-sm text-gray-400 mt-1">Soal akan ditampilkan berdasarkan paket yang dipilih</p>
        </div>
      )}

      {/* Content when package is selected */}
      {selectedPkg && (
        <>
          {/* Completeness Indicator for selected package */}
          <PackageCompletenessCard pkg={selectedPkg} counts={catCounts} requirements={requirements} />

          {/* Action Buttons */}
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

          {/* Docx Importer */}
          <AnimatePresence>
            {showImporter && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <DocxImporter
                  packageId={selectedPkg.id}
                  packageType={selectedPkg.package_type}
                  onImported={() => { setShowImporter(false); loadQuestions(); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add/Edit Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
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

                  {/* Package badge */}
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

                  {/* Image Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Gambar Soal <span className="text-gray-400 font-normal">(opsional — untuk soal figural)</span>
                    </label>
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview soal" className="max-h-48 max-w-full rounded-xl border border-gray-200 object-contain" />
                        <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1e3a8a] hover:bg-blue-50/30 transition-colors">
                        <Image className="w-7 h-7 text-gray-300 mb-2" />
                        <span className="text-sm text-gray-500">Klik untuk upload gambar</span>
                        <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, GIF, WebP — maks 5MB</span>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Option Type Toggle */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Pilihan Jawaban</label>
                    <div className="flex gap-2">
                      {(['text', 'image'] as OptionType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm({ ...form, option_type: t })}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                            ${form.option_type === t
                              ? 'border-[#1e3a8a] bg-[#1e3a8a]/5 text-[#1e3a8a]'
                              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                        >
                          {t === 'text' ? (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg> Teks</>
                          ) : (
                            <><Image className="w-4 h-4" /> Gambar (Figural)</>
                          )}
                        </button>
                      ))}
                    </div>
                    {form.option_type === 'image' && (
                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Mode Figural: masukkan URL gambar untuk setiap pilihan jawaban
                      </p>
                    )}
                  </div>

                  {/* Options */}
                  {form.option_type === 'text' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {OPTIONS.map((opt) => {
                        const key = `option_${opt.toLowerCase()}` as keyof typeof form;
                        const isCorrect = opt === form.correct_answer;
                        return (
                          <div key={opt}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Opsi {opt} {isCorrect && <span className="text-[#10b981]">(Benar)</span>}
                            </label>
                            <input
                              value={form[key] as string}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                              required
                              placeholder={`Isi opsi ${opt}`}
                              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors
                                ${isCorrect
                                  ? 'border-[#10b981] bg-emerald-50 focus:ring-[#10b981]/20'
                                  : 'border-gray-200 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]'}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {OPTIONS.map((opt) => {
                        const key = `option_${opt.toLowerCase()}` as keyof typeof form;
                        const url = form[key] as string;
                        const isCorrect = opt === form.correct_answer;
                        return (
                          <div key={opt} className={`rounded-2xl border-2 p-3 transition-colors ${isCorrect ? 'border-[#10b981] bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              Opsi {opt} {isCorrect && <span className="text-[#10b981] font-semibold">(Benar)</span>}
                            </label>
                            <input
                              value={url}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                              required
                              placeholder={`URL gambar opsi ${opt}`}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 bg-white mb-2"
                            />
                            {url && (
                              <div className="relative">
                                <img
                                  src={url}
                                  alt={`Opsi ${opt}`}
                                  className="w-full max-h-28 object-contain rounded-xl border border-gray-200 bg-white"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            )}
                            {!url && (
                              <div className="w-full h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center">
                                <Image className="w-5 h-5 text-gray-300" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pembahasan / Penjelasan Jawaban</label>
                    <textarea
                      value={form.explanation}
                      onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                      rows={3}
                      placeholder="Jelaskan mengapa jawaban tersebut benar..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a] resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={cancelForm} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm">Batal</button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold transition-colors text-sm disabled:opacity-60"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />{uploadingImage ? 'Upload gambar...' : 'Menyimpan...'}</>
                      ) : (
                        <><Check className="w-4 h-4" />{editId ? 'Simpan Perubahan' : 'Tambah Soal'}</>
                      )}
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
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari soal..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {(['ALL', ...CATEGORIES] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${filterCat === cat ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {cat === 'ALL' ? 'Semua' : cat}
                  {cat !== 'ALL' && (
                    <span className="ml-1 opacity-70">({catCounts[cat]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-20 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColors[q.category]}`}>{q.category}</span>
                          {q.image_url && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                              <Image className="w-3 h-3" /> Gambar Soal
                            </span>
                          )}
                          {q.option_type === 'image' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                              <Image className="w-3 h-3" /> Figural
                            </span>
                          )}
                          <span className="text-xs text-gray-400">#{q.id.slice(0, 8)}</span>
                        </div>
                        {q.image_url && (
                          <img src={q.image_url} alt="Gambar soal" className="mb-2 max-h-24 rounded-lg border border-gray-100 object-contain" />
                        )}
                        <p className="text-sm text-gray-700 font-medium line-clamp-2">{q.question_text}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {OPTIONS.map((opt) => {
                            const val = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                            const isCorrect = opt === q.correct_answer;
                            return (
                              <span key={opt} className={`text-xs px-2 py-0.5 rounded-md ${isCorrect ? 'bg-[#10b981] text-white font-semibold' : 'bg-gray-100 text-gray-500'}`}>
                                {opt}: {val.slice(0, 20)}{val.length > 20 ? '...' : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => startEdit(q)} className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(q.id)} className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filtered.length === 0 && !loading && (
                <div className="text-center py-16 text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">
                    {questions.length === 0 ? 'Belum ada soal di paket ini' : 'Tidak ada soal ditemukan'}
                  </p>
                  {questions.length === 0 && (
                    <p className="text-sm mt-1">Tambahkan soal manual atau import via Word</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center"
            >
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Hapus Soal?</h3>
              <p className="text-gray-500 text-sm mb-6">Soal ini akan dihapus permanen dari paket ini.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">Batal</button>
                <button onClick={() => confirmDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Per-package completeness card
const CAT_STYLES: Record<Category, { label: string; bg: string; text: string; bar: string; completeBg: string; completeBorder: string }> = {
  TIU: { label: 'TIU', bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-400', completeBg: 'bg-emerald-50', completeBorder: 'border-emerald-200' },
  TWK: { label: 'TWK', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-400', completeBg: 'bg-emerald-50', completeBorder: 'border-emerald-200' },
  TKP: { label: 'TKP', bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-400', completeBg: 'bg-emerald-50', completeBorder: 'border-emerald-200' },
};

function PackageCompletenessCard({
  pkg,
  counts,
  requirements,
}: {
  pkg: ExamPackage;
  counts: Record<Category, number>;
  requirements: Partial<Record<Category, number>>;
}) {
  const cats = Object.keys(requirements) as Category[];
  const allComplete = cats.every((cat) => counts[cat] >= (requirements[cat] ?? 0));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-gray-800">Kelengkapan Soal — {pkg.name}</p>
          <p className="text-xs text-gray-500">{TYPE_LABELS[pkg.package_type]}</p>
        </div>
        {allComplete && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#10b981] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> LENGKAP
          </span>
        )}
      </div>

      <div className={`grid gap-3 ${cats.length === 1 ? 'grid-cols-1 max-w-xs' : cats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {cats.map((cat) => {
          const current = counts[cat];
          const required = requirements[cat] ?? 0;
          const complete = current >= required;
          const pct = required > 0 ? Math.min((current / required) * 100, 100) : 0;
          const st = CAT_STYLES[cat];
          return (
            <div key={cat} className={`rounded-xl p-3 border ${complete ? st.completeBg + ' ' + st.completeBorder : st.bg + ' border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${complete ? 'text-emerald-700' : st.text}`}>{cat}</span>
                {complete
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                  : <span className="text-xs text-amber-500 font-semibold">-{required - current}</span>
                }
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className={`text-xl font-extrabold leading-none ${complete ? 'text-emerald-700' : current > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {current}
                </span>
                <span className="text-xs text-gray-400">/ {required} soal</span>
              </div>
              <div className="w-full h-1.5 bg-white/70 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-[#10b981]' : st.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
