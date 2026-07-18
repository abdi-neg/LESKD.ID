import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Users, Target, CheckSquare, AlertTriangle } from 'lucide-react';

interface StudentAnswer {
  name: string;
  answer: string;
  points?: number; // Tambahan properti khusus untuk TKP
}

interface QuestionStat {
  questionData: any;
  correctStudents: StudentAnswer[];
  wrongStudents: StudentAnswer[];
  unansweredStudents: StudentAnswer[];
  // Tambahan kategori stat khusus TKP
  tkpPoint5: StudentAnswer[];
  tkpPoint4: StudentAnswer[];
  tkpPointOthers: StudentAnswer[];
}

export default function ClassReviewMode() {
  const { packageId } = useParams<{ packageId: string }>(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questionsStats, setQuestionsStats] = useState<QuestionStat[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (packageId) {
      fetchClassData();
    }
  }, [packageId]);

  const extractLetter = (rawContent: any): string => {
    if (rawContent === null || rawContent === undefined) return '';
    if (typeof rawContent === 'string') return rawContent.trim().toLowerCase();
    
    if (typeof rawContent === 'object') {
      if (rawContent.selectedAnswer) return String(rawContent.selectedAnswer).trim().toLowerCase();
      if (rawContent.selected_answer) return String(rawContent.selected_answer).trim().toLowerCase();
      if (rawContent.answer) return String(rawContent.answer).trim().toLowerCase();
      if (rawContent.value) return String(rawContent.value).trim().toLowerCase();
      if (rawContent.option) return String(rawContent.option).trim().toLowerCase();
      if (rawContent.selected) return String(rawContent.selected).trim().toLowerCase();
      if (rawContent.userAnswer) return String(rawContent.userAnswer).trim().toLowerCase();
    }
    return '';
  };

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
            const qId = q.id || q.questionId || q.question_id || q.uuid;
            
            if (!groupedData.has(qId)) {
              groupedData.set(qId, {
                questionData: q,
                correctStudents: [],
                wrongStudents: [],
                unansweredStudents: [],
                tkpPoint5: [],
                tkpPoint4: [],
                tkpPointOthers: []
              });
            }

            const stat = groupedData.get(qId)!;
            const studentName = row.user_name || 'Peserta Tanpa Nama';
            
            let rawUserAnswer = q.user_answer || q.userAnswer || q.selected_option || q.selectedOption || q.answer;
            
            if (!rawUserAnswer && snap.answers && typeof snap.answers === 'object') {
               rawUserAnswer = snap.answers[qId]; 
            }
            if (!rawUserAnswer && snap.responses && typeof snap.responses === 'object') {
               rawUserAnswer = snap.responses[qId]; 
            }
            if (!rawUserAnswer && snap.participant_answers && typeof snap.participant_answers === 'object') {
               rawUserAnswer = snap.participant_answers[qId]; 
            }

            const parsedUserAnswer = extractLetter(rawUserAnswer);
            const isValidOption = ['a', 'b', 'c', 'd', 'e'].includes(parsedUserAnswer);
            const displayAnswer = isValidOption ? parsedUserAnswer.toUpperCase() : '-';

            const isTKP = q.category === 'TKP';

            if (!isValidOption) {
              stat.unansweredStudents.push({ name: studentName, answer: '-' });
            } else if (isTKP) {
              // 🌟 LOGIKA KHUSUS TKP
              const pointKey = `points_${parsedUserAnswer}`;
              const points = Number(q[pointKey]) || 0;
              
              const studentRecord = { name: studentName, answer: displayAnswer, points };
              
              if (points === 5) {
                stat.tkpPoint5.push(studentRecord);
              } else if (points === 4) {
                stat.tkpPoint4.push(studentRecord);
              } else {
                stat.tkpPointOthers.push(studentRecord);
              }
              // Di TKP, yang dapat poin 5 juga masuk correctStudents untuk statistik Persentase Benar di atas
              if (points === 5) stat.correctStudents.push(studentRecord);
              else stat.wrongStudents.push(studentRecord); // Poin 1-4 dihitung 'salah' untuk persentase kelulusan soal
              
            } else {
              // LOGIKA TIU & TWK
              const parsedCorrectAnswer = extractLetter(q.correct_answer || q.correctAnswer);
              if (parsedUserAnswer === parsedCorrectAnswer) {
                stat.correctStudents.push({ name: studentName, answer: displayAnswer });
              } else {
                stat.wrongStudents.push({ name: studentName, answer: displayAnswer });
              }
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
    return (
      <div className="flex justify-center items-center h-64 text-[#1e3a8a] font-bold animate-pulse text-lg">
        Memuat Data Pembahasan Kelas...
      </div>
    );
  }

  if (questionsStats.length === 0) {
    return (
      <div className="p-10 text-center">
        <h3 className="text-xl font-bold text-gray-700 mb-4">Belum ada peserta yang mengerjakan paket soal ini.</h3>
        <button 
          onClick={() => navigate('/admin/packages')}
          className="bg-[#1e3a8a] text-white px-6 py-2.5 rounded-2xl flex items-center justify-center gap-2 mx-auto hover:bg-[#1e40af] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Kembali ke Manajemen Paket
        </button>
      </div>
    );
  }

  const currentStat = questionsStats[currentIndex];
  const q = currentStat.questionData;
  const isTKP = q.category === 'TKP';
  
  // Total Students tetap sama
  const totalStudents = currentStat.correctStudents.length + currentStat.wrongStudents.length + currentStat.unansweredStudents.length;
  // Di TKP, success rate dihitung dari jumlah siswa yang mendapat poin 5
  const successRate = totalStudents > 0 ? Math.round((currentStat.correctStudents.length / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER NAVIGASI */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <button 
          onClick={() => navigate('/admin/packages')}
          className="flex items-center gap-2 text-gray-500 hover:text-[#1e3a8a] font-semibold transition-colors bg-gray-50 hover:bg-blue-50 px-5 py-2.5 rounded-xl border border-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Kembali ke Daftar Paket</span>
        </button>

        <div className="flex items-center gap-3 sm:gap-5 bg-gray-50 px-2 py-2 rounded-2xl border border-gray-100">
          <button 
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="p-2 sm:px-4 sm:py-2.5 bg-white text-[#1e3a8a] rounded-xl disabled:opacity-40 hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden md:inline">Sebelumnya</span>
          </button>
          
          <div className="text-center min-w-[120px]">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1e3a8a] leading-tight">
              Soal {currentIndex + 1}
            </h2>
            <p className="text-xs font-semibold text-gray-400">DARI {questionsStats.length} SOAL</p>
          </div>

          <button 
            onClick={() => setCurrentIndex(prev => Math.min(questionsStats.length - 1, prev + 1))}
            disabled={currentIndex === questionsStats.length - 1}
            className="p-2 sm:px-4 sm:py-2.5 bg-white text-[#1e3a8a] rounded-xl disabled:opacity-40 hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold"
          >
            <span className="hidden md:inline">Selanjutnya</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BAGIAN KIRI: SOAL DAN PEMBAHASAN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-5 pb-5 border-b border-gray-50">
               <span className="bg-[#1e3a8a]/10 text-[#1e3a8a] px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider">
                 Kategori: {q.category || 'Umum'}
               </span>
               <span className="bg-gray-100 text-gray-600 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                 {q.sub_kategori || q.sub_category || 'Tidak ada Sub Kategori'}
               </span>
            </div>
            
            <div className="text-gray-800 text-lg mb-6 leading-relaxed whitespace-pre-wrap">
              {q.question_text || q.questionText}
            </div>
            {q.image_url && (
              <img src={q.image_url} alt="Soal" className="max-h-80 object-contain mb-6 rounded-2xl border border-gray-100 shadow-sm mx-auto" />
            )}
            
            <div className="space-y-3">
              {['a', 'b', 'c', 'd', 'e'].map((opt) => {
                const optKey = `option_${opt}`;
                const text = q[optKey];
                if (!text) return null;

                // Logika Pewarnaan Opsi
                let isCorrect = false;
                let tkpPoints = 0;
                let optionStyle = 'bg-gray-50/50 border-gray-100 hover:bg-gray-50';
                let circleStyle = 'bg-white text-gray-500 border border-gray-200 shadow-sm';
                let textStyle = 'text-gray-600 font-medium';

                if (isTKP) {
                  tkpPoints = Number(q[`points_${opt}`]) || 0;
                  if (tkpPoints === 5) {
                    optionStyle = 'bg-emerald-50/70 border-emerald-200 shadow-sm';
                    circleStyle = 'bg-emerald-500 text-white shadow-md shadow-emerald-200';
                    textStyle = 'text-emerald-900 font-semibold';
                  } else if (tkpPoints === 4) {
                    optionStyle = 'bg-blue-50/70 border-blue-200 shadow-sm';
                    circleStyle = 'bg-blue-500 text-white shadow-md shadow-blue-200';
                    textStyle = 'text-blue-900 font-semibold';
                  }
                } else {
                  isCorrect = extractLetter(q.correct_answer || q.correctAnswer) === opt;
                  if (isCorrect) {
                    optionStyle = 'bg-emerald-50/70 border-emerald-200 shadow-sm';
                    circleStyle = 'bg-emerald-500 text-white shadow-md shadow-emerald-200';
                    textStyle = 'text-emerald-900 font-semibold';
                  }
                }

                return (
                  <div key={opt} className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${optionStyle}`}>
                    <div className="flex gap-4">
                       <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl font-extrabold text-sm ${circleStyle}`}>
                         {opt.toUpperCase()}
                       </div>
                       <div className={`flex-1 pt-1.5 ${textStyle}`}>
                         {text}
                       </div>
                    </div>
                    {/* BAGIAN BARU: Menampilkan Poin Khusus TKP */}
                    {isTKP && (
  <div className="flex-shrink-0 pl-4 border-l border-gray-200/50 ml-2">
    <div className={`px-3 py-1.5 rounded-lg text-xs font-black
      ${tkpPoints === 5 ? 'bg-emerald-100 text-emerald-700' :
        tkpPoints === 4 ? 'bg-blue-100 text-blue-700' :
        'bg-orange-100 text-orange-700' // Ini akan menangkap poin 1, 2, dan 3
      }`}
    >
      Poin {tkpPoints}
    </div>
  </div>
)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1e3a8a]/5 to-blue-50/50 p-6 sm:p-8 rounded-3xl shadow-sm border border-blue-100/50">
            <h3 className="text-xl font-extrabold text-[#1e3a8a] mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                💡
              </div>
              Pembahasan Resmi
            </h3>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
              {q.explanation || 'Belum ada pembahasan yang ditambahkan pada database soal ini.'}
            </div>
            {q.explanation_image_url && (
              <img src={q.explanation_image_url} alt="Pembahasan" className="mt-6 max-h-80 object-contain rounded-2xl border border-blue-200/50 shadow-sm mx-auto" />
            )}
          </div>
        </div>

        {/* BAGIAN KANAN: STATISTIK SISWA */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#1e3a8a] to-blue-400"></div>
            <h3 className="text-gray-400 font-bold mb-2 text-xs uppercase tracking-widest">
              {isTKP ? 'Siswa Mendapat Poin 5' : 'Tingkat Keberhasilan'}
            </h3>
            <div className={`text-6xl font-black my-5 tracking-tighter ${successRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {successRate}%
            </div>
            <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
               <Users className="w-4 h-4 text-gray-400" />
               <span className="text-sm font-semibold text-gray-600">
                 {currentStat.correctStudents.length} dari {totalStudents} menjawab {isTKP ? 'poin maksimal' : 'benar'}
               </span>
            </div>
          </div>

          {/* RENDER KHUSUS TKP */}
          {isTKP ? (
            <>
              {/* Card Poin 5 */}
              <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col max-h-[250px]">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2 font-bold">
                    <Target className="w-5 h-5 opacity-90" /> Poin 5 (Sangat Tepat)
                  </div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-xl text-sm font-black backdrop-blur-sm">{currentStat.tkpPoint5.length}</span>
                </div>
                <div className="p-3 overflow-y-auto scrollbar-thin">
                  <div className="space-y-1.5">
                    {currentStat.tkpPoint5.map((student, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-3 hover:bg-emerald-50 rounded-2xl transition-colors border border-transparent hover:border-emerald-100">
                        <span className="text-sm font-bold text-gray-700">{student.name}</span>
                        <span className="text-xs font-black bg-emerald-100 text-emerald-700 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm shadow-emerald-100/50">{student.answer}</span>
                      </div>
                    ))}
                    {currentStat.tkpPoint5.length === 0 && <div className="text-center text-gray-400 text-sm font-medium py-6">Tidak ada peserta</div>}
                  </div>
                </div>
              </div>

              {/* Card Poin 4 */}
              <div className="bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden flex flex-col max-h-[250px]">
                <div className="bg-gradient-to-r from-blue-500 to-blue-400 px-5 py-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckSquare className="w-5 h-5 opacity-90" /> Poin 4 (Tepat)
                  </div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-xl text-sm font-black backdrop-blur-sm">{currentStat.tkpPoint4.length}</span>
                </div>
                <div className="p-3 overflow-y-auto scrollbar-thin">
                  <div className="space-y-1.5">
                    {currentStat.tkpPoint4.map((student, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-3 hover:bg-blue-50 rounded-2xl transition-colors border border-transparent hover:border-blue-100">
                        <span className="text-sm font-bold text-gray-700">{student.name}</span>
                        <span className="text-xs font-black bg-blue-100 text-blue-700 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm shadow-blue-100/50">{student.answer}</span>
                      </div>
                    ))}
                    {currentStat.tkpPoint4.length === 0 && <div className="text-center text-gray-400 text-sm font-medium py-6">Tidak ada peserta</div>}
                  </div>
                </div>
              </div>

              {/* Card Poin 1,2,3 */}
              <div className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden flex flex-col max-h-[250px]">
                <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-5 h-5 opacity-90" /> Poin 1-3 (Kurang Tepat)
                  </div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-xl text-sm font-black backdrop-blur-sm">{currentStat.tkpPointOthers.length}</span>
                </div>
                <div className="p-3 overflow-y-auto scrollbar-thin">
                  <div className="space-y-1.5">
                    {currentStat.tkpPointOthers.map((student, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-3 hover:bg-orange-50 rounded-2xl transition-colors border border-transparent hover:border-orange-100">
                        <span className="text-sm font-bold text-gray-700 truncate mr-3">{student.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-bold text-orange-400 uppercase">Jawab:</span>
                          <span className="text-xs font-black bg-orange-100 text-orange-700 px-2 h-8 flex items-center justify-center rounded-xl shadow-sm shadow-orange-100/50">
                            {student.answer} (Poin {student.points})
                          </span>
                        </div>
                      </div>
                    ))}
                    {currentStat.tkpPointOthers.length === 0 && <div className="text-center text-gray-400 text-sm font-medium py-6">Tidak ada peserta</div>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // RENDER KHUSUS TIU & TWK (ASLI)
            <>
              <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col max-h-[350px]">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-5 h-5 opacity-90" /> Menjawab Benar
                  </div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-xl text-sm font-black backdrop-blur-sm">{currentStat.correctStudents.length}</span>
                </div>
                <div className="p-3 overflow-y-auto scrollbar-thin">
                  <div className="space-y-1.5">
                    {currentStat.correctStudents.map((student, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-3 hover:bg-emerald-50 rounded-2xl transition-colors border border-transparent hover:border-emerald-100">
                        <span className="text-sm font-bold text-gray-700">{student.name}</span>
                        <span className="text-xs font-black bg-emerald-100 text-emerald-700 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm shadow-emerald-100/50">{student.answer}</span>
                      </div>
                    ))}
                    {currentStat.correctStudents.length === 0 && <div className="text-center text-gray-400 text-sm font-medium py-8">Belum ada peserta yang benar</div>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-rose-100 overflow-hidden flex flex-col max-h-[350px]">
                <div className="bg-gradient-to-r from-rose-500 to-rose-400 px-5 py-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2 font-bold">
                    <XCircle className="w-5 h-5 opacity-90" /> Menjawab Salah
                  </div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-xl text-sm font-black backdrop-blur-sm">{currentStat.wrongStudents.length}</span>
                </div>
                <div className="p-3 overflow-y-auto scrollbar-thin">
                  <div className="space-y-1.5">
                    {currentStat.wrongStudents.map((student, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-3 hover:bg-rose-50 rounded-2xl transition-colors border border-transparent hover:border-rose-100">
                        <span className="text-sm font-bold text-gray-700 truncate mr-3">{student.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-bold text-rose-400 uppercase">Jawab:</span>
                          <span className="text-xs font-black bg-rose-100 text-rose-700 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm shadow-rose-100/50">{student.answer}</span>
                        </div>
                      </div>
                    ))}
                    {currentStat.wrongStudents.length === 0 && <div className="text-center text-gray-400 text-sm font-medium py-8">Tidak ada peserta yang salah</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CARD KOSONG (BERLAKU UNTUK SEMUA JENIS SOAL) */}
          {currentStat.unansweredStudents.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 to-amber-300 px-5 py-3.5 flex justify-between items-center text-amber-900">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 opacity-80" /> Kosong / Dilewati
                </div>
                <span className="bg-white/30 px-2.5 py-0.5 rounded-lg text-xs font-black">{currentStat.unansweredStudents.length}</span>
              </div>
              <div className="p-3 max-h-40 overflow-y-auto scrollbar-thin">
                <div className="space-y-1.5">
                  {currentStat.unansweredStudents.map((student, idx) => (
                    <div key={idx} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-50 rounded-xl border border-gray-100">
                      {student.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
