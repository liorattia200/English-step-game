import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collectionGroup, query, getDocs, collection, addDoc, serverTimestamp, doc, setDoc, onSnapshot, deleteDoc, where } from 'firebase/firestore';
import { UserProgress, Task, Group, TaskType, Assignment } from '../types';
import { Users, Award, BookOpen, TrendingUp, UserPlus, X, Copy, CheckCircle2, Plus, Calendar, Target, ClipboardList, Phone, Mail, User, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export const TeacherDashboard: React.FC = () => {
  const [students, setStudents] = useState<UserProgress[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'students' | 'assignments' | 'groups'>('students');
  
  // Add Student State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProgress | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    phone: '',
    email: '',
    groupId: '',
    code: '',
    pass: ''
  });
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; pass: string } | null>(null);

  // Group State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  // Add Assignment State
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    points: 10,
    assignedTo: [] as string[],
    dueDate: '',
    tasks: [] as Task[],
    status: 'draft' as 'draft' | 'published'
  });

  const [currentTaskInAssignment, setCurrentTaskInAssignment] = useState({
    title: '',
    description: '',
    type: 'match_picture' as TaskType,
    points: 10,
    content: {} as any
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const openAddModal = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const pass = Math.floor(100000 + Math.random() * 900000).toString();
    setNewStudent({
      fullName: '',
      phone: '',
      email: '',
      groupId: '',
      code,
      pass
    });
    setGeneratedInvite(null);
    setShowAddModal(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save invitation to Firestore
      const inviteRef = collection(db, 'student_invites');
      await addDoc(inviteRef, {
        ...newStudent,
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      
      setGeneratedInvite({ code: newStudent.code, pass: newStudent.pass });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'student_invites');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      // Update progress data
      const studentRef = doc(db, `users/${editingStudent.userId}/progress/data`);
      await setDoc(studentRef, editingStudent, { merge: true });
      
      // Also update the invite record if it exists to keep groupId in sync
      const invite = invites.find(i => i.userId === editingStudent.userId);
      if (invite) {
        const inviteRef = doc(db, 'student_invites', invite.id);
        await setDoc(inviteRef, { 
          fullName: editingStudent.fullName,
          phone: editingStudent.phone,
          email: editingStudent.email,
          groupId: editingStudent.groupId 
        }, { merge: true });
      }

      setEditingStudent(null);
      setNotification({ message: 'פרטי התלמיד עודכנו בהצלחה!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'progress');
    }
  };

  const handleDeleteStudent = async (studentId: string, inviteId?: string) => {
    try {
      if (inviteId) {
        await deleteDoc(doc(db, 'student_invites', inviteId));
      }
      if (studentId) {
        await deleteDoc(doc(db, `users/${studentId}/progress/data`));
      }
      setShowDeleteConfirm(null);
      setNotification({ message: 'התלמיד נמחק בהצלחה', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'student');
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const groupRef = collection(db, 'groups');
      await addDoc(groupRef, {
        ...newGroup,
        createdBy: auth.currentUser?.uid,
        createdAt: new Date().toISOString()
      });
      setShowGroupModal(false);
      setNewGroup({ name: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'groups');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      // Optionally: update all students in this group to have no group
      const studentsInGroup = invites.filter(i => i.groupId === groupId);
      for (const student of studentsInGroup) {
        await setDoc(doc(db, 'student_invites', student.id), { groupId: '' }, { merge: true });
        if (student.userId) {
          await setDoc(doc(db, `users/${student.userId}/progress/data`), { groupId: '' }, { merge: true });
        }
      }
      setNotification({ message: 'הקבוצה נמחקה בהצלחה', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'groups');
    }
  };

  const copyInvite = () => {
    if (!generatedInvite) return;
    const message = `היי ${newStudent.fullName}!
הנה פרטי ההתחברות שלך ל-English-Step:
קוד תלמיד: ${generatedInvite.code}
סיסמה: ${generatedInvite.pass}

*שימו לב:* בפעם הראשונה עליכם לבצע "הרשמה" עם הקוד והסיסמה האלו. לאחר מכן תוכלו פשוט להתחבר.

בהצלחה!`;
    navigator.clipboard.writeText(message);
    setNotification({ message: 'ההזמנה הועתקה ללוח!', type: 'success' });
  };

  const copyInviteDetails = (invite: any) => {
    const message = `היי ${invite.fullName}!
הנה פרטי ההתחברות שלך ל-English-Step:
קוד תלמיד: ${invite.code}
סיסמה: ${invite.pass}

*שימו לב:* בפעם הראשונה עליכם לבצע "הרשמה" עם הקוד והסיסמה האלו. לאחר מכן תוכלו פשוט להתחבר.

בהצלחה!`;
    navigator.clipboard.writeText(message);
    setNotification({ message: 'ההזמנה הועתקה ללוח!', type: 'success' });
  };

  const handleAddTaskToAssignment = () => {
    if (!currentTaskInAssignment.title) return;
    setNewAssignment(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...currentTaskInAssignment, id: Math.random().toString(36).substr(2, 9) }]
    }));
    setCurrentTaskInAssignment({
      title: '',
      description: '',
      type: 'match_picture',
      points: 10,
      content: {}
    });
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setNewAssignment({
      title: assignment.title,
      description: assignment.description,
      points: assignment.points,
      assignedTo: assignment.assignedTo,
      dueDate: assignment.dueDate || '',
      tasks: assignment.tasks,
      status: assignment.status
    });
    setShowAssignmentModal(true);
  };

  const handleAddAssignment = async (e: React.FormEvent, status: 'draft' | 'published') => {
    e.preventDefault();
    if (newAssignment.tasks.length === 0) {
      setNotification({ message: 'יש להוסיף לפחות משימה אחת למטלה', type: 'error' });
      return;
    }
    try {
      const assignmentData = {
        ...newAssignment,
        status,
        createdBy: auth.currentUser?.uid,
        createdAt: editingAssignment ? editingAssignment.createdAt : new Date().toISOString(),
      };

      if (editingAssignment) {
        await setDoc(doc(db, 'assignments', editingAssignment.id), assignmentData);
        setNotification({ message: 'המטלה עודכנה בהצלחה!', type: 'success' });
      } else {
        await addDoc(collection(db, 'assignments'), assignmentData);
        setNotification({ message: 'המטלה נוספה בהצלחה!', type: 'success' });
      }
      
      setShowAssignmentModal(false);
      setEditingAssignment(null);
      setNewAssignment({ title: '', description: '', points: 10, assignedTo: [], dueDate: '', tasks: [], status: 'draft' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'assignments');
    }
  };

  useEffect(() => {
    // Real-time students listener
    const q = query(collectionGroup(db, 'progress'));
    const unsubscribeStudents = onSnapshot(q, (querySnapshot) => {
      const studentData = querySnapshot.docs.map(doc => doc.data() as UserProgress);
      setStudents(studentData.filter(s => s.role === 'student'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'progress');
      setLoading(false);
    });

    // Real-time invites listener
    const invitesQuery = query(collection(db, 'student_invites'));
    const unsubscribeInvites = onSnapshot(invitesQuery, (querySnapshot) => {
      const inviteData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvites(inviteData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'student_invites');
    });

    // Real-time assignments listener
    const assignmentsQuery = query(collection(db, 'assignments'));
    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (querySnapshot) => {
      const assignmentData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      setAssignments(assignmentData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'assignments');
    });

    // Real-time groups listener
    const groupsQuery = query(collection(db, 'groups'));
    const unsubscribeGroups = onSnapshot(groupsQuery, (querySnapshot) => {
      const groupData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      setGroups(groupData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'groups');
    });

    return () => {
      unsubscribeStudents();
      unsubscribeInvites();
      unsubscribeAssignments();
      unsubscribeGroups();
    };
  }, []);

  // Merge invites with progress
  const mergedStudents = invites.map(invite => {
    const progress = students.find(s => s.userId === invite.userId);
    return {
      ...invite,
      progress: progress || null
    };
  }).sort((a, b) => {
    // Sort by status (pending first) then by name
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return a.fullName.localeCompare(b.fullName);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
        <button 
          onClick={() => setActiveView('students')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeView === 'students' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Users size={18} />
          תלמידים
        </button>
        <button 
          onClick={() => setActiveView('groups')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeView === 'groups' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Users size={18} />
          קבוצות
        </button>
        <button 
          onClick={() => setActiveView('assignments')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeView === 'assignments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <ClipboardList size={18} />
          מטלות
        </button>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          {activeView === 'students' ? 'ניהול כיתה' : activeView === 'groups' ? 'ניהול קבוצות' : 'ניהול מטלות'}
        </h2>
        <button 
          onClick={activeView === 'students' ? openAddModal : activeView === 'groups' ? () => setShowGroupModal(true) : () => setShowAssignmentModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          {activeView === 'students' ? <UserPlus size={18} /> : <Plus size={18} />}
          {activeView === 'students' ? 'הוספת תלמיד' : activeView === 'groups' ? 'קבוצה חדשה' : 'מטלה חדשה'}
        </button>
      </div>

      {activeView === 'students' ? (
        <>
          {/* Instructions for Students */}
          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <BookOpen size={20} />
              </div>
              <h3 className="text-lg font-semibold text-emerald-900">הנחיות לרישום תלמידים</h3>
            </div>
            <div className="space-y-3 text-sm text-emerald-800">
              <p>כדי שתלמיד יוכל להתחבר, עליו לבצע את הצעדים הבאים:</p>
              <ol className="list-decimal list-inside space-y-2 font-medium">
                <li>לבחור בלשונית "תלמיד" במסך ההתחברות.</li>
                <li>ללחוץ על "אין לך חשבון? הירשם כאן".</li>
                <li>להזין קוד בן 6 ספרות (למשל: 100200).</li>
                <li>להזין סיסמה בת 6 ספרות.</li>
                <li>ללחוץ על "הירשם עכשיו".</li>
              </ol>
              <p className="mt-4 text-xs opacity-70 italic">* מומלץ לתת לכל תלמיד קוד ייחודי מראש.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">סקירת התקדמות תלמידים</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                    <th className="pb-4 font-semibold">שם מלא / קוד</th>
                    <th className="pb-4 font-semibold">קבוצה</th>
                    <th className="pb-4 font-semibold">סטטוס</th>
                    <th className="pb-4 font-semibold">רמה</th>
                    <th className="pb-4 font-semibold">נקודות</th>
                    <th className="pb-4 font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mergedStudents.map((student, i) => (
                    <motion.tr 
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-sm text-slate-600"
                    >
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{student.fullName || 'ללא שם'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Code: {student.code}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">
                          {groups.find(g => g.id === student.groupId)?.name || 'כללי'}
                        </span>
                      </td>
                      <td className="py-4">
                        {student.status === 'registered' ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold w-fit">
                              <CheckCircle2 size={12} />
                              נרשם
                            </span>
                            {student.registeredAt && (
                              <span className="text-[9px] text-slate-400 mr-1">
                                {new Date(student.registeredAt).toLocaleDateString('he-IL')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold w-fit">
                            <AlertCircle size={12} />
                            ממתין לרישום
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                          Lvl {student.progress?.level || 1}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-slate-700">{student.progress?.totalPoints || 0}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => copyInviteDetails(student)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all text-xs font-bold group"
                            title="העתק פרטי התחברות"
                          >
                            <Copy size={14} className="group-hover:scale-110 transition-transform" />
                            העתק פרטים
                          </button>
                          {student.progress && (
                            <button 
                              onClick={() => setEditingStudent(student.progress)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="ערוך פרטים"
                            >
                              <ClipboardList size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => setShowDeleteConfirm(student.userId || student.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="מחק תלמיד"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {mergedStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        לא נמצאו תלמידים עדיין.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeView === 'groups' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groups.map((group) => (
            <motion.div 
              key={group.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{group.name}</h4>
                    <span className="text-[10px] text-slate-400">{invites.filter(i => i.groupId === group.id).length} תלמידים</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteGroup(group.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-500">{group.description}</p>
            </motion.div>
          ))}
          {groups.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
              <Users size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">לא נוצרו קבוצות עדיין</p>
              <button 
                onClick={() => setShowGroupModal(true)}
                className="mt-4 text-blue-600 font-bold text-sm hover:underline"
              >
                צור קבוצה ראשונה
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((assignment) => (
            <motion.div 
              key={assignment.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{assignment.title}</h4>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{assignment.tasks.length} משימות</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                    {assignment.points} pts
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${assignment.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {assignment.status === 'published' ? 'פורסם' : 'טיוטה'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">{assignment.description}</p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Users size={12} />
                    {assignment.assignedTo.includes('all') ? 'כל התלמידים' : `${assignment.assignedTo.length} קבוצות/תלמידים`}
                  </div>
                  {assignment.dueDate && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <Calendar size={12} />
                      {new Date(assignment.dueDate).toLocaleDateString('he-IL')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditAssignment(assignment)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={assignment.status === 'published' ? 'צפה במטלה' : 'ערוך מטלה'}
                  >
                    {assignment.status === 'published' ? <BookOpen size={18} /> : <ClipboardList size={18} />}
                  </button>
                  <button 
                    onClick={() => setAssignmentToDelete(assignment)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {assignments.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
              <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">לא נוצרו מטלות עדיין</p>
              <button 
                onClick={() => setShowAssignmentModal(true)}
                className="mt-4 text-blue-600 font-bold text-sm hover:underline"
              >
                צור מטלה ראשונה
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">סה"כ תלמידים</div>
          <div className="text-3xl font-bold text-slate-800">{students.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ממוצע נקודות</div>
          <div className="text-3xl font-bold text-slate-800">
            {students.length > 0 
              ? Math.round(students.reduce((acc, s) => acc + s.totalPoints, 0) / students.length)
              : 0}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => { setShowAddModal(false); setGeneratedInvite(null); }}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>

              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <UserPlus size={32} />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">הוספת תלמיד חדש</h3>
              
              {!generatedInvite ? (
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">שם מלא (חובה)</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        value={newStudent.fullName}
                        onChange={e => setNewStudent(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="ישראל ישראלי"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">טלפון</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="tel" 
                          value={newStudent.phone}
                          onChange={e => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="050-0000000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">קבוצה</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                          value={newStudent.groupId}
                          onChange={e => setNewStudent(prev => ({ ...prev, groupId: e.target.value }))}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        >
                          <option value="">בחר קבוצה</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">אימייל</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        value={newStudent.email}
                        onChange={e => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="student@example.com"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 mt-4"
                  >
                    צור קוד התחברות
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" size={24} />
                    <p className="text-sm text-emerald-800 font-medium">הפרטים נשמרו! כעת שלח לתלמיד את פרטי ההתחברות:</p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">קוד תלמיד</div>
                      <div className="text-2xl font-mono font-bold text-slate-800">{generatedInvite.code}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">סיסמה</div>
                      <div className="text-2xl font-mono font-bold text-slate-800">{generatedInvite.pass}</div>
                    </div>
                  </div>

                  <button 
                    onClick={copyInvite}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                  >
                    <Copy size={20} />
                    העתק הנחיות לתלמיד
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {assignmentToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">מחיקת מטלה</h3>
              <p className="text-slate-500 mb-8">האם אתה בטוח שברצונך למחוק את המטלה "{assignmentToDelete.title}"? פעולה זו אינה ניתנת לביטול.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setAssignmentToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, 'assignments', assignmentToDelete.id));
                      setNotification({ message: 'המטלה נמחקה בהצלחה', type: 'success' });
                      setAssignmentToDelete(null);
                    } catch (error) {
                      handleFirestoreError(error, OperationType.DELETE, 'assignments');
                    }
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  מחק
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAssignmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => {
                  setShowAssignmentModal(false);
                  setEditingAssignment(null);
                  setNewAssignment({ title: '', description: '', points: 10, assignedTo: [], dueDate: '', tasks: [], status: 'draft' });
                }}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>

              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                {editingAssignment?.status === 'published' ? <BookOpen size={32} /> : <Plus size={32} />}
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {editingAssignment 
                  ? (editingAssignment.status === 'published' ? 'צפייה במטלה' : 'עריכת מטלה') 
                  : 'יצירת מטלה חדשה'}
              </h3>
              
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">כותרת המטלה</label>
                      <input 
                        type="text" 
                        required
                        disabled={editingAssignment?.status === 'published'}
                        value={newAssignment.title}
                        onChange={e => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                        placeholder="למשל: יחידה 1 - חיות"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">תיאור המטלה</label>
                      <textarea 
                        required
                        disabled={editingAssignment?.status === 'published'}
                        value={newAssignment.description}
                        onChange={e => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] disabled:opacity-60"
                        placeholder="מה על התלמיד לעשות?"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">שיוך לקבוצה / תלמידים</label>
                      <select 
                        multiple
                        required
                        disabled={editingAssignment?.status === 'published'}
                        value={newAssignment.assignedTo}
                        onChange={e => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setNewAssignment(prev => ({ ...prev, assignedTo: values }));
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] disabled:opacity-60"
                      >
                        <option value="all">כל התלמידים</option>
                        <optgroup label="קבוצות">
                          {groups.map(g => (
                            <option key={g.id} value={`group:${g.id}`}>{g.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="תלמידים אישיים">
                          {mergedStudents.map(s => (
                            <option key={s.id} value={s.userId}>{s.fullName}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">ניקוד סופי</label>
                        <input 
                          type="number" 
                          disabled={editingAssignment?.status === 'published'}
                          value={newAssignment.points}
                          onChange={e => setNewAssignment(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">תאריך יעד</label>
                        <input 
                          type="date" 
                          disabled={editingAssignment?.status === 'published'}
                          value={newAssignment.dueDate}
                          onChange={e => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-r border-slate-100 pr-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList size={18} className="text-blue-600" />
                      משימות במטלה ({newAssignment.tasks.length})
                    </h4>
                    
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {newAssignment.tasks.map((task) => (
                        <div key={task.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div className="text-sm font-bold text-slate-700">{task.title}</div>
                          {editingAssignment?.status !== 'published' && (
                            <button 
                              type="button"
                              onClick={() => {
                                const newTasks = newAssignment.tasks.filter((t) => t.id !== task.id);
                                setNewAssignment(prev => ({ ...prev, tasks: newTasks }));
                              }}
                              className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {newAssignment.tasks.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs italic">
                          אין משימות עדיין. הוסף משימה למטה.
                        </div>
                      )}
                    </div>

                    {editingAssignment?.status !== 'published' && (
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                        <h5 className="text-xs font-bold text-blue-800 uppercase tracking-widest">הוספת משימה חדשה</h5>
                        <input 
                          type="text" 
                          placeholder="כותרת המשימה"
                          value={currentTaskInAssignment.title}
                          onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      <select 
                        value={currentTaskInAssignment.type}
                        onChange={e => {
                          const type = e.target.value as TaskType;
                          let initialContent = {};
                          switch(type) {
                            case 'match_picture': initialContent = { items: [] }; break;
                            case 'listen_choose': initialContent = { options: [], correctAnswer: '', audioText: '' }; break;
                            case 'build_sentence': initialContent = { words: [], correctSentence: '' }; break;
                            case 'drag_word': initialContent = { sentence: '', options: [], correctAnswer: '' }; break;
                            case 'true_false': initialContent = { statement: '', isTrue: true, image: '' }; break;
                            case 'correct_spelling': initialContent = { audioText: '', options: [], correctAnswer: '' }; break;
                            case 'word_memory': initialContent = { pairs: [] }; break;
                            case 'complete_dialogue': initialContent = { dialogue: [], options: [], correctAnswer: '' }; break;
                            case 'find_word_in_sentence': initialContent = { sentence: '', question: '', options: [], correctAnswer: '' }; break;
                            case 'choose_correct_picture': initialContent = { sentence: '', options: [], correctAnswer: '' }; break;
                            case 'spot_mistake': initialContent = { sentence: '', options: [], correctAnswer: '' }; break;
                            case 'category_game': initialContent = { categories: [] }; break;
                            case 'speed_challenge': initialContent = { words: [], timeLimit: 30 }; break;
                            case 'listening_sentence': initialContent = { audioText: '', correctSentence: '' }; break;
                            case 'mini_story': initialContent = { story: '', questions: [] }; break;
                            case 'emoji_english': initialContent = { emojis: '', correctAnswer: '', hint: '' }; break;
                            case 'guess_word': initialContent = { hint: '', correctAnswer: '' }; break;
                            case 'daily_english': initialContent = { phrase: '', context: '', correctAnswer: '' }; break;
                            case 'word_builder': initialContent = { word: '' }; break;
                            case 'pronunciation_check': initialContent = { textToPronounce: '' }; break;
                          }
                          setCurrentTaskInAssignment(prev => ({ 
                            ...prev, 
                            type,
                            content: initialContent
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm outline-none appearance-none"
                      >
                        <option value="match_picture">Match the Picture (התאמת תמונה)</option>
                        <option value="listen_choose">Listen and Choose (שמע ובחר)</option>
                        <option value="build_sentence">Build the Sentence (בניית משפט)</option>
                        <option value="drag_word">Drag the Word (גרירת מילה)</option>
                        <option value="true_false">True or False (נכון/לא נכון)</option>
                        <option value="correct_spelling">Correct Spelling (איות נכון)</option>
                        <option value="word_memory">Word Memory (משחק הזיכרון)</option>
                        <option value="complete_dialogue">Complete Dialogue (השלמת שיחה)</option>
                        <option value="find_word_in_sentence">Find Word in Sentence (מצא מילה במשפט)</option>
                        <option value="choose_correct_picture">Choose Correct Picture (בחר תמונה נכונה)</option>
                        <option value="spot_mistake">Spot the Mistake (מצא את הטעות)</option>
                        <option value="category_game">Category Game (מיון לקטגוריות)</option>
                        <option value="speed_challenge">Speed Challenge (אתגר המהירות)</option>
                        <option value="listening_sentence">Listening Sentence (הבנת הנשמע - משפט)</option>
                        <option value="mini_story">Mini Story (סיפור קצר)</option>
                        <option value="emoji_english">Emoji English (אנגלית באימוג'י)</option>
                        <option value="guess_word">Guess the Word (נחש את המילה)</option>
                        <option value="daily_english">Daily English (אנגלית יומיומית)</option>
                        <option value="word_builder">Word Builder (בניית מילה)</option>
                        <option value="pronunciation_check">Pronunciation Check (בדיקת הגייה)</option>
                      </select>
                      
                      {/* Dynamic Content Form for Current Task */}
                      <div className="space-y-4 max-h-[300px] overflow-y-auto p-1">
                        {currentTaskInAssignment.type === 'match_picture' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת התאמת תמונה</label>
                            <div className="space-y-2">
                              <input 
                                placeholder="אימוג'י או URL לתמונה" 
                                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                                value={currentTaskInAssignment.content.image || ''} 
                                onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, image: e.target.value } }))} 
                              />
                              <input 
                                placeholder="תשובה נכונה" 
                                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                                value={currentTaskInAssignment.content.correctAnswer || ''} 
                                onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                              />
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">אפשרויות (מופרדות בפסיק)</label>
                                <input 
                                  placeholder="למשל: Dog, Cat, Bird" 
                                  className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                                  value={(currentTaskInAssignment.content.options || []).join(', ')} 
                                  onChange={e => {
                                    const options = e.target.value.split(',').map(s => s.trim());
                                    setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, options } }));
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'listen_choose' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת שמע ובחר</label>
                            <input 
                              placeholder="טקסט להקראה (TTS)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.audioText || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, audioText: e.target.value } }))} 
                            />
                            <input 
                              placeholder="תשובה נכונה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">אפשרויות (מופרדות בפסיק)</label>
                              <input 
                                placeholder="למשל: Red, Blue, Green" 
                                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                                value={(currentTaskInAssignment.content.options || []).join(', ')} 
                                onChange={e => {
                                  const options = e.target.value.split(',').map(s => s.trim());
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, options } }));
                                }} 
                              />
                            </div>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'drag_word' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת גרירת מילה</label>
                            <input 
                              placeholder="משפט עם קו תחתון (למשל: The cat is ___ the table)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.sentence || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, sentence: e.target.value } }))} 
                            />
                            <input 
                              placeholder="תשובה נכונה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">אפשרויות נוספות (מופרדות בפסיק)</label>
                              <input 
                                placeholder="למשל: on, in, under" 
                                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                                value={(currentTaskInAssignment.content.options || []).join(', ')} 
                                onChange={e => {
                                  const options = e.target.value.split(',').map(s => s.trim());
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, options } }));
                                }} 
                              />
                            </div>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'true_false' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת נכון/לא נכון</label>
                            <input 
                              placeholder="אימוג'י (אופציונלי)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.image || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, image: e.target.value } }))} 
                            />
                            <input 
                              placeholder="טענה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.statement || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, statement: e.target.value } }))} 
                            />
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={currentTaskInAssignment.content.isTrue} 
                                onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, isTrue: e.target.checked } }))} 
                              />
                              <label className="text-xs font-bold text-slate-700">הטענה נכונה</label>
                            </div>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'build_sentence' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת בניית משפט</label>
                            <input 
                              placeholder="המשפט המלא והנכון" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctSentence || ''} 
                              onChange={e => {
                                const sentence = e.target.value;
                                const words = sentence.split(' ').map(s => s.trim()).sort(() => Math.random() - 0.5);
                                setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctSentence: sentence, words } }));
                              }} 
                            />
                            <p className="text-[10px] text-slate-400 italic">המילים יתערבבו אוטומטית עבור התלמיד.</p>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'word_memory' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת משחק הזיכרון</label>
                            {(currentTaskInAssignment.content.pairs || []).map((pair: any, idx: number) => (
                              <div key={idx} className="flex gap-1">
                                <input placeholder="מילה" className="flex-1 px-2 py-1 text-xs rounded-lg border border-blue-100" value={pair.word} onChange={e => {
                                  const newPairs = [...currentTaskInAssignment.content.pairs];
                                  newPairs[idx].word = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, pairs: newPairs } }));
                                }} />
                                <input placeholder="תרגום" className="flex-1 px-2 py-1 text-xs rounded-lg border border-blue-100" value={pair.translation} onChange={e => {
                                  const newPairs = [...currentTaskInAssignment.content.pairs];
                                  newPairs[idx].translation = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, pairs: newPairs } }));
                                }} />
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const newPairs = [...(currentTaskInAssignment.content.pairs || []), { word: '', translation: '' }];
                              setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, pairs: newPairs } }));
                            }} className="text-[10px] text-blue-600 font-bold">+ הוסף זוג</button>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'correct_spelling' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת איות נכון</label>
                            <input 
                              placeholder="מילה להקראה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.audioText || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, audioText: e.target.value } }))} 
                            />
                            <input 
                              placeholder="איות נכון" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">אפשרויות איות שגויות (מופרדות בפסיק)</label>
                              <input 
                                placeholder="למשל: Appel, Aple" 
                                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                                value={(currentTaskInAssignment.content.options || []).join(', ')} 
                                onChange={e => {
                                  const options = e.target.value.split(',').map(s => s.trim());
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, options } }));
                                }} 
                              />
                            </div>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'find_word_in_sentence' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת מצא מילה במשפט</label>
                            <input 
                              placeholder="המשפט המלא" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.sentence || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, sentence: e.target.value } }))} 
                            />
                            <input 
                              placeholder="השאלה (למשל: מצא את הפועל)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.question || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, question: e.target.value } }))} 
                            />
                            <input 
                              placeholder="תשובה נכונה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'complete_dialogue' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת השלמת שיחה</label>
                            {(currentTaskInAssignment.content.dialogue || []).map((line: any, idx: number) => (
                              <div key={idx} className="flex gap-1">
                                <input placeholder="דובר" className="w-16 px-2 py-1 text-xs rounded-lg border border-blue-100" value={line.speaker} onChange={e => {
                                  const newDialogue = [...currentTaskInAssignment.content.dialogue];
                                  newDialogue[idx].speaker = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, dialogue: newDialogue } }));
                                }} />
                                <input placeholder="טקסט" className="flex-1 px-2 py-1 text-xs rounded-lg border border-blue-100" value={line.text} onChange={e => {
                                  const newDialogue = [...currentTaskInAssignment.content.dialogue];
                                  newDialogue[idx].text = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, dialogue: newDialogue } }));
                                }} />
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const newDialogue = [...(currentTaskInAssignment.content.dialogue || []), { speaker: '', text: '' }];
                              setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, dialogue: newDialogue } }));
                            }} className="text-[10px] text-blue-600 font-bold">+ הוסף שורה לשיחה</button>
                            <input 
                              placeholder="תשובה נכונה (החלק החסר)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100 mt-2" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'choose_correct_picture' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת בחר תמונה נכונה</label>
                            <input 
                              placeholder="המשפט/מילה המתארת את התמונה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.sentence || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, sentence: e.target.value } }))} 
                            />
                            <p className="text-[10px] text-slate-400 italic">הוסף אפשרויות (אימוג'י או URL):</p>
                            {(currentTaskInAssignment.content.options || []).map((opt: any, idx: number) => (
                              <div key={idx} className="flex gap-1">
                                <input placeholder="תמונה" className="flex-1 px-2 py-1 text-xs rounded-lg border border-blue-100" value={opt.image} onChange={e => {
                                  const newOpts = [...currentTaskInAssignment.content.options];
                                  newOpts[idx].image = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, options: newOpts } }));
                                }} />
                                <input placeholder="תווית" className="flex-1 px-2 py-1 text-xs rounded-lg border border-blue-100" value={opt.label} onChange={e => {
                                  const newOpts = [...currentTaskInAssignment.content.options];
                                  newOpts[idx].label = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, options: newOpts } }));
                                }} />
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const newOpts = [...(currentTaskInAssignment.content.options || []), { image: '', label: '' }];
                              setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, options: newOpts } }));
                            }} className="text-[10px] text-blue-600 font-bold">+ הוסף תמונה</button>
                            <input 
                              placeholder="תווית התשובה הנכונה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100 mt-2" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'speed_challenge' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת אתגר מהירות</label>
                            <input 
                              placeholder="זמן בשניות (למשל: 30)" 
                              type="number"
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.timeLimit || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, timeLimit: parseInt(e.target.value) } }))} 
                            />
                            <p className="text-[10px] text-slate-400 italic">הוסף מילים לאתגר (מופרדות בפסיק):</p>
                            <input 
                              placeholder="מילים" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={(currentTaskInAssignment.content.words || []).join(', ')} 
                              onChange={e => {
                                const words = e.target.value.split(',').map(s => s.trim());
                                setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, words } }));
                              }} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'spot_mistake' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת מצא את הטעות</label>
                            <input 
                              placeholder="המשפט עם הטעות" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.sentence || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, sentence: e.target.value } }))} 
                            />
                            <input 
                              placeholder="הטעות (המילה השגויה)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.mistake || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, mistake: e.target.value } }))} 
                            />
                            <input 
                              placeholder="התיקון (המילה הנכונה)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correction || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correction: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'mini_story' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת סיפור קצר</label>
                            <textarea 
                              placeholder="הסיפור" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100 min-h-[100px]" 
                              value={currentTaskInAssignment.content.story || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, story: e.target.value } }))} 
                            />
                            <p className="text-[10px] text-slate-400 italic">הוסף שאלות הבנה:</p>
                            {(currentTaskInAssignment.content.questions || []).map((q: any, idx: number) => (
                              <div key={idx} className="space-y-1 p-2 border border-blue-50 rounded-lg">
                                <input placeholder="שאלה" className="w-full px-2 py-1 text-xs rounded-lg border border-blue-100" value={q.question} onChange={e => {
                                  const newQs = [...currentTaskInAssignment.content.questions];
                                  newQs[idx].question = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, questions: newQs } }));
                                }} />
                                <input placeholder="תשובה נכונה" className="w-full px-2 py-1 text-xs rounded-lg border border-blue-100" value={q.correctAnswer} onChange={e => {
                                  const newQs = [...currentTaskInAssignment.content.questions];
                                  newQs[idx].correctAnswer = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, questions: newQs } }));
                                }} />
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const newQs = [...(currentTaskInAssignment.content.questions || []), { question: '', correctAnswer: '', options: [] }];
                              setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, questions: newQs } }));
                            }} className="text-[10px] text-blue-600 font-bold">+ הוסף שאלה</button>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'listening_sentence' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת שמיעת משפט</label>
                            <input 
                              placeholder="המשפט להקראה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.audioText || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, audioText: e.target.value } }))} 
                            />
                            <input 
                              placeholder="המשפט הנכון (לכתיבה)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctSentence || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctSentence: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'guess_word' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת נחש את המילה</label>
                            <input 
                              placeholder="רמז/הגדרה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.hint || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, hint: e.target.value } }))} 
                            />
                            <input 
                              placeholder="התשובה הנכונה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'emoji_english' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת אנגלית באימוג'י</label>
                            <input 
                              placeholder="אימוג'ים (למשל: 🍎+🥧)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.emojis || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, emojis: e.target.value } }))} 
                            />
                            <input 
                              placeholder="התשובה הנכונה (למשל: Apple Pie)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                            <input 
                              placeholder="רמז" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.hint || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, hint: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'word_builder' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת בונה מילים</label>
                            <input 
                              placeholder="המילה המלאה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.word || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, word: e.target.value } }))} 
                            />
                            <p className="text-[10px] text-slate-400 italic">האותיות יתערבבו אוטומטית.</p>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'category_game' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת משחק קטגוריות</label>
                            {(currentTaskInAssignment.content.categories || []).map((cat: any, idx: number) => (
                              <div key={idx} className="space-y-1 p-2 border border-blue-50 rounded-lg">
                                <input placeholder="שם הקטגוריה" className="w-full px-2 py-1 text-xs rounded-lg border border-blue-100 font-bold" value={cat.name} onChange={e => {
                                  const newCats = [...currentTaskInAssignment.content.categories];
                                  newCats[idx].name = e.target.value;
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, categories: newCats } }));
                                }} />
                                <input placeholder="מילים (מופרדות בפסיק)" className="w-full px-2 py-1 text-xs rounded-lg border border-blue-100" value={(cat.items || []).join(', ')} onChange={e => {
                                  const newCats = [...currentTaskInAssignment.content.categories];
                                  newCats[idx].items = e.target.value.split(',').map(s => s.trim());
                                  setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, categories: newCats } }));
                                }} />
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const newCats = [...(currentTaskInAssignment.content.categories || []), { name: '', items: [] }];
                              setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, categories: newCats } }));
                            }} className="text-[10px] text-blue-600 font-bold">+ הוסף קטגוריה</button>
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'daily_english' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת אנגלית יומיומית</label>
                            <input 
                              placeholder="ביטוי/משפט" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.phrase || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, phrase: e.target.value } }))} 
                            />
                            <input 
                              placeholder="הקשר (למשל: במסעדה)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.context || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, context: e.target.value } }))} 
                            />
                            <input 
                              placeholder="תשובה נכונה (למשל: תרגום או השלמה)" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.correctAnswer || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, correctAnswer: e.target.value } }))} 
                            />
                          </div>
                        )}

                        {currentTaskInAssignment.type === 'pronunciation_check' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">הגדרת בדיקת הגייה</label>
                            <input 
                              placeholder="מילה/משפט להגייה" 
                              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-100" 
                              value={currentTaskInAssignment.content.textToPronounce || ''} 
                              onChange={e => setCurrentTaskInAssignment(prev => ({ ...prev, content: { ...prev.content, textToPronounce: e.target.value } }))} 
                            />
                          </div>
                        )}
                      </div>

                      <button 
                        type="button"
                        onClick={handleAddTaskToAssignment}
                        disabled={!currentTaskInAssignment.title}
                        className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        הוסף משימה למטלה
                      </button>
                    </div>
                  )}
                </div>
              </div>

                {editingAssignment?.status === 'published' ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAssignmentModal(false);
                      setEditingAssignment(null);
                      setNewAssignment({ title: '', description: '', points: 10, assignedTo: [], dueDate: '', tasks: [], status: 'draft' });
                    }}
                    className="w-full py-4 bg-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-300 transition-all active:scale-95 mt-4"
                  >
                    סגור
                  </button>
                ) : (
                  <div className="flex gap-4 mt-4">
                    <button 
                      type="button"
                      onClick={(e) => handleAddAssignment(e as any, 'draft')}
                      className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95"
                    >
                      שמור כטיוטה
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleAddAssignment(e as any, 'published')}
                      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95"
                    >
                      פרסם מטלה
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Group Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowGroupModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>

              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Users size={32} />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">יצירת קבוצה חדשה</h3>
              
              <form onSubmit={handleAddGroup} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">שם הקבוצה</label>
                  <input 
                    type="text" 
                    required
                    value={newGroup.name}
                    onChange={e => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="למשל: כיתה ה' 1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">תיאור</label>
                  <textarea 
                    value={newGroup.description}
                    onChange={e => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    placeholder="תיאור קצר של הקבוצה"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 mt-4"
                >
                  צור קבוצה
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setEditingStudent(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>

              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <ClipboardList size={32} />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">עריכת פרטי תלמיד</h3>
              
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">שם מלא</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      value={editingStudent.fullName || ''}
                      onChange={e => setEditingStudent(prev => prev ? ({ ...prev, fullName: e.target.value }) : null)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">טלפון</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="tel" 
                        value={editingStudent.phone || ''}
                        onChange={e => setEditingStudent(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">קבוצה</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        value={editingStudent.groupId || ''}
                        onChange={e => setEditingStudent(prev => prev ? ({ ...prev, groupId: e.target.value }) : null)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                      >
                        <option value="">בחר קבוצה</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">אימייל</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      value={editingStudent.email || ''}
                      onChange={e => setEditingStudent(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">רמה</label>
                    <input 
                      type="number" 
                      value={editingStudent.level}
                      onChange={e => setEditingStudent(prev => prev ? ({ ...prev, level: parseInt(e.target.value) }) : null)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">נקודות</label>
                    <input 
                      type="number" 
                      value={editingStudent.totalPoints}
                      onChange={e => setEditingStudent(prev => prev ? ({ ...prev, totalPoints: parseInt(e.target.value) }) : null)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 mt-4"
                >
                  עדכן פרטים
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl text-white font-bold flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">מחיקת תלמיד</h3>
              <p className="text-slate-500 mb-8">האם אתה בטוח שברצונך למחוק תלמיד זה? כל נתוני ההתקדמות וההזמנה שלו יימחקו לצמיתות.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
                <button
                  onClick={() => {
                    // Find the student in merged list
                    const student = students.find(s => s.userId === showDeleteConfirm) || invites.find(i => i.id === showDeleteConfirm);
                    handleDeleteStudent(student?.userId || '', student?.id || '');
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  מחק תלמיד
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
