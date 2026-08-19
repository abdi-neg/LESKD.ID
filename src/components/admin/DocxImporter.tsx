import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Check, AlertCircle, Download, Loader2, ChevronDown, ChevronUp, Eye, Package } from 'lucide-react';
import mammoth from 'mammoth';
import { Category, AnswerOption, PackageType } from '../../types';
import { supabase } from '../../lib/supabase';

interface ParsedQuestion {
  category: Category;
  sub_category: string; 
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: AnswerOption;
  explanation: string;
  package_id: string;
  points_a?: number | null;
  points_b?: number | null;
  points_c?: number | null;
  points_d?: number | null;
  points_e?: number | null;
}

const PKG_CATEGORIES: Record<PackageType, Category[]> = {
  MINI_TIU: ['TIU'],
  MINI_TWK: ['TWK'],
  MINI_TKP: ['TKP'],
  FULL: ['TIU', 'TWK', 'TKP'],
};

interface Props {
  packageId: string;
  packageType: PackageType;
  onImported: () => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  TIU: 'TIU',
  TWK: 'TWK',
  TKP: 'TKP',
};

// 🌟 UBAH WARNA TKP MENJADI AMBER
const CAT_COLORS: Record<Category, string> = {
  TIU: 'bg-blue-100 text-blue-700',
  TWK: 'bg-emerald-100 text-emerald-700',
  TKP: 'bg-amber-100 text-amber-700',
};

function parseDocxText(rawText: string, category: Category): { questions: ParsedQuestion[]; errors: string[] } {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  const normalizedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();

  const rawBlocks = normalizedText.split(/\[SOAL\]/i);
  const questionBlocks = rawBlocks.filter((b) => b.includes('[A]') && b.includes('[B]') && b.includes('[C]'));

  if (questionBlocks.length === 0) {
    errors.push('Tidak ada soal valid yang ditemukan. Pastikan format dokumen menggunakan penanda [SOAL] dan pilihan jawaban [A] sampai [E].');
    return { questions, errors };
  }

  questionBlocks.forEach((block, idx) => {
    const lineNum = idx + 1;
    try {
      const extract = (marker: string): string => {
        const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[(?:A|B|C|D|E|KUNCI|PEMBAHASAN|SOAL|SUB_KATEGORI)\\]|$)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : '';
      };

      // ─── 🌟 PERBAIKAN LOGIKA: Ambil hasil extract, lalu split berdasarkan enter dan kunci baris pertama saja ───
      const rawSub = extract('SUB_KATEGORI') || 'Umum';
      const sub_category = rawSub.split('\n')[0].trim();

      let question_text = block.split(/\[A\]/i)[0].trim();
      question_text = question_text.replace(/\[SUB_KATEGORI\][^\n]*/i, '').trim();

      let rawA = extract('A');
      let rawB = extract('B');
      let rawC = extract('C');
      let rawD = extract('D');
      let rawE = extract('E');
      const rawKunci = extract('KUNCI').toUpperCase().trim();
      const explanation = extract('PEMBAHASAN');

      if (!question_text) {
        errors.push(`Soal #${lineNum}: teks soal tidak ditemukan.`);
        return;
      }
      if (!rawA || !rawB || !rawC || !rawD || !rawE) {
        errors.push(`Soal #${lineNum}: satu atau lebih pilihan jawaban (A-E) tidak lengkap.`);
        return;
      }

      if (category !== 'TKP' && !['A', 'B', 'C', 'D', 'E'].includes(rawKunci)) {
        errors.push(`Soal #${lineNum}: kunci jawaban "${rawKunci}" tidak valid untuk TIU/TWK. Gunakan A, B, C, D, atau E.`);
        return;
      }

      let pA: number | null = null;
      let pB: number | null = null;
      let pC: number | null = null;
      let pD: number | null = null;
      let pE: number | null = null;

      if (category === 'TKP') {
        const parseOpsiPoin = (rawOpsi: string, label: string) => {
          if (rawOpsi.includes('|')) {
            const parts = rawOpsi.split('|');
            const teks = parts[0].trim();
            const matchPoin = parts[1].match(/\d+/);
            const poin = matchPoin ? parseInt(matchPoin[0], 10) : 0;
            return { teks, poin };
          }
          errors.push(`Soal #${lineNum} (Opsi ${label}): Format poin "|" tidak ditemukan. Diatur otomatis ke 0 poin.`);
          return { teks: rawOpsi, poin: 0 };
        };

        const resA = parseOpsiPoin(rawA, 'A'); rawA = resA.teks; pA = resA.poin;
        const resB = parseOpsiPoin(rawB, 'B'); rawB = resB.teks; pB = resB.poin;
        const resC = parseOpsiPoin(rawC, 'C'); rawC = resC.teks; pC = resC.poin;
        const resD = parseOpsiPoin(rawD, 'D'); rawD = resD.teks; pD = resD.poin;
        const resE = parseOpsiPoin(rawE, 'E'); rawE = resE.teks; pE = resE.poin;
      }

      questions.push({
        category,
        sub_category, 
        question_text,
        option_a: rawA,
        option_b: rawB,
        option_c: rawC,
        option_d: rawD,
        option_e: rawE,
        correct_answer: (category === 'TKP' ? (rawKunci || 'A') : rawKunci) as AnswerOption,
        explanation,
        package_id: '',
        points_a: pA,
        points_b: pB,
        points_c: pC,
        points_d: pD,
        points_e: pE,
      });
    } catch {
      errors.push(`Soal #${lineNum}: gagal diparse.`);
    }
  });

  return { questions, errors };
}

