import React from 'react';
import { motion } from 'motion/react';

interface ProgressTreeProps {
  tasksCompleted: number;
}

export const ProgressTree: React.FC<ProgressTreeProps> = ({ tasksCompleted }) => {
  const getStage = () => {
    if (tasksCompleted < 5) return { stage: 'Seed', icon: '🌱', scale: 1 };
    if (tasksCompleted < 15) return { stage: 'Small Tree', icon: '🌿', scale: 1.5 };
    if (tasksCompleted < 30) return { stage: 'Growing Tree', icon: '🌳', scale: 2 };
    return { stage: 'Strong Tree', icon: '🌳🌳', scale: 2.5 };
  };

  const { stage, icon, scale } = getStage();

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-slate-100 min-h-[300px]">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">English Progress Tree</h3>
      <p className="text-sm text-slate-500 mb-8">Your tree grows as you learn!</p>
      
      <div className="relative flex items-center justify-center h-40">
        <motion.div
          key={stage}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: scale, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 10 }}
          className="text-6xl select-none"
        >
          {icon}
        </motion.div>
        
        {/* Decorative leaves/particles */}
        {Array.from({ length: Math.min(tasksCompleted, 20) }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: -50 - Math.random() * 50,
              x: (Math.random() - 0.5) * 100
            }}
            transition={{ 
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.5
            }}
            className="absolute text-xs text-emerald-400 pointer-events-none"
          >
            🍃
          </motion.div>
        ))}
      </div>
      
      <div className="mt-8 px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
        {stage}
      </div>
    </div>
  );
};
