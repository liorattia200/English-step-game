import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Star, Trophy, Volume2, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Task, MatchPictureContent, ListenChooseContent, BuildSentenceContent, TrueFalseContent, CorrectSpellingContent, EmojiEnglishContent, GuessWordContent, DailyEnglishContent, FindWordInSentenceContent, ChooseCorrectPictureContent, ListeningSentenceContent, WordBuilderContent, DragWordContent, WordMemoryContent, CompleteDialogueContent, SpotMistakeContent, CategoryGameContent, SpeedChallengeContent, MiniStoryContent, PronunciationCheckContent } from '../types';

interface TaskInterfaceProps {
  task: Task;
  onComplete: (correctCount: number, totalCount: number) => void;
  isLastTask: boolean;
}

export const TaskInterface: React.FC<TaskInterfaceProps> = ({ task, onComplete, isLastTask }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]); // For build_sentence
  const [userInput, setUserInput] = useState(''); // For text input tasks
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]); // For word_builder
  const [memoryCards, setMemoryCards] = useState<{ id: number; content: string; type: 'word' | 'translation'; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [categoryItems, setCategoryItems] = useState<{ item: string; category: string; isPlaced: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // Reset state when task changes
  useEffect(() => {
    setCurrentIdx(0);
    setCorrectCount(0);
    setShowFeedback(null);
    setIsFinished(false);
    setSelectedWords([]);
    setUserInput('');
    if (task.type === 'word_builder') {
      const word = (task.content as WordBuilderContent).word;
      setScrambledLetters(word.split('').sort(() => Math.random() - 0.5));
    }
    if (task.type === 'word_memory') {
      const content = task.content as WordMemoryContent;
      const cards = content.pairs.flatMap((pair, i) => [
        { id: i * 2, content: pair.word, type: 'word' as const, isFlipped: false, isMatched: false },
        { id: i * 2 + 1, content: pair.translation, type: 'translation' as const, isFlipped: false, isMatched: false }
      ]).sort(() => Math.random() - 0.5);
      setMemoryCards(cards);
      setFlippedCards([]);
    }
    if (task.type === 'category_game') {
      const content = task.content as CategoryGameContent;
      const items = content.categories.flatMap(cat => 
        cat.items.map(item => ({ item, category: cat.name, isPlaced: false }))
      ).sort(() => Math.random() - 0.5);
      setCategoryItems(items);
    }
    if (task.type === 'speed_challenge') {
      setTimeLeft((task.content as SpeedChallengeContent).timeLimit || 30);
    }
  }, [task.id]);

  useEffect(() => {
    if (task.type === 'speed_challenge' && timeLeft > 0 && !isFinished) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (task.type === 'speed_challenge' && timeLeft === 0 && !isFinished) {
      handleAnswer('timeout', 'none');
    }
  }, [timeLeft, task.type, isFinished]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleAnswer = (answer: string, correctAnswer: string) => {
    const isCorrect = answer === correctAnswer;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setShowFeedback('correct');
    } else {
      setShowFeedback('incorrect');
    }

    setTimeout(() => {
      setShowFeedback(null);
      setIsFinished(true);
      if (isCorrect) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, 1500);
  };

  const handleSentenceSubmit = () => {
    const content = task.content as BuildSentenceContent;
    const answer = selectedWords.join(' ');
    handleAnswer(answer, content.correctSentence);
  };

  const handleTextSubmit = (correctAnswer: string) => {
    handleAnswer(userInput.trim().toLowerCase(), correctAnswer.toLowerCase());
  };

  const handleWordBuilderSubmit = () => {
    const content = task.content as WordBuilderContent;
    handleAnswer(userInput, content.word);
  };

  const handleCategoryItemClick = (itemIdx: number, categoryName: string) => {
    const item = categoryItems[itemIdx];
    if (item.category === categoryName) {
      setCategoryItems(prev => prev.map((it, i) => i === itemIdx ? { ...it, isPlaced: true } : it));
      if (categoryItems.filter(it => !it.isPlaced).length === 1) {
        handleAnswer('all_placed', 'all_placed');
      }
    } else {
      setShowFeedback('incorrect');
      setTimeout(() => setShowFeedback(null), 1000);
    }
  };

  const handleStoryAnswer = (answer: string, correctAnswer: string) => {
    const content = task.content as MiniStoryContent;
    const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    
    if (isCorrect) {
      if (currentIdx < content.questions.length - 1) {
        setCorrectCount(prev => prev + 1);
        setShowFeedback('correct');
        setTimeout(() => {
          setShowFeedback(null);
          setCurrentIdx(prev => prev + 1);
          setUserInput('');
        }, 1500);
      } else {
        setCorrectCount(prev => prev + 1);
        handleAnswer(answer, correctAnswer);
      }
    } else {
      setShowFeedback('incorrect');
      setTimeout(() => setShowFeedback(null), 1500);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    // Mock recording for 2 seconds
    setTimeout(() => {
      setIsRecording(false);
      handleAnswer('recorded', 'recorded');
    }, 2000);
  };

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || memoryCards.find(c => c.id === id)?.isMatched || flippedCards.includes(id)) return;

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const card1 = memoryCards.find(c => c.id === newFlipped[0])!;
      const card2 = memoryCards.find(c => c.id === newFlipped[1])!;
      
      const content = task.content as WordMemoryContent;
      const isMatch = content.pairs.some(p => 
        (p.word === card1.content && p.translation === card2.content) ||
        (p.word === card2.content && p.translation === card1.content)
      );

      if (isMatch) {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => 
            newFlipped.includes(c.id) ? { ...c, isMatched: true } : c
          ));
          setFlippedCards([]);
          
          // Check if all matched
          const allMatched = memoryCards.every(c => c.isMatched || newFlipped.includes(c.id));
          if (allMatched) {
            handleAnswer('matched', 'matched');
          }
        }, 600);
      } else {
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  if (isFinished) {
    let totalCount = 1;
    if (task.type === 'mini_story') totalCount = (task.content as MiniStoryContent).questions.length;
    if (task.type === 'speed_challenge') totalCount = (task.content as SpeedChallengeContent).words.length;
    if (task.type === 'word_memory') totalCount = (task.content as WordMemoryContent).pairs.length;
    if (task.type === 'category_game') {
      const content = task.content as CategoryGameContent;
      totalCount = content.categories.reduce((acc, cat) => acc + cat.items.length, 0);
    }

    const basePoints = task.points || 10;
    const points = Math.round((correctCount / totalCount) * basePoints) + (correctCount === totalCount ? 5 : 0);
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Great work!</h2>
        <p className="text-slate-500 mb-6">You completed: {task.title}</p>
        
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">+{points}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Points</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{correctCount}/{totalCount}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correct</div>
          </div>
        </div>

        <button 
          onClick={() => onComplete(correctCount, totalCount)}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
        >
          {isLastTask ? 'Finish Assignment' : 'Next Task'}
        </button>
      </motion.div>
    );
  }

  const renderContent = () => {
    switch (task.type) {
      case 'match_picture': {
        const content = task.content as MatchPictureContent;
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="text-8xl p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                {content.image}
              </div>
              <button 
                onClick={() => speak(content.correctAnswer)}
                className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
              >
                <Volume2 size={24} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {content.options.map((option) => (
                <button
                  key={option}
                  disabled={showFeedback !== null}
                  onClick={() => handleAnswer(option, content.correctAnswer)}
                  className={`w-full p-4 text-left rounded-2xl border-2 font-medium transition-all flex justify-between items-center ${
                    showFeedback === 'correct' && option === content.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : showFeedback === 'incorrect' && option !== content.correctAnswer
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {option}
                  {showFeedback === 'correct' && option === content.correctAnswer && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'listen_choose': {
        const content = task.content as ListenChooseContent;
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <button 
                onClick={() => speak(content.audioText)}
                className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Play size={40} fill="currentColor" />
              </button>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Click to listen</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {content.options.map((option) => (
                <button
                  key={option}
                  disabled={showFeedback !== null}
                  onClick={() => handleAnswer(option, content.correctAnswer)}
                  className={`w-full p-4 text-left rounded-2xl border-2 font-medium transition-all flex justify-between items-center ${
                    showFeedback === 'correct' && option === content.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : showFeedback === 'incorrect' && option !== content.correctAnswer
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {option}
                  {showFeedback === 'correct' && option === content.correctAnswer && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'build_sentence': {
        const content = task.content as BuildSentenceContent;
        const availableWords = content.words.filter(w => !selectedWords.includes(w));
        
        return (
          <div className="space-y-8">
            <div className="min-h-[100px] p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-wrap gap-2 items-center justify-center">
              {selectedWords.map((word, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedWords(prev => prev.filter((_, idx) => idx !== i))}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {word}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {content.words.map((word, i) => {
                const occurrencesInSelected = selectedWords.filter(w => w === word).length;
                const totalOccurrences = content.words.filter(w => w === word).length;
                const isAvailable = occurrencesInSelected < totalOccurrences;

                return (
                  <button
                    key={i}
                    disabled={!isAvailable || showFeedback !== null}
                    onClick={() => setSelectedWords(prev => [...prev, word])}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${
                      isAvailable 
                        ? 'bg-white border border-slate-200 text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50' 
                        : 'bg-slate-100 text-slate-300 border-transparent cursor-not-allowed opacity-50'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedWords([])}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Clear
              </button>
              <button
                disabled={selectedWords.length === 0 || showFeedback !== null}
                onClick={handleSentenceSubmit}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                Check Sentence
              </button>
            </div>
          </div>
        );
      }

      case 'true_false': {
        const content = task.content as TrueFalseContent;
        return (
          <div className="space-y-8">
            <div className="p-8 bg-slate-50 rounded-3xl text-center">
              {content.image && <div className="text-6xl mb-4">{content.image}</div>}
              <h3 className="text-2xl font-bold text-slate-800">{content.statement}</h3>
            </div>
            <div className="flex gap-4">
              <button
                disabled={showFeedback !== null}
                onClick={() => handleAnswer('true', content.isTrue ? 'true' : 'false')}
                className={`flex-1 py-6 rounded-2xl border-2 font-bold text-xl transition-all ${
                  showFeedback === 'correct' && content.isTrue
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : showFeedback === 'incorrect' && !content.isTrue
                    ? 'bg-amber-50 border-amber-500 text-amber-700'
                    : 'bg-white border-slate-100 hover:border-emerald-200 text-slate-700'
                }`}
              >
                True
              </button>
              <button
                disabled={showFeedback !== null}
                onClick={() => handleAnswer('false', !content.isTrue ? 'false' : 'true')}
                className={`flex-1 py-6 rounded-2xl border-2 font-bold text-xl transition-all ${
                  showFeedback === 'correct' && !content.isTrue
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : showFeedback === 'incorrect' && content.isTrue
                    ? 'bg-amber-50 border-amber-500 text-amber-700'
                    : 'bg-white border-slate-100 hover:border-emerald-200 text-slate-700'
                }`}
              >
                False
              </button>
            </div>
          </div>
        );
      }

      case 'correct_spelling': {
        const content = task.content as CorrectSpellingContent;
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 py-4">
              <button 
                onClick={() => speak(content.audioText)}
                className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all"
              >
                <Play size={32} fill="currentColor" />
              </button>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Listen to the word</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {content.options.map((option) => (
                <button
                  key={option}
                  disabled={showFeedback !== null}
                  onClick={() => handleAnswer(option, content.correctAnswer)}
                  className={`w-full p-4 text-left rounded-2xl border-2 font-medium transition-all flex justify-between items-center ${
                    showFeedback === 'correct' && option === content.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : showFeedback === 'incorrect' && option !== content.correctAnswer
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {option}
                  {showFeedback === 'correct' && option === content.correctAnswer && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'emoji_english': {
        const content = task.content as EmojiEnglishContent;
        return (
          <div className="space-y-8">
            <div className="p-12 bg-slate-50 rounded-3xl text-center text-7xl shadow-inner">
              {content.emojis}
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type the English word..."
                className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none text-center text-xl font-bold"
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit(content.correctAnswer)}
              />
              {content.hint && <p className="text-center text-slate-400 text-sm">Hint: {content.hint}</p>}
              <button
                onClick={() => handleTextSubmit(content.correctAnswer)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
              >
                Check Answer
              </button>
            </div>
          </div>
        );
      }

      case 'guess_word': {
        const content = task.content as GuessWordContent;
        return (
          <div className="space-y-8">
            <div className="p-8 bg-blue-50 rounded-3xl text-center border border-blue-100">
              <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-2">Hint</p>
              <h3 className="text-2xl font-bold text-slate-800">{content.hint}</h3>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="What's the word?"
                className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none text-center text-xl font-bold"
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit(content.correctAnswer)}
              />
              <button
                onClick={() => handleTextSubmit(content.correctAnswer)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
              >
                Submit
              </button>
            </div>
          </div>
        );
      }

      case 'daily_english': {
        const content = task.content as DailyEnglishContent;
        return (
          <div className="space-y-8">
            <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100">
              <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs mb-2">Context: {content.context}</p>
              <h3 className="text-2xl font-bold text-slate-800 text-center">{content.phrase}</h3>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Complete the phrase..."
                className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none text-center text-xl font-bold"
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit(content.correctAnswer)}
              />
              <button
                onClick={() => handleTextSubmit(content.correctAnswer)}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
              >
                Check
              </button>
            </div>
          </div>
        );
      }

      case 'find_word_in_sentence': {
        const content = task.content as FindWordInSentenceContent;
        return (
          <div className="space-y-8">
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 text-center">{content.question}</p>
              <h3 className="text-2xl font-bold text-slate-800 text-center leading-relaxed">
                {content.sentence.split(' ').map((word, i) => (
                  <span key={i} className="inline-block mx-1">{word}</span>
                ))}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {content.options.map((option) => (
                <button
                  key={option}
                  disabled={showFeedback !== null}
                  onClick={() => handleAnswer(option, content.correctAnswer)}
                  className={`w-full p-4 text-left rounded-2xl border-2 font-medium transition-all flex justify-between items-center ${
                    showFeedback === 'correct' && option === content.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : showFeedback === 'incorrect' && option !== content.correctAnswer
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {option}
                  {showFeedback === 'correct' && option === content.correctAnswer && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'choose_correct_picture': {
        const content = task.content as ChooseCorrectPictureContent;
        return (
          <div className="space-y-8">
            <div className="p-6 bg-blue-50 rounded-3xl text-center border border-blue-100">
              <h3 className="text-2xl font-bold text-slate-800">{content.sentence}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {content.options.map((option) => (
                <button
                  key={option.label}
                  disabled={showFeedback !== null}
                  onClick={() => handleAnswer(option.label, content.correctAnswer)}
                  className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                    showFeedback === 'correct' && option.label === content.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : showFeedback === 'incorrect' && option.label !== content.correctAnswer
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-slate-700'
                  }`}
                >
                  <div className="text-6xl">{option.image}</div>
                  <div className="font-bold">{option.label}</div>
                  {showFeedback === 'correct' && option.label === content.correctAnswer && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'listening_sentence': {
        const content = task.content as ListeningSentenceContent;
        return (
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-4 py-4">
              <button 
                onClick={() => speak(content.audioText)}
                className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all"
              >
                <Play size={40} fill="currentColor" />
              </button>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Listen to the sentence</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type what you hear..."
                className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none text-center text-xl font-bold"
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit(content.correctSentence)}
              />
              <button
                onClick={() => handleTextSubmit(content.correctSentence)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
              >
                Check Sentence
              </button>
            </div>
          </div>
        );
      }

      case 'word_builder': {
        const content = task.content as WordBuilderContent;
        return (
          <div className="space-y-8">
            <div className="min-h-[80px] p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-wrap gap-2 items-center justify-center text-3xl font-bold text-blue-600 tracking-widest">
              {userInput}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {scrambledLetters.map((letter, i) => {
                const occurrencesInInput = userInput.split('').filter(l => l === letter).length;
                const totalOccurrences = content.word.split('').filter(l => l === letter).length;
                const isAvailable = occurrencesInInput < totalOccurrences;

                return (
                  <button
                    key={i}
                    disabled={!isAvailable || showFeedback !== null}
                    onClick={() => setUserInput(prev => prev + letter)}
                    className={`w-12 h-12 rounded-xl font-bold text-xl transition-all flex items-center justify-center ${
                      isAvailable 
                        ? 'bg-white border border-slate-200 text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50' 
                        : 'bg-slate-100 text-slate-300 border-transparent cursor-not-allowed opacity-50'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUserInput('')}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Clear
              </button>
              <button
                disabled={userInput.length === 0 || showFeedback !== null}
                onClick={handleWordBuilderSubmit}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                Check Word
              </button>
            </div>
          </div>
        );
      }

      case 'drag_word': {
        const content = task.content as DragWordContent;
        return (
          <div className="space-y-8">
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
              <h3 className="text-2xl font-bold text-slate-800 leading-relaxed">
                {content.sentence.split('___').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="inline-block min-w-[100px] border-b-2 border-blue-500 text-blue-600 mx-2">
                        {userInput || '...'}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {content.options.map((option) => (
                <button
                  key={option}
                  disabled={showFeedback !== null}
                  onClick={() => {
                    setUserInput(option);
                    handleAnswer(option, content.correctAnswer);
                  }}
                  className={`w-full p-4 rounded-2xl border-2 font-bold transition-all ${
                    showFeedback === 'correct' && option === content.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : showFeedback === 'incorrect' && option === userInput
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'word_memory': {
        return (
          <div className="grid grid-cols-2 gap-3">
            {memoryCards.map((card) => {
              const isFlipped = flippedCards.includes(card.id) || card.isMatched;
              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`h-24 rounded-2xl border-2 font-bold transition-all flex items-center justify-center p-2 text-center text-sm ${
                    card.isMatched
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : isFlipped
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-slate-100 hover:border-blue-200'
                  }`}
                >
                  {isFlipped ? card.content : '?'}
                </button>
              );
            })}
          </div>
        );
      }

      case 'complete_dialogue': {
        const content = task.content as CompleteDialogueContent;
        return (
          <div className="space-y-6">
            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
              {content.dialogue.map((line, i) => (
                <div key={i} className={`flex flex-col ${line.speaker === 'A' ? 'items-start' : 'items-end'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">{line.speaker}</span>
                  <div className={`p-3 rounded-2xl max-w-[80%] ${
                    line.speaker === 'A' ? 'bg-white text-slate-700 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'
                  }`}>
                    {line.text.includes('___') ? (
                      line.text.split('___').map((part, j, arr) => (
                        <React.Fragment key={j}>
                          {part}
                          {j < arr.length - 1 && (
                            <span className="underline font-bold mx-1">{userInput || '...'}</span>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      line.text
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {content.options.map((option) => (
                <button
                  key={option}
                  disabled={showFeedback !== null}
                  onClick={() => {
                    setUserInput(option);
                    handleAnswer(option, content.correctAnswer);
                  }}
                  className={`w-full p-4 text-left rounded-2xl border-2 font-medium transition-all flex justify-between items-center ${
                    showFeedback === 'correct' && option === content.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : showFeedback === 'incorrect' && option === userInput
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {option}
                  {showFeedback === 'correct' && option === content.correctAnswer && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'spot_mistake': {
        const content = task.content as SpotMistakeContent;
        return (
          <div className="space-y-8">
            <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100 text-center">
              <p className="text-amber-600 font-bold uppercase tracking-widest text-xs mb-2">Find the mistake</p>
              <h3 className="text-2xl font-bold text-slate-800 leading-relaxed">
                {content.sentence}
              </h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="The mistake..."
                  className="p-4 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none text-center font-bold"
                />
                <input
                  type="text"
                  placeholder="The correction..."
                  className="p-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none text-center font-bold"
                  onChange={(e) => {
                    if (userInput.toLowerCase().trim() === (content as any).mistake?.toLowerCase().trim()) {
                      if (e.target.value.toLowerCase().trim() === (content as any).correction?.toLowerCase().trim()) {
                        handleAnswer('correct', 'correct');
                      }
                    }
                  }}
                />
              </div>
              <p className="text-center text-slate-400 text-sm italic">Type the wrong word and then the right one.</p>
            </div>
          </div>
        );
      }

      case 'category_game': {
        const content = task.content as CategoryGameContent;
        const currentItemIdx = categoryItems.findIndex(it => !it.isPlaced);
        const currentItem = categoryItems[currentItemIdx];

        return (
          <div className="space-y-8">
            <div className="p-12 bg-blue-50 rounded-3xl text-center border-2 border-dashed border-blue-200">
              {currentItem ? (
                <motion.div
                  key={currentItem.item}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold text-blue-600"
                >
                  {currentItem.item}
                </motion.div>
              ) : (
                <div className="text-emerald-600 font-bold">All items placed!</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {content.categories.map((cat) => (
                <button
                  key={cat.name}
                  disabled={!currentItem || showFeedback !== null}
                  onClick={() => handleCategoryItemClick(currentItemIdx, cat.name)}
                  className="p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-300 hover:bg-blue-50 transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cat.name}</span>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {categoryItems.filter(it => it.isPlaced && it.category === cat.name).map((it, i) => (
                      <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'speed_challenge': {
        const content = task.content as SpeedChallengeContent;
        const currentWord = content.words[currentIdx];

        return (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                {timeLeft}s
              </div>
              <div className="text-slate-400 font-bold">{currentIdx + 1}/{content.words.length}</div>
            </div>
            <div className="p-12 bg-slate-50 rounded-3xl text-center border border-slate-100">
              <h3 className="text-5xl font-bold text-slate-800">{currentWord}</h3>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                autoFocus
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                  if (e.target.value.toLowerCase().trim() === currentWord.toLowerCase().trim()) {
                    if (currentIdx < content.words.length - 1) {
                      setCorrectCount(prev => prev + 1);
                      setCurrentIdx(prev => prev + 1);
                      setUserInput('');
                    } else {
                      setCorrectCount(prev => prev + 1);
                      handleAnswer('done', 'done');
                    }
                  }
                }}
                placeholder="Type fast!"
                className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none text-center text-xl font-bold"
              />
            </div>
          </div>
        );
      }

      case 'mini_story': {
        const content = task.content as MiniStoryContent;
        const currentQuestion = content.questions[currentIdx];

        return (
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 max-h-[200px] overflow-y-auto text-slate-700 leading-relaxed">
              {content.story}
            </div>
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
              <p className="text-blue-600 font-bold uppercase tracking-widest text-[10px] mb-2">Question {currentIdx + 1}</p>
              <h4 className="text-lg font-bold text-slate-800 mb-4">{currentQuestion.question}</h4>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Your answer..."
                className="w-full p-3 rounded-xl border-2 border-white focus:border-blue-300 outline-none text-center font-bold"
                onKeyDown={(e) => e.key === 'Enter' && handleStoryAnswer(userInput, currentQuestion.correctAnswer)}
              />
              <button
                onClick={() => handleStoryAnswer(userInput, currentQuestion.correctAnswer)}
                className="w-full mt-3 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        );
      }

      case 'pronunciation_check': {
        const content = task.content as PronunciationCheckContent;
        return (
          <div className="space-y-8 text-center">
            <div className="p-12 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Say this out loud</p>
              <h3 className="text-4xl font-bold text-slate-800 mb-6">{content.textToPronounce}</h3>
              <button 
                onClick={() => speak(content.textToPronounce)}
                className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
              >
                <Volume2 size={24} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                } text-white shadow-lg`}
              >
                <div className={`w-8 h-8 rounded-full ${isRecording ? 'bg-white' : 'border-4 border-white'}`} />
              </button>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                {isRecording ? 'Recording...' : 'Tap to speak'}
              </p>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Task Type Not Fully Ready</h3>
            <p className="text-slate-500 text-sm">This task type ({task.type}) is coming soon!</p>
            <button 
              onClick={() => onComplete(1, 1)}
              className="mt-6 px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
            >
              Skip for now
            </button>
          </div>
        );
    }
  };

  return (
    <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{task.title}</div>
        <div className="flex gap-1">
          <div className="h-1.5 w-12 rounded-full bg-emerald-500" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-8">{task.description}</h2>

      {renderContent()}

      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mt-8 p-4 rounded-2xl text-center font-bold flex items-center justify-center gap-2 ${
              showFeedback === 'correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {showFeedback === 'correct' ? (
              <>
                <Star size={20} fill="currentColor" />
                ✔ Correct! Great job!
              </>
            ) : (
              <>
                <X size={20} />
                Almost! Try again!
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
