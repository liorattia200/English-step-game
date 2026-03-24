import React from 'react';
import { UserProgress, LEVELS, ACHIEVEMENTS } from '../types';
import { Trophy, Star, BookOpen, Target, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  progress: UserProgress;
  earnedAchievementIds: string[];
  assignments: any[];
  onStartAssignment: (assignment: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ progress, earnedAchievementIds, assignments, onStartAssignment }) => {
  const currentLevelInfo = LEVELS.find(l => l.level === progress.level) || LEVELS[0];
  const nextLevelInfo = LEVELS.find(l => l.level === progress.level + 1);
  
  const progressToNext = nextLevelInfo 
    ? ((progress.totalPoints - currentLevelInfo.points) / (nextLevelInfo.points - currentLevelInfo.points)) * 100
    : 100;

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 text-white shadow-lg shadow-emerald-100">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">My English Journey</h1>
            <p className="opacity-80 text-sm font-medium">Keep going, you're doing great!</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2">
            <Star size={20} fill="currentColor" className="text-amber-300" />
            <span className="font-bold text-lg">{progress.totalPoints}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Current Level</div>
            <div className="text-xl font-bold">{progress.level} - {currentLevelInfo.title}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Tasks Done</div>
            <div className="text-xl font-bold">{progress.tasksCompleted}</div>
          </div>
        </div>

        {nextLevelInfo && (
          <div className="mt-8">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
              <span>Progress to Level {progress.level + 1}</span>
              <span>{Math.round(progressToNext)}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                className="h-full bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Assigned Assignments */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Star size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">My Assignments</h3>
          </div>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
            {assignments.length} Assigned
          </span>
        </div>

        <div className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map((assignment) => {
              const isCompleted = progress.completedAssignmentIds?.includes(assignment.id);
              return (
                <div 
                  key={assignment.id}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                    isCompleted 
                      ? 'bg-emerald-50/50 border-emerald-100 opacity-80' 
                      : 'bg-slate-50 border-transparent hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                  onClick={() => onStartAssignment(assignment)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold transition-colors ${isCompleted ? 'text-emerald-700' : 'text-slate-800 group-hover:text-emerald-700'}`}>
                        {assignment.title}
                      </h4>
                      {isCompleted && (
                        <div className="bg-emerald-500 text-white p-0.5 rounded-full">
                          <CheckCircle2 size={10} />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white rounded-lg text-slate-500 shadow-sm">
                      {assignment.tasks.length} {assignment.tasks.length === 1 ? 'Task' : 'Tasks'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{assignment.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <Star size={14} fill="currentColor" />
                      {assignment.points} Points
                    </div>
                    {assignment.dueDate && (
                      <div className="text-[10px] text-slate-400 font-medium">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-slate-500 text-sm">All caught up! No assignments assigned.</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Mission */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Target size={20} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Today's Mission</h3>
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
          <div>
            <div className="font-bold text-slate-700">Complete 1 assignment</div>
            <div className="text-xs text-slate-500">Reward: +5 points</div>
          </div>
          <button 
            onClick={() => assignments.length > 0 && onStartAssignment(assignments[0])}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95"
          >
            Start
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3">
            <BookOpen size={24} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{progress.wordsLearned}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Words Learned</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3">
            <Trophy size={24} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{earnedAchievementIds.length}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Achievements</div>
        </div>
      </div>

      {/* Achievements List */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Badges</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {ACHIEVEMENTS.map((achievement) => {
            const isEarned = earnedAchievementIds.includes(achievement.id);
            return (
              <div 
                key={achievement.id}
                className={`flex-shrink-0 w-24 flex flex-col items-center gap-2 ${isEarned ? 'opacity-100' : 'opacity-30 grayscale'}`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${isEarned ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  {achievement.icon}
                </div>
                <div className="text-[10px] font-bold text-slate-600 text-center leading-tight">{achievement.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