// 🌟 FUNGSI DOWNLOAD BARU YANG ANTI-CORRUPT
function downloadTemplate(category: Category) {
  const fileUrl = `/templates/Template_${category}.docx`;
  
  const a = document.createElement('a');
  a.href = fileUrl;
  a.download = `Template_${category}.docx`; // Nama file saat terdownload
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function DocxImporter({ packageId, packageType, onImported }: Props) {
  const allowedCategories = PKG_CATEGORIES[packageType];
  const [category, setCategory] = useState<Category>(allowedCategories[0]);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsedQuestions([]);
    setParseErrors([]);
    setSavedCount(null);
    setParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const { questions, errors } = parseDocxText(result.value, category);
      
      const withPkg = questions.map((q) => ({ ...q, package_id: packageId }));
      setParsedQuestions(withPkg);
      setParseErrors(errors);
    } catch {
      setParseErrors(['Gagal membaca file. Pastikan format file adalah .docx atau .txt yang valid.']);
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (parsedQuestions.length === 0) return;
    if (parseErrors.length > 0) {
      if (!window.confirm('Ada beberapa kesalahan format. Tetap simpan soal yang berhasil dibaca?')) {
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase.from('questions').insert(parsedQuestions);
    if (!error) {
      setSavedCount(parsedQuestions.length);
      setParsedQuestions([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      onImported();
    } else {
      setParseErrors([`Gagal menyimpan ke database: ${error.message}`]);
    }
    setSaving(false);
  }

  function reset() {
    setParsedQuestions([]);
    setParseErrors([]);
    setFileName('');
    setSavedCount(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e3a8a]/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#1e3a8a]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Import Soal dari Word</h3>
            <p className="text-xs text-gray-500">Soal akan otomatis masuk ke paket yang sedang aktif</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Kategori soal:</span>
          {allowedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); reset(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                ${category === cat ? CAT_COLORS[cat] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          {allowedCategories.length === 1 && (
            <span className="text-xs text-gray-400">(sesuai tipe paket)</span>
          )}
        </div>
        <button
          onClick={() => downloadTemplate(category)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1e3a8a] bg-[#1e3a8a]/10 hover:bg-[#1e3a8a]/20 px-3 py-1.5 rounded-lg transition-colors ml-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Unduh Template
        </button>
      </div>

      {!fileName ? (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-[#1e3a8a] hover:bg-blue-50/30 transition-colors">
          <Upload className="w-8 h-8 text-gray-300 mb-2" />
          <span className="text-sm font-medium text-gray-500">Klik untuk upload file Word</span>
          <span className="text-xs text-gray-400 mt-0.5">.docx — format sesuai template</span>
          <input ref={fileRef} type="file" accept=".docx,.doc,.txt" onChange={handleFile} className="hidden" />
        </label>
      ) : (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <FileText className="w-5 h-5 text-[#1e3a8a] flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 flex-1 truncate">{fileName}</span>
          <button onClick={reset} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {parsing && (
        <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Membaca file...
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-700">{parseErrors.length} peringatan/kesalahan</span>
          </div>
          {parseErrors.map((err, i) => (
            <p key={i} className="text-xs text-red-600 pl-6">{err}</p>
          ))}
        </div>
      )}

      {savedCount !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-[#10b981]" />
          <span className="text-sm font-semibold text-emerald-700">{savedCount} soal berhasil disimpan ke database!</span>
        </motion.div>
      )}

      {parsedQuestions.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">
                Pratinjau — {parsedQuestions.length} soal berhasil dibaca
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${CAT_COLORS[category]}`}>
                {category}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {parsedQuestions.map((q, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 transition-colors"
                >
                  <span className="w-6 h-6 bg-[#1e3a8a] text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 font-medium flex-1 line-clamp-1">{q.question_text}</p>
                  
                  <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded border border-gray-300 flex-shrink-0 uppercase tracking-wide">
                    {q.sub_category}
                  </span>

                  <span className="text-xs font-bold bg-[#10b981] text-white px-2 py-0.5 rounded-md flex-shrink-0">
                    {category === 'TKP' ? 'TKP Poin' : q.correct_answer}
                  </span>
                  {expandedIdx === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>

                <AnimatePresence>
                  {expandedIdx === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-gray-200 pt-2 space-y-1.5">
                        {(['A', 'B', 'C', 'D', 'E'] as AnswerOption[]).map((opt) => {
                          const val = q[`option_${opt.toLowerCase()}` as keyof ParsedQuestion] as string;
                          const poinVal = q[`points_${opt.toLowerCase()}` as keyof ParsedQuestion];
                          const isCorrect = category !== 'TKP' && opt === q.correct_answer;
                          
                          return (
                            <div key={opt} className={`flex gap-2 text-xs p-2 rounded-lg ${isCorrect ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-gray-600'}`}>
                              <span className={`font-bold w-4 flex-shrink-0 ${isCorrect ? 'text-[#10b981]' : 'text-gray-400'}`}>{opt}.</span>
                              <span className="flex-1">{val}</span>
                              {category === 'TKP' && poinVal !== undefined && (
                                // 🌟 UBAH WARNA POIN TKP SAAT PREVIEW MENJADI AMBER
                                <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
                                  {poinVal} Poin
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {q.explanation && (
                          <div className="mt-2 bg-[#1e3a8a]/5 rounded-lg p-2 text-xs text-gray-600">
                            <span className="font-semibold text-[#1e3a8a]">Pembahasan: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3 justify-end">
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><Check className="w-4 h-4" /> Simpan {parsedQuestions.length} Soal ke Database</>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
