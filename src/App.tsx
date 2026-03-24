import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, getDoc, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { UserProgress, UserSticker, UserAchievement, LEVELS, STICKERS, ACHIEVEMENTS } from './types';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ProgressTree } from './components/ProgressTree';
import { StickerAlbum } from './components/StickerAlbum';
import { TaskInterface } from './components/TaskInterface';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Trophy, Star, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

const INITIAL_PROGRESS: UserProgress = {
  userId: '',
  totalPoints: 0,
  level: 1,
  tasksCompleted: 0,
  wordsLearned: 0,
  role: 'student',
  lastActivityDate: new Date().toISOString(),
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [userStickers, setUserStickers] = useState<UserSticker[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tree' | 'stickers' | 'task' | 'teacher'>('dashboard');
  const [hasNavigatedToTeacher, setHasNavigatedToTeacher] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; title: string } | null>(null);

  const isTeacher = progress?.role === 'teacher' || user?.email === 'liorattia@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Auto-navigate teacher to teacher dashboard on first load
  useEffect(() => {
    if (isTeacher && !hasNavigatedToTeacher && progress) {
      setActiveTab('teacher');
      setHasNavigatedToTeacher(true);
    }
  }, [isTeacher, progress, hasNavigatedToTeacher]);

  useEffect(() => {
    if (!user) {
      setProgress(null);
      setUserStickers([]);
      setUserAchievements([]);
      return;
    }

    // Listen to progress
    const progressRef = doc(db, `users/${user.uid}/progress/data`);
    const unsubProgress = onSnapshot(progressRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProgress;
        setProgress(data);
        
        // If user is admin but role is student, update it to teacher
        if (user.email === 'liorattia@gmail.com' && data.role !== 'teacher') {
          setDoc(progressRef, { ...data, role: 'teacher' }, { merge: true })
            .catch(e => handleFirestoreError(e, OperationType.WRITE, progressRef.path));
        }
      } else {
        // Initialize progress if it doesn't exist
        const newProgress = { 
          ...INITIAL_PROGRESS, 
          userId: user.uid,
          role: user.email === 'liorattia@gmail.com' ? 'teacher' : 'student'
        };
        setDoc(progressRef, newProgress).catch(e => handleFirestoreError(e, OperationType.WRITE, progressRef.path));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, progressRef.path);
    });

    // Listen to stickers
    const stickersRef = collection(db, `users/${user.uid}/stickers`);
    const unsubStickers = onSnapshot(stickersRef, (snap) => {
      setUserStickers(snap.docs.map(d => d.data() as UserSticker));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, stickersRef.path);
    });

    // Listen to achievements
    const achievementsRef = collection(db, `users/${user.uid}/achievements`);
    const unsubAchievements = onSnapshot(achievementsRef, (snap) => {
      setUserAchievements(snap.docs.map(d => d.data() as UserAchievement));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, achievementsRef.path);
    });

    // Listen to assignments
    const assignmentsRef = collection(db, 'assignments');
    const assignmentsQuery = query(assignmentsRef, where('status', '==', 'published'));
    const unsubAssignments = onSnapshot(assignmentsQuery, (snap) => {
      const allAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter assignments for this student
      const studentAssignments = allAssignments.filter((a: any) => {
        if (a.assignedTo.includes('all')) return true;
        if (Array.isArray(a.assignedTo) && a.assignedTo.includes(user.uid)) return true;
        if (progress?.groupId && a.assignedTo.includes(`group:${progress.groupId}`)) return true;
        return false;
      });
      setAssignments(studentAssignments);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, assignmentsRef.path);
    });

    return () => {
      unsubProgress();
      unsubStickers();
      unsubAchievements();
      unsubAssignments();
    };
  }, [user, progress?.groupId]);

  const handleTaskComplete = async (correctCount: number, totalCount: number) => {
    if (!user || !progress || !selectedAssignment) return;

    const currentTask = selectedAssignment.tasks[currentTaskIndex];
    // If an assignment has exactly two tasks, only the first one is answerable.
    const isLastTask = currentTaskIndex === selectedAssignment.tasks.length - 1 || (selectedAssignment.tasks.length === 2 && currentTaskIndex === 0);

    // Calculate points for this specific task
    const taskPoints = currentTask.points || 10;
    const pointsEarned = Math.round((correctCount / totalCount) * taskPoints) + (correctCount === totalCount ? 5 : 0);
    
    const newTotalPoints = progress.totalPoints + pointsEarned;
    const newTasksCompleted = progress.tasksCompleted + 1;
    const newWordsLearned = progress.wordsLearned + correctCount;

    // Update progress locally first for immediate feedback
    const updatedProgress = {
      ...progress,
      totalPoints: newTotalPoints,
      tasksCompleted: newTasksCompleted,
      wordsLearned: newWordsLearned,
      lastActivityDate: new Date().toISOString(),
    };

    // Check for level up
    let newLevel = progress.level;
    const nextLevel = LEVELS.find(l => l.level === progress.level + 1);
    if (nextLevel && newTotalPoints >= nextLevel.points) {
      newLevel = nextLevel.level;
      updatedProgress.level = newLevel;
      setShowLevelUp({ level: newLevel, title: nextLevel.title });
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });
    }

    // Update progress in Firestore
    const progressRef = doc(db, `users/${user.uid}/progress/data`);
    
    let finalProgress = { ...updatedProgress };
    
    if (isLastTask) {
      // Assignment finished
      finalProgress.completedAssignmentIds = Array.from(new Set([...(progress.completedAssignmentIds || []), selectedAssignment.id]));
      
      setActiveTab('dashboard');
      setSelectedAssignment(null);
      setCurrentTaskIndex(0);
    } else {
      // Move to next task in assignment
      setCurrentTaskIndex(prev => prev + 1);
    }

    try {
      await setDoc(progressRef, finalProgress);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, progressRef.path);
    }

    // Check for new stickers
    for (const sticker of STICKERS) {
      if (newTotalPoints >= sticker.unlockPoints && !userStickers.find(s => s.stickerId === sticker.id)) {
        const stickerRef = doc(db, `users/${user.uid}/stickers/${sticker.id}`);
        try {
          await setDoc(stickerRef, {
            stickerId: sticker.id,
            earnedAt: new Date().toISOString(),
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, stickerRef.path);
        }
      }
    }

    // Check for new achievements
    for (const achievement of ACHIEVEMENTS) {
      if (newTasksCompleted >= achievement.pointsRequired && !userAchievements.find(a => a.achievementId === achievement.id)) {
        const achievementRef = doc(db, `users/${user.uid}/achievements/${achievement.id}`);
        try {
          await setDoc(achievementRef, {
            achievementId: achievement.id,
            earnedAt: new Date().toISOString(),
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, achievementRef.path);
        }
      }
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-100 rotate-3">
          <Sparkles size={48} />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">English-Step</h1>
        <p className="text-slate-500 max-w-xs mb-12 text-lg">המסע שלך ללמידת אנגלית מתחיל כאן.</p>
        <Auth />
      </div>
    );
  }

  if (!progress) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">טוען נתונים...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 tracking-tight leading-none">English-Step</span>
            {progress?.role && (
              <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${progress.role === 'teacher' ? 'text-blue-500' : 'text-emerald-500'}`}>
                {progress.role === 'teacher' ? 'מורה' : 'תלמיד'}
              </span>
            )}
          </div>
        </div>
        <Auth />
      </div>

      <main className={`${activeTab === 'teacher' ? 'max-w-6xl' : 'max-w-md'} mx-auto p-6`}>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Dashboard 
                progress={progress} 
                earnedAchievementIds={userAchievements.map(a => a.achievementId)}
                assignments={assignments}
                onStartAssignment={(assignment) => {
                  setSelectedAssignment(assignment);
                  setCurrentTaskIndex(0);
                  setActiveTab('task');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'tree' && (
            <motion.div
              key="tree"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProgressTree tasksCompleted={progress.tasksCompleted} />
            </motion.div>
          )}

          {activeTab === 'stickers' && (
            <motion.div
              key="stickers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StickerAlbum earnedStickerIds={userStickers.map(s => s.stickerId)} />
            </motion.div>
          )}

          {activeTab === 'teacher' && (
            <motion.div
              key="teacher"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TeacherDashboard />
            </motion.div>
          )}

          {activeTab === 'task' && (
            <motion.div
              key="task"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <TaskInterface 
                task={selectedAssignment.tasks[currentTaskIndex]} 
                onComplete={handleTaskComplete} 
                isLastTask={currentTaskIndex === selectedAssignment.tasks.length - 1 || (selectedAssignment.tasks.length === 2 && currentTaskIndex === 0)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {activeTab !== 'task' && !isTeacher && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-xs bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-2 flex justify-between items-center z-20">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Trophy size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('tree')}
            className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${activeTab === 'tree' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Sparkles size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Tree</span>
          </button>
          <button 
            onClick={() => setActiveTab('stickers')}
            className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${activeTab === 'stickers' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Star size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Album</span>
          </button>
          
          {isTeacher && (
            <button 
              onClick={() => setActiveTab('teacher')}
              className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${activeTab === 'teacher' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">מורה</span>
            </button>
          )}
        </div>
      )}

      {/* Level Up Modal */}
      <AnimatePresence>
        {showLevelUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 10 }}
              className="bg-white rounded-[3rem] p-10 text-center max-w-xs w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-400" />
              <button 
                onClick={() => setShowLevelUp(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
              
              <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl">
                🎉
              </div>
              
              <h2 className="text-3xl font-black text-slate-800 mb-2">Level Up!</h2>
              <p className="text-slate-500 mb-8 font-medium">You reached Level {showLevelUp.level}</p>
              
              <div className="bg-emerald-50 text-emerald-700 py-3 px-6 rounded-2xl font-bold text-xl mb-8">
                {showLevelUp.title}
              </div>
              
              <button 
                onClick={() => setShowLevelUp(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
