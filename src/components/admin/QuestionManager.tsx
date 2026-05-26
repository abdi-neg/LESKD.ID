import React, { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Upload, CheckCircle2, AlertTriangle, BookOpen, Layers, Check } from 'lucide-react';
import { supabase } from '../../supabaseClient.ts';
import { Category } from '../../types.ts';

interface QuestionManagerProps {
  onQuestionAdded?: () => void;
}

export default function QuestionManager({ onQuestionAdded }: QuestionManagerProps) {
  // State Dasar Soal
  const [category, setCategory] = useState<Category>('TIU');
  const [questionText, setQuestionText] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [correctAnswer, setCorrectAnswer] = useState<string>('A');
  const [isFiguralOptions, setIsFiguralOptions] = useState<boolean>(false);

  // State untuk Opsi Teks (A-E)
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });

  // State untuk File Gambar Fisik
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [explanationImage, setExplanationImage] = useState<File | null>(null);
  const [optionImages, setOptionImages] = useState<{ [key: string]: File | null }>({
    A: null, B: null, C: null, D: null, E: null
  });

  // State untuk Live Preview Gambar
  const [qImagePreview, setQImagePreview] = useState<string | null>(null);
  const [expImagePreview, setExpImagePreview] = useState<string | null>(null);
  const [optPreviews, setOptPreviews] = useState<{ [key: string]: string | null }>({
    A: null, B: null, C: null, D: null, E: null
  });

  const [loading, setLoading] = useState<boolean>(false);

  const handleOptionTextChange = (e: ChangeEvent<HTMLInputElement>, key: string) => {
    setOptions({ ...options, [key]: e.target.value });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>, type: 'question' | 'explanation' | 'option', optionKey?: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);

      if (type === 'question') {
        setQuestionImage(file);
        setQImagePreview(previewUrl);
      } else if (type === 'explanation') {
        setExplanationImage(file);
        setExpImagePreview(previewUrl);
      } else if (type === 'option' && optionKey) {
        setOptionImages({ ...optionImages, [optionKey]: file });
        setOptPreviews({ ...optPreviews, [optionKey]: previewUrl });
      }
    }
  };

  const uploadToStorage = async (file: File, prefix: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalQuestionImageUrl = null;
      let finalExplanationImageUrl = null;
      let finalOptions = { ...options };

      if (questionImage) {
        finalQuestionImageUrl = await uploadToStorage(questionImage, 'soal');
      }

      if (explanationImage) {
        finalExplanationImageUrl = await uploadToStorage(explanationImage, 'pembahasan');
      }

      if (isFiguralOptions) {
        for (const key of ['A', 'B', 'C', 'D', 'E']) {
          const optFile = optionImages[key];
          if (!optFile) {
            throw new Error(`Gambar untuk Opsi ${key} wajib diunggah gais!`);
          }
          const uploadedUrl = await uploadToStorage(optFile, `opsi_${key}`);
          finalOptions[key as keyof typeof finalOptions] = uploadedUrl;
        }
      }

      const { error } = await supabase.from('questions').insert([
        {
          category,
          question_text: questionText,
          image_url: finalQuestionImageUrl,
          explanation: explanation,
          explanation_image_url: finalExplanationImageUrl,
          option_a: finalOptions.A,
          option_b: finalOptions.B,
          option_c: finalOptions.C,
          option_d: finalOptions.D,
          option_e: finalOptions.E,
          correct_answer: correctAnswer,
        },
      ]);

      if (error) throw error;

      alert('Hore! Soal berhasil disimpan gais! 🎉');
      resetForm();
      if (onQuestionAdded) onQuestionAdded();

    } catch (err: any) {
      alert(`Waduh error gais: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setExplanation('');
    setCorrectAnswer('A');
    setQuestionImage(null);
    setExplanationImage(null);
    setQImagePreview(null);
    setExpImagePreview(null);
    setOptions({ A: '', B: '', C: '', D: '', E: '' });
    setOptionImages({ A: null, B: null, C: null, D: null, E: null });
    setOptPreviews({ A: null, B: null, C: null, D: null, E: null });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100 font-sans my-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Bank Soal</h2>
          <p className="text-xs text-slate-500">Form pembuatan modul simulasi dan tryout premium</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kategori */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori SKD:</label>
          <div className="relative">
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value as Category)} 
              className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
            >
              <option value="TWK">Tes Wawasan Kebangsaan (TWK)</option>
              <option value="TIU">Tes Inteligensia Umum (TIU)</option>
              <option value="TKP">Tes Karakteristik Pribadi (TKP)</option>
            </select>
          </div>
        </div>

        {/* Teks Pertanyaan */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Butir Pertanyaan:</label>
          <textarea 
            value={questionText} 
            onChange={(e) => setQuestionText(e.target.value)} 
            rows={4} 
            placeholder="Tuliskan narasi atau teks soal di sini..." 
            className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-4 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required 
          />
        </div>

        {/* Gambar Pertanyaan */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:border-blue-400 transition-all group">
          <label className="flex flex-col items-center justify-center cursor-pointer text-slate-500 group-hover:text-blue-600">
            <Upload className="w-8 h-8 mb-2 transition-transform group-hover:-translate-y-0.5" />
            <span className="text-sm font-medium">Unggah Gambar Soal <span className="text-xs text-slate-400">(Opsional/Figural)</span></span>
            <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'question')} className="hidden" />
          </label>
          {qImagePreview && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-2 bg-white rounded-xl border border-slate-100 shadow-sm inline-block">
              <img src={qImagePreview} alt="Preview Soal" className="max-h-40 max-w-full rounded-lg object-contain" />
            </motion.div>
          )}
        </div>

        {/* Toggle Tipe Opsi */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Format Pilihan Jawaban (A-E):</label>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button 
              type="button"
              onClick={() => setIsFiguralOptions(false)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${!isFiguralOptions ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layers className="w-4 h-4" /> Teks Standar
            </button>
            <button 
              type="button"
              onClick={() => setIsFiguralOptions(true)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${isFiguralOptions ? 'bg-blue-600 text-white shadow-md shadow-blue-100 font-semibold' : 'text-slate-500 hover:text-blue-600'}`}
            >
              <Image className="w-4 h-4" /> Gambar (Figural)
            </button>
          </div>
        </div>

        {/* Input Opsi A-E */}
        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-4">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Konfigurasi Pilihan Jawaban
          </span>
          
          {['A', 'B', 'C', 'D', 'E'].map((key) => (
            <div key={key} className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-sm">
              <span className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-700 font-bold rounded-lg shrink-0 border border-slate-200/50">
                {key}
              </span>
              
              <div className="w-full">
                {isFiguralOptions ? (
                  <div className="flex items-center gap-4 w-full">
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" /> Pilih Gambar Opsi {key}
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'option', key)} className="hidden" required={!optPreviews[key]} />
                    </label>
                    {optPreviews[key] && (
                      <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} src={optPreviews[key]!} alt={`Preview Opsi ${key}`} className="h-10 w-10 object-contain rounded border border-slate-100 shadow-inner" />
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={options[key as keyof typeof options]} 
                    onChange={(e) => handleOptionTextChange(e, key)} 
                    placeholder={`Ketik teks jawaban alternatif ${key}...`} 
                    className="w-full bg-slate-50/70 text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required={!isFiguralOptions} 
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Kunci Jawaban */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Kunci Jawaban Benar:</label>
          <div className="flex justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
            {['A', 'B', 'C', 'D', 'E'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCorrectAnswer(key)}
                className={`w-12 h-12 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-0.5 relative ${correctAnswer === key ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100 scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
              >
                {key}
                {correctAnswer === key && <Check className="w-3 h-3 absolute bottom-1 right-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Teks Penjelasan */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Analisis & Pembahasan Soal:</label>
          <textarea 
            value={explanation} 
            onChange={(e) => setExplanation(e.target.value)} 
            rows={4} 
            placeholder="Tuliskan kunci pembahasan logika jawaban di sini..." 
            className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-4 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required 
          />
        </div>

        {/* Gambar Penjelasan */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:border-blue-400 transition-all group">
          <label className="flex flex-col items-center justify-center cursor-pointer text-slate-500 group-hover:text-blue-600">
            <Upload className="w-8 h-8 mb-2 transition-transform group-hover:-translate-y-0.5" />
            <span className="text-sm font-medium">Unggah Gambar Solusi/Bagan Pembahasan <span className="text-xs text-slate-400">(Opsional)</span></span>
            <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'explanation')} className="hidden" />
          </label>
          {expImagePreview && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-2 bg-white rounded-xl border border-slate-100 shadow-sm inline-block">
              <img src={expImagePreview} alt="Preview Pembahasan" className="max-h-40 max-w-full rounded-lg object-contain" />
            </motion.div>
          )}
        </div>

        {/* Tombol Submit */}
        <button 
          type="submit" 
          disabled={loading} 
          className={`w-full py-3.5 rounded-xl text-white font-bold text-base transition-all shadow-lg ${loading ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 hover:shadow-xl'}`}
        >
          {loading ? 'Menyinkronkan Data & File...' : 'Simpan ke Bank Soal'}
        </button>

      </form>
    </div>
  );
}
