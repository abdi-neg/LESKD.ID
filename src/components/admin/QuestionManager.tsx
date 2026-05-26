import React, { useState, ChangeEvent } from 'react';
// 👇 Baris awal sudah disesuaikan secara eksplisit menuju folder src gais
import { supabase } from '../../supabaseClient.ts'; 
import { Question, Category } from '../../types.ts'; 

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
  const [options, setOptions] = useState({
    A: '', B: '', C: '', D: '', E: ''
  });

  // State untuk File Gambar Fisik
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [explanationImage, setExplanationImage] = useState<File | null>(null);
  const [optionImages, setOptionImages] = useState<{ [key: string]: File | null }>({
    A: null, B: null, C: null, D: null, E: null
  });

  // State untuk Live Preview Gambar (URL Blob lokal)
  const [qImagePreview, setQImagePreview] = useState<string | null>(null);
  const [expImagePreview, setExpImagePreview] = useState<string | null>(null);
  const [optPreviews, setOptPreviews] = useState<{ [key: string]: string | null }>({
    A: null, B: null, C: null, D: null, E: null
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Handle Perubahan Input Teks Opsi
  const handleOptionTextChange = (e: ChangeEvent<HTMLInputElement>, key: string) => {
    setOptions({ ...options, [key]: e.target.value });
  };

  // Handle Pilihan Gambar (Soal, Pembahasan, Opsi)
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

  // Fungsi Pembantu untuk Upload File ke Supabase Storage Bucket 'question-images'
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

  // Handle Submit Form Simpan Soal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalQuestionImageUrl = null;
      let finalExplanationImageUrl = null;
      
      // Objek penampung teks akhir untuk opsi A-E (bisa berupa teks biasa atau URL hasil upload)
      let finalOptions = { ...options };

      // 1. Upload Gambar Soal jika ada
      if (questionImage) {
        finalQuestionImageUrl = await uploadToStorage(questionImage, 'soal');
      }

      // 2. Upload Gambar Pembahasan jika ada
      if (explanationImage) {
        finalExplanationImageUrl = await uploadToStorage(explanationImage, 'pembahasan');
      }

      // 3. Jika Tipe Opsi adalah Gambar (Figural), upload gambar opsi satu per satu
      if (isFiguralOptions) {
        for (const key of ['A', 'B', 'C', 'D', 'E']) {
          const optFile = optionImages[key];
          if (!optFile) {
            throw new Error(`Gambar untuk Opsi ${key} wajib diunggah gais jika memilih tipe Figural!`);
          }
          const uploadedUrl = await uploadToStorage(optFile, `opsi_${key}`);
          finalOptions[key as keyof typeof finalOptions] = uploadedUrl;
        }
      }

      // 4. Kirim Payload Data Lengkap ke Tabel 'questions'
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

  // Fungsi Reset State Form setelah Berhasil Simpan
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
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '8px', color: '#1e3a8a' }}>Tambah Soal Baru</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
        
        {/* Kategori */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Kategori Soal:</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="TWK">Tes Wawasan Kebangsaan (TWK)</option>
            <option value="TIU">Tes Inteligensia Umum (TIU)</option>
            <option value="TKP">Tes Karakteristik Pribadi (TKP)</option>
          </select>
        </div>

        {/* Teks Pertanyaan */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Teks Soal / Pertanyaan:</label>
          <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} placeholder="Ketikkan teks pertanyaan di sini..." style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
        </div>

        {/* Gambar Pertanyaan */}
        <div style={{ backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '6px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Gambar Soal (Opsional / untuk Figural):</label>
          <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'question')} style={{ fontSize: '14px' }} />
          {qImagePreview && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '12px', margin: '0 0 5px 0', color: '#666' }}>Preview Gambar Soal:</p>
              <img src={qImagePreview} alt="Preview Soal" style={{ maxHeight: '150px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            </div>
          )}
        </div>

        {/* Toggle Tipe Opsi Jawaban */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Tipe Pilihan Jawaban (A-E):</label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" checked={!isFiguralOptions} onChange={() => setIsFiguralOptions(false)} style={{ marginRight: '5px' }} />
              Teks Biasa
            </label>
            <label style={{ cursor: 'pointer', color: '#2563eb', fontWeight: isFiguralOptions ? 'bold' : 'normal' }}>
              <input type="radio" checked={isFiguralOptions} onChange={() => setIsFiguralOptions(true)} style={{ marginRight: '5px' }} />
              Gambar (Figural) 🚀
            </label>
          </div>
        </div>

        {/* Bagian Input Opsi A-E (Dinamis Berdasarkan Tipe) */}
        <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '6px', backgroundColor: '#fafafa' }}>
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#374151' }}>Daftar Pilihan Jawaban:</span>
          
          {['A', 'B', 'C', 'D', 'E'].map((key) => (
            <div key={key} style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Opsi {key}</span>
              
              {isFiguralOptions ? (
                // JIKA TIPE GAMBAR (FIGURAL)
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#fff', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '4px' }}>
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'option', key)} style={{ fontSize: '13px' }} required={!optPreviews[key]} />
                  {optPreviews[key] && (
                    <img src={optPreviews[key]!} alt={`Preview Opsi ${key}`} style={{ height: '50px', width: '50px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }} />
                  )}
                </div>
              ) : (
                // JIKA TIPE TEKS BIASA
                <input type="text" value={options[key as keyof typeof options]} onChange={(e) => handleOptionTextChange(e, key)} placeholder={`Masukkan teks jawaban untuk opsi ${key}`} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required={!isFiguralOptions} />
              )}
            </div>
          ))}
        </div>

        {/* Kunci Jawaban Benar */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Kunci Jawaban yang Benar:</label>
          <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#e0f2fe', fontWeight: 'bold', color: '#0369a1' }}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
          </select>
        </div>

        {/* Teks Penjelasan/Pembahasan */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Teks Pembahasan / Penjelasan:</label>
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={4} placeholder="Ketikkan teks pembahasan analisis soal di sini..." style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
        </div>

        {/* Gambar Penjelasan/Pembahasan */}
        <div style={{ backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '6px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Gambar Pembahasan (Opsional):</label>
          <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'explanation')} style={{ fontSize: '14px' }} />
          {expImagePreview && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '12px', margin: '0 0 5px 0', color: '#666' }}>Preview Gambar Pembahasan:</p>
              <img src={expImagePreview} alt="Preview Pembahasan" style={{ maxHeight: '150px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            </div>
          )}
        </div>

        {/* Tombol Submit */}
        <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: loading ? '#9ca3af' : '#2563eb', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', transition: 'background-color 0.2s' }}>
          {loading ? 'Sedang Mengunggah & Menyimpan...' : 'Simpan Soal Sekarang'}
        </button>

      </form>
    </div>
  );
}
