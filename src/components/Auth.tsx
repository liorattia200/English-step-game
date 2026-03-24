import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { LogIn, LogOut, User, GraduationCap, Key, Mail, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Auth: React.FC = () => {
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if progress exists
      const progressRef = doc(db, `users/${user.uid}/progress/data`);
      let progressSnap;
      try {
        progressSnap = await getDoc(progressRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, progressRef.path);
        return;
      }

      if (!progressSnap.exists()) {
        try {
          await setDoc(progressRef, {
            userId: user.uid,
            totalPoints: 0,
            level: 1,
            tasksCompleted: 0,
            wordsLearned: 0,
            role: 'teacher', // Google login defaults to teacher
            lastActivityDate: new Date().toISOString()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, progressRef.path);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('שיטת ההתחברות עם גוגל כבויה ב-Firebase. עליך להפעיל אותה ב-Console תחת Authentication > Sign-in method.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('החלון הקופץ נחסם על ידי הדפדפן. אנא אפשר חלונות קופצים ונסה שוב.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('החלון נסגר לפני השלמת ההתחברות.');
      } else {
        setError('התחברות עם גוגל נכשלה. וודא ששיטת ההתחברות מופעלת ב-Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalEmail = email;
      let finalPassword = password;

      if (mode === 'student') {
        if (code.length !== 6 || password.length !== 6) {
          throw new Error("הקוד והסיסמה חייבים להיות בני 6 ספרות");
        }
        finalEmail = `${code}@student.app`;
        finalPassword = password;
      }

      if (isRegister) {
        let inviteData: any = null;
        let inviteDoc: any = null;

        if (mode === 'student') {
          // First, check if the invite exists at all
          const inviteBaseQuery = query(
            collection(db, 'student_invites'),
            where('code', '==', code),
            where('pass', '==', password)
          );
          const inviteBaseSnap = await getDocs(inviteBaseQuery);

          if (inviteBaseSnap.empty) {
            throw new Error("קוד תלמיד או סיסמה שגויים. וודא שהזנת את הפרטים בדיוק כפי שקיבלת מהמורה.");
          }

          inviteDoc = inviteBaseSnap.docs[0];
          inviteData = inviteDoc.data();

          if (inviteData.status !== 'pending') {
            throw new Error("קוד זה כבר נוצל לרישום תלמיד. אם כבר נרשמת, עליך להתחבר במקום להירשם.");
          }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, finalPassword);
        
        // Update invite status after successful user creation
        if (mode === 'student' && inviteDoc) {
          const inviteDocRef = inviteDoc.ref;
          await updateDoc(inviteDocRef, { 
            status: 'registered', 
            registeredAt: new Date().toISOString(),
            userId: userCredential.user.uid
          });
        }

        // Initialize user data
        const progressRef = doc(db, `users/${userCredential.user.uid}/progress/data`);
        try {
          await setDoc(progressRef, {
            userId: userCredential.user.uid,
            totalPoints: 0,
            level: 1,
            tasksCompleted: 0,
            wordsLearned: 0,
            role: mode,
            fullName: inviteData?.fullName || '',
            phone: inviteData?.phone || '',
            email: inviteData?.email || (mode === 'teacher' ? email : ''),
            group: inviteData?.group || '',
            lastActivityDate: new Date().toISOString()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, progressRef.path);
        }
      } else {
        await signInWithEmailAndPassword(auth, finalEmail, finalPassword);
      }
    } catch (err: any) {
      console.error(err);
      const errorCode = err.code;
      
      if (errorCode === 'auth/email-already-in-use') {
        setError('המייל הזה כבר רשום במערכת. האם התכוונת להתחבר במקום להירשם?');
      } else if (errorCode === 'auth/weak-password') {
        setError('הסיסמה חלשה מדי. היא חייבת להכיל לפחות 6 תווים.');
      } else if (errorCode === 'auth/invalid-email') {
        setError('כתובת המייל אינה תקינה.');
      } else if (errorCode === 'auth/operation-not-allowed') {
        setError('שיטת האימות (אימייל או גוגל) כבויה ב-Firebase. עליך להפעיל אותה ב-Console כדי שהאפליקציה תעבוד.');
      } else if (
        errorCode === 'auth/user-not-found' || 
        errorCode === 'auth/wrong-password' || 
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/invalid-login-credentials' ||
        err.message?.includes('auth/invalid-credential') ||
        err.message?.includes('auth/invalid-login-credentials')
      ) {
        setError(isRegister ? 'פרטי ההתחברות שגויים. וודא שהזנת את הקוד והסיסמה הנכונים.' : 'פרטי ההתחברות שגויים. וודא שהסיסמה נכונה, או נסה להירשם אם אין לך חשבון עדיין.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('יותר מדי ניסיונות כושלים. החשבון נחסם זמנית, נסה שוב מאוחר יותר.');
      } else if (errorCode === 'auth/network-request-failed') {
        setError('שגיאת רשת. וודא שיש לך חיבור לאינטרנט.');
      } else {
        setError(`שגיאת אבטחה: ${err.message || 'אירעה שגיאה בתקשורת עם Firebase.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (auth.currentUser) {
    return (
      <button 
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <LogOut size={16} />
        התנתק
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
        <button 
          onClick={() => { setMode('student'); setError(''); }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'student' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
        >
          <User size={16} />
          תלמיד
        </button>
        <button 
          onClick={() => { setMode('teacher'); setError(''); }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'teacher' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
        >
          <GraduationCap size={16} />
          מורה
        </button>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
        {isRegister ? 'הרשמה חדשה' : 'התחברות'}
      </h2>
      <p className="text-slate-500 text-sm text-center mb-8">
        {mode === 'student' ? 'הכנס את הקוד שקיבלת מהמורה' : 'הכנס אימייל וסיסמה'}
      </p>

      <form onSubmit={handleAuth} className="space-y-4">
        {mode === 'teacher' ? (
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="email" 
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>
        ) : (
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="קוד תלמיד (6 ספרות)"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
          </div>
        )}

        <div className="relative">
          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="password" 
            placeholder={mode === 'student' ? 'סיסמה (6 ספרות)' : 'סיסמה'}
            maxLength={mode === 'student' ? 6 : undefined}
            value={password}
            onChange={(e) => setPassword(mode === 'student' ? e.target.value.replace(/\D/g, '') : e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <div className="flex flex-col gap-1">
              <p className="text-xs text-red-600 font-bold leading-tight">{error}</p>
              {error.includes('Console') && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-red-200">
                  <p className="text-[10px] text-slate-600 mb-2">
                    <strong>שלבי פתרון:</strong> כנס ל-Firebase Console, תחת Authentication &gt; Sign-in method, והפעל את "Email/Password" ו-"Google".
                  </p>
                  <a 
                    href="https://console.firebase.google.com/project/gen-lang-client-0318522211/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 underline flex items-center gap-1 font-bold"
                  >
                    פתח הגדרות אימות ב-Firebase <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
            mode === 'student' ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'
          }`}
        >
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={20} />}
          {isRegister ? 'הירשם עכשיו' : 'התחבר'}
        </button>

        {mode === 'teacher' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-400">
                <span className="px-2 bg-white">או</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 border-2 border-slate-100 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
              התחבר עם Google
            </button>
          </>
        )}
      </form>

      <button 
        onClick={() => setIsRegister(!isRegister)}
        className="w-full mt-6 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
      >
        {isRegister ? 'כבר יש לך חשבון? התחבר' : 'אין לך חשבון? הירשם כאן'}
      </button>
    </div>
  );
};
