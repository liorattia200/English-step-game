export interface UserProgress {
  userId: string;
  displayName?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  groupId?: string; // Changed from group to groupId
  totalPoints: number;
  level: number;
  tasksCompleted: number;
  wordsLearned: number;
  role?: 'student' | 'teacher';
  lastActivityDate?: string;
  completedAssignmentIds?: string[];
  currentMission?: {
    description: string;
    target: number;
    current: number;
    reward: number;
  };
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export type TaskType = 
  | 'match_picture'
  | 'listen_choose'
  | 'build_sentence'
  | 'drag_word'
  | 'true_false'
  | 'correct_spelling'
  | 'word_memory'
  | 'complete_dialogue'
  | 'find_word_in_sentence'
  | 'choose_correct_picture'
  | 'spot_mistake'
  | 'category_game'
  | 'speed_challenge'
  | 'listening_sentence'
  | 'mini_story'
  | 'emoji_english'
  | 'guess_word'
  | 'daily_english'
  | 'word_builder'
  | 'pronunciation_check';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  points: number;
  content: any; // Specific content based on type
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  points: number;
  assignedTo: string[]; // Array of userIds or 'all' or groupId
  createdBy: string;
  createdAt: string;
  dueDate?: string;
  status: 'draft' | 'published';
}

export interface MatchPictureContent {
  image: string; // Emoji or URL
  options: string[];
  correctAnswer: string;
  audioUrl?: string;
}

export interface ListenChooseContent {
  audioText: string;
  options: string[];
  correctAnswer: string;
}

export interface BuildSentenceContent {
  words: string[]; // e.g. ["like", "I", "apples"]
  correctSentence: string; // "I like apples"
}

export interface DragWordContent {
  sentence: string; // "The cat is ___ the table"
  options: string[];
  correctAnswer: string;
}

export interface TrueFalseContent {
  image?: string;
  statement: string;
  isTrue: boolean;
}

export interface CorrectSpellingContent {
  audioText: string;
  options: string[];
  correctAnswer: string;
}

export interface WordMemoryContent {
  pairs: { word: string; translation: string }[];
}

export interface CompleteDialogueContent {
  dialogue: { speaker: string; text: string }[];
  options: string[];
  correctAnswer: string;
}

export interface FindWordInSentenceContent {
  sentence: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface ChooseCorrectPictureContent {
  sentence: string;
  options: { image: string; label: string }[];
  correctAnswer: string;
}

export interface SpotMistakeContent {
  sentence: string;
  options: { original: string; correction: string; label: string }[];
  correctAnswer: string;
}

export interface CategoryGameContent {
  categories: { name: string; items: string[] }[];
  allItems: string[];
}

export interface SpeedChallengeContent {
  words: string[];
  timeLimit: number; // in seconds
}

export interface ListeningSentenceContent {
  audioText: string;
  correctSentence: string;
}

export interface MiniStoryContent {
  story: string;
  questions: { question: string; correctAnswer: string }[];
}

export interface EmojiEnglishContent {
  emojis: string; // 🐶 + 🍎
  correctAnswer: string;
  hint?: string;
}

export interface GuessWordContent {
  hint: string;
  correctAnswer: string;
}

export interface DailyEnglishContent {
  phrase: string;
  context: string;
  correctAnswer: string;
}

export interface WordBuilderContent {
  word: string;
}

export interface PronunciationCheckContent {
  textToPronounce: string;
  audioUrl?: string;
}

export interface Sticker {
  id: string;
  name: string;
  imageUrl: string;
  unlockPoints: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  icon: string;
}

export interface UserSticker {
  stickerId: string;
  earnedAt: string;
}

export interface UserAchievement {
  achievementId: string;
  earnedAt: string;
}

export const LEVELS = [
  { level: 1, points: 0, title: "First Words" },
  { level: 2, points: 40, title: "Word Explorer" },
  { level: 3, points: 100, title: "Sentence Builder" },
  { level: 4, points: 200, title: "English Learner" },
  { level: 5, points: 350, title: "Language Hero" },
];

export const STICKERS: Sticker[] = [
  { id: 'apple', name: 'Apple', imageUrl: '🍎', unlockPoints: 20 },
  { id: 'dog', name: 'Dog', imageUrl: '🐶', unlockPoints: 50 },
  { id: 'cow', name: 'Cow', imageUrl: '🐄', unlockPoints: 100 },
  { id: 'banana', name: 'Banana', imageUrl: '🍌', unlockPoints: 200 },
  { id: 'cat', name: 'Cat', imageUrl: '🐱', unlockPoints: 300 },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'beginner', name: 'Beginner', description: 'First 5 tasks', pointsRequired: 5, icon: '🌱' },
  { id: 'explorer', name: 'Explorer', description: '20 tasks', pointsRequired: 20, icon: '🧭' },
  { id: 'star', name: 'English Star', description: '50 tasks', pointsRequired: 50, icon: '⭐' },
  { id: 'hero', name: 'Language Hero', description: '100 tasks', pointsRequired: 100, icon: '🏆' },
];
