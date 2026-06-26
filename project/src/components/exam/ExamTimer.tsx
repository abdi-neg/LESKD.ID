import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ExamTimer() {
  const { state } = useApp(); // Hanya membaca state global
  const timeRemaining = state.examSession?.timeRemaining ?? 0;

  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  const isWarning = timeRemaining <= 300 && timeRemaining > 60;
  const isDanger = timeRemaining <= 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <motion.div
      animate={isDanger ? { scale: [1, 1.03, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono font-bold text-lg
        ${isDanger
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
          : isWarning
          ? 'bg-amber-100 text-amber-700 border border-amber-200'
          : 'bg-blue-50 text-[#1e3a8a] border border-blue-100'
        }`}
    >
      {isDanger ? (
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Clock className="w-4 h-4 flex-shrink-0" />
      )}
      <span>
        {hours > 0 && `${pad(hours)}:`}
        {pad(minutes)}:{pad(seconds)}
      </span>
    </motion.div>
  );
}
