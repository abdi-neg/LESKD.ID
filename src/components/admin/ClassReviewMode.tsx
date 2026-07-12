import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase'; // ⚠️ Sesuaikan titik-titiknya dengan lokasi file supabase kamu

interface StudentAnswer {
  name: string;
  answer: string;
}

interface QuestionStat {
  questionData: any;
  correctStudents: StudentAnswer[];
  wrongStudents: StudentAnswer[];
  unansweredStudents: StudentAnswer[];
}

export default function ClassReviewMode() {
  // Menangkap ID Paket dari URL (misal: /admin/pembahasan-kelas/twk-02)
  const { packageId } = useParams<{ packageId: string }>(); 
  
  const [loading, setLoading] = useState(true);
  const [questionsStats, setQuestionsStats] = useState<QuestionStat[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (packageId) {
      fetchClassData();
    }
  }, [packageId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('participant_id, user_name, review_snapshot')
        .eq('package_id', packageId)
        .not('review_snapshot', 'is', null);

      if (error) throw error;
      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const groupedData = new Map<string, QuestionStat>();

      data.forEach((row) => {
        let snap = row.review_snapshot;
        
        if (typeof snap === 'string') {
          try { snap = JSON.parse(snap); } catch (e) {}
        }
        if (typeof snap === 'string') {
          try { snap = JSON.parse(snap); } catch (e) {}
        }

        if (snap && Array.isArray(snap.questions)) {
          snap.questions.forEach((q: any) => {
            const qId = q.id || q.questionId;
            
            if (!groupedData.has(qId)) {
              groupedData.set(qId, {
                questionData: q,
                correctStudents: [],
                wrongStudents: [],
                unansweredStudents: []
              });
            }

            const stat = groupedData.get(qId)!;
            const studentName = row.user_name || 'Peserta Tanpa Nama';
            const userAnswer = q.user_answer;

            if (!userAnswer) {
              stat.unansweredStudents.push({ name: studentName, answer: '-' });
            } else if (userAnswer === q.correct_answer) {
              stat.correctStudents.push({ name: studentName, answer: userAnswer });
            } else {
              stat.wrongStudents.push({ name: studentName, answer: userAnswer });
            }
          });
        }
      });

      setQuestionsStats(Array.from(groupedData.values()));
    } catch (error) {
      console.error("Gagal menarik data pembahasan kelas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-xl font-bold animate-pulse text-blue-600">Memuat Data Kelas...</div>;
  }

  if (questionsStats.length === 0) {
    return <div className="p-10 text-center text-red-500 font-bold">Belum ada peserta yang mengerjakan paket soal ini atau ID Paket salah.</div>;
  }

  const currentStat = questionsStats[currentIndex];
  const q = currentStat.questionData;
  const totalStudents = currentStat.correctStudents.length + currentStat.wrongStudents.length + currentStat.unansweredStudents.length;
  const successRate = Math.round((currentStat.correctStudents.length / totalStudents) * 100) || 0;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER NAVIGASI */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 border">
        <button 
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 font-bold hover:bg-blue-700 transition-colors"
        >
          &laquo; Sebelumnya
        </button>
        <h2 className="text-2xl font-extrabold text-gray-800 text-center">
          Soal Nomor {currentIndex + 1} <br/>
          <span className="text-gray-400 text-sm font-normal">Total {questionsStats.length} Soal</span>
        </h2>
        <button 
          onClick={() => setCurrentIndex(prev => Math.min(questionsStats.length - 1, prev + 1))}
          disabled={currentIndex === questionsStats.length - 1}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 font-bold hover:bg-blue-700 transition-colors"
        >
          Selanjutnya &raquo;
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL KIRI: SOAL & PEMBAHASAN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-lg text-gray-800 mb-4 whitespace-pre-wrap">{q.question_text || q.questionText}</div>
            {q.image_url && <img src={q.image_url} alt="Soal" className="max-h-64 object-contain mb-6 rounded border" />}
            
            <div className="space-y-2 mt-4">
              {['a', 'b', 'c', 'd', 'e'].map((opt) => {
                const optKey = `option_${opt}`;
                const text = q[optKey];
                const isCorrect = q.correct_answer?.toLowerCase() === opt;
                if (!text) return null;

                return (
                  <div key={opt} className={`p-3 rounded-md border ${isCorrect ? 'bg-green-100 border-green-500 font-bold text-green-900' : 'bg-gray-50 border-gray-200'}`}>
                    <span className="uppercase mr-2 font-bold">{opt}.</span> {text}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-200">
            <h3 className="text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
              <span>💡</span> Pembahasan Resmi (Kunci: {q.correct_answer?.toUpperCase()})
            </h3>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{q.explanation}</div>
            {q.explanation_image_url && (
              <img src={q.explanation_image_url} alt="Pembahasan" className="mt-4 max-h-64 object-contain rounded border border-blue-300" />
            )}
          </div>
        </div>

        {/* PANEL KANAN: STATISTIK KELAS */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <h3 className="text-gray-500 font-bold mb-1 uppercase text-sm tracking-wider">Tingkat Keberhasilan</h3>
            <div className={`text-5xl font-extrabold ${successRate > 50 ? 'text-green-500' : 'text-red-500'}`}>
              {successRate}%
            </div>
            <p className="text-sm text-gray-400 mt-2">{currentStat.correctStudents.length} dari {totalStudents} peserta menjawab benar</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-green-200 overflow-hidden">
            <div className="bg-green-500 text-white font-bold p-3 flex justify-between items-center">
              <span>✅ Menjawab Benar</span>
              <span className="bg-white text-green-600 px-2 py-0.5 rounded-full text-xs">{currentStat.correctStudents.length}</span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto space-y-2">
              {currentStat.correctStudents.map((student, idx) => (
                <div key={idx} className="bg-green-50 text-green-800 px-3 py-2 rounded text-sm font-medium border border-green-100 flex justify-between items-center">
                  <span>{student.name}</span>
                  <span className="font-bold uppercase">({student.answer})</span>
                </div>
              ))}
              {currentStat.correctStudents.length === 0 && <div className="text-center text-gray-400 text-sm py-2">Tidak ada yang benar</div>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden">
            <div className="bg-red-500 text-white font-bold p-3 flex justify-between items-center">
              <span>❌ Menjawab Salah</span>
              <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-xs">{currentStat.wrongStudents.length}</span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto space-y-2">
              {currentStat.wrongStudents.map((student, idx) => (
                <div key={idx} className="bg-red-50 text-red-800 px-3 py-2 rounded text-sm font-medium border border-red-100 flex justify-between items-center">
                  <span>{student.name}</span>
                  <span className="font-bold uppercase text-red-600">Jawab: {student.answer}</span>
                </div>
              ))}
              {currentStat.wrongStudents.length === 0 && <div className="text-center text-gray-400 text-sm py-2">Tidak ada yang salah</div>}
            </div>
          </div>

          {currentStat.unansweredStudents.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
              <div className="bg-gray-200 text-gray-600 font-bold p-3 flex justify-between items-center">
                <span>⚠️ Kosong / Lewati</span>
                <span className="bg-white text-gray-600 px-2 py-0.5 rounded-full text-xs">{currentStat.unansweredStudents.length}</span>
              </div>
              <div className="p-4 max-h-32 overflow-y-auto space-y-1">
                {currentStat.unansweredStudents.map((student, idx) => (
                  <div key={idx} className="text-gray-500 text-sm text-center bg-gray-50 py-1 rounded border border-gray-100">{student.name}</div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
