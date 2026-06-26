import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';

export default function QuestionNavigator() {
  const { state, dispatch } = useApp();
  const session = state.examSession;
  if (!session) return null;

  const { questions, answers, currentQuestionIndex } = session;

  function getStatus(qId: string, index: number) {
    if (index === currentQuestionIndex) return 'current';
    const ans = answers[qId];
    if (ans?.isMarked) return 'marked';
    if (ans?.selectedAnswer) return 'answered';
    return 'unanswered';
  }

  const statusStyles: Record<string, string> = {
    current: 'bg-[#1e3a8a] text-white ring-2 ring-[#1e3a8a] ring-offset-1 scale-110',
    answered: 'bg-[#10b981] text-white',
    marked: 'bg-amber-400 text-white',
    unanswered: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
  };

  // Summary counts
  const answered = Object.values(answers).filter((a) => a.selectedAnswer).length;
  const marked = Object.values(answers).filter((a) => a.isMarked).length;
  const unanswered = questions.length - answered;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Navigasi Soal</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#10b981]" />
              <span className="text-gray-600">Dijawab</span>
            </div>
            <span className="font-semibold text-gray-700">{answered}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-gray-600">Ragu-ragu</span>
            </div>
            <span className="font-semibold text-gray-700">{marked}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
              <span className="text-gray-600">Belum dijawab</span>
            </div>
            <span className="font-semibold text-gray-700">{unanswered}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-1.5">
          {questions.map((q, index) => {
            const status = getStatus(q.id, index);
            return (
              <motion.button
                key={q.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => dispatch({ type: 'NAVIGATE_QUESTION', payload: index })}
                className={`w-full aspect-square rounded-lg text-xs font-semibold transition-all ${statusStyles[status]}`}
              >
                {index + 1}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
