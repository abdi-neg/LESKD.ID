import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Users, Target, CheckSquare, AlertTriangle, Calendar } from 'lucide-react';

interface StudentAnswer {
  name: string;
  answer: string;
  points?: number; 
}

interface QuestionStat {
  questionData: any;
  correctStudents: StudentAnswer[];
  wrongStudents: StudentAnswer[];
  unansweredStudents: StudentAnswer[];
  tkpPoint5: StudentAnswer[];
  tkpPoint4: StudentAnswer[];
  tkpPointOthers: StudentAnswer[];
}

export default function ClassReviewMode() {
  const { packageId } = useParams<{ packageId: string }>(); 
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]); // Menyimpan data asli dari DB
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State untuk Fitur Filter Tanggal
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('all');

  useEffect(() => {
    if (packageId) {
      fetchClassData();
    }
  }, [packageId]);

  // Reset indeks soal ke nomor 1 jika tanggal filter diubah
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedDate]);

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

  const parseSnapshot = (rawSnap: any) => {
    let snap = rawSnap;
    if (typeof snap === 'string') {
      try { snap = JSON.parse(snap); } catch (e) {}
    }
    if (typeof snap === 'string') {
      try { snap = JSON.parse(snap); } catch (e) {}
    }
    return snap;
  };

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('participant_id, user_name, review_snapshot, completed_at, started_at')
        .eq('package_id', packageId)
        .not('review_snapshot', 'is', null);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setRawData(data);
        
        // Ekstraksi tanggal unik untuk Dropdown Filter
        const datesMap = new Map<string, number>();
        data.forEach(item => {
          const dateStr = item.completed_at || item.started_at;
          if (dateStr) {
            const dateObj = new Date(dateStr);
            const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            if (!datesMap.has(formattedDate)) {
              datesMap.set(formattedDate, dateObj.getTime());
            }
          }
        });
        
        // Urutkan tanggal dari yang paling baru
        const sortedDates = Array.from(datesMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0]);
          
        setAvailableDates(sortedDates);
      }
    } catch (error) {
      console.error("Gagal menarik data pembahasan kelas:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 LOGIKA FILTER INSTAN: Menggunakan useMemo agar pemilahan data secepat kilat
  const questionsStats = useMemo(() => {
    if (rawData.length === 0) return [];

    const groupedData = new Map<string, QuestionStat>();

    // 1. Kumpulkan semua kerangka soal (agar soal tetap tampil walau difilter 0 siswa)
    rawData.forEach((row) => {
      const snap = parseSnapshot(row.review_snapshot);
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
        });
      }
    });

    // 2. Saring data peserta berdasarkan tanggal yang dipilih di dropdown
    const filteredData = selectedDate === 'all' 
      ? rawData 
      : rawData.filter(row => {
          const dateStr = row.completed_at || row.started_at;
          if (!dateStr) return false;
          const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          return formattedDate === selectedDate;
        });

    // 3. Masukkan data jawaban peserta ke dalam statistik masing-masing soal
    filteredData.forEach((row) => {
      const snap = parseSnapshot(row.review_snapshot);
      if (snap && Array.isArray(snap.questions)) {
        snap.questions.forEach((q: any) => {
          const qId = q.id || q.questionId || q.question_id || q.uuid;
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
            if (points === 5) stat.correctStudents.push(studentRecord);
            else stat.wrongStudents.push(studentRecord); 
            
          } else {
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

    // Urutkan siswa poin 1-3 dari nilai terbesar (3 -> 2 -> 1)
    const finalStats = Array.from(groupedData.values());
    finalStats.forEach(stat => {
      stat.tkpPointOthers.sort((a, b) => (b.points || 0) - (a.points || 0));
    });

    return finalStats;
  }, [rawData, selectedDate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-[#1e3a8a] font-bold animate-pulse text-lg">
        Memuat Data Pembahasan Kelas...
      </div>
    );
  }

  // Pesan ini HANYA MUNCUL jika di database benar-benar tidak ada data sama sekali
  if (rawData.length === 0) {
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
  if (!currentStat || !currentStat.questionData) return null;

  const q = currentStat.questionData;
  const isTKP = q.category === 'TKP';
  
  const totalStudents = currentStat.correctStudents.length + currentStat.wrongStudents.length + currentStat.unansweredStudents.length;
  const successRate = totalStudents > 0 ? Math.round((currentStat.correctStudents.length / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER NAVIGASI & FILTER TANGGAL */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => navigate('/admin/packages')}
            className="flex items-center gap-2 text-gray-500 hover:text-[#1e3a8a] font-semibold transition-colors bg-gray-50 hover:bg-blue-50 px-5 py-2.5 rounded-xl border border-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          {/* DROPDOWN FILTER TANGGAL */}
          {availableDates.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-xl">
              <Calendar className="w-4 h-4 text-[#1e3a8a]" />
              <select 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-[#1e3a8a] focus:ring-0 cursor-pointer outline-none p-0 pr-6"
              >
                <option value="all">Semua Hari / Tanggal</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
          )}
        </div>

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

      {/* PENYESUAIAN LCD PROYEKTOR: Menggunakan md:grid-cols-3 agar tetap menyamping */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        {/* BAGIAN KIRI: SOAL DAN PEMBAHASAN */}
        <div className="md:col-span-2 space-y-6">
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
                  } else if (tkpPoints === 3) {
                    optionStyle = 'bg-amber-50/70 border-amber-200 shadow-sm';
                    circleStyle = 'bg-amber-500 text-white shadow-md shadow-amber-200';
                    textStyle = 'text-amber-900 font-semibold';
                  } else if (tkpPoints === 2) {
                    optionStyle = 'bg-orange-50/70 border-orange-200 shadow-sm';
                    circleStyle = 'bg-orange-500 text-white shadow-md shadow-orange-200';
                    textStyle = 'text-orange-900 font-semibold';
                  } else {
                    optionStyle = 'bg-rose-50/70 border-rose-200 shadow-sm';
                    circleStyle = 'bg-rose-500 text-white shadow-md shadow-rose-200';
                    textStyle = 'text-rose-900 font-semibold';
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
                    {isTKP && (
                      <div className="flex-shrink-0 pl-4 border-l border-gray-200/50 ml-2">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-black
                          ${tkpPoints === 5 ? 'bg-emerald-100 text-emerald-700' :
                            tkpPoints === 4 ? 'bg-blue-100 text-blue-700' :
                            tkpPoints === 3 ? 'bg-amber-100 text-amber-700' :
                            tkpPoints === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-rose-100 text-rose-700' 
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
            <div className={`text-6xl font-black my-5 tracking-tighter ${totalStudents === 0 ? 'text-gray-400' : successRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalStudents === 0 ? '-' : `${successRate}%`}
            </div>
            <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
               <Users className="w-4 h-4 text-gray-400" />
               <span className="text-sm font-semibold text-gray-600">
                 {currentStat.correctStudents.length} dari {totalStudents} menjawab {isTKP ? 'poin maksimal' : 'benar'}
               </span>
            </div>
          </div>

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
                          <span className={`text-xs font-black px-2 h-8 flex items-center justify-center rounded-xl shadow-sm
                            ${student.points === 3 ? 'bg-amber-100 text-amber-700 shadow-amber-100/50' :
                              student.points === 2 ? 'bg-orange-100 text-orange-700 shadow-orange-100/50' :
                              'bg-rose-100 text-rose-700 shadow-rose-100/50'
                            }`}
                          >
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
            // RENDER KHUSUS TIU & TWK
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

          {/* CARD KOSONG */}
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
