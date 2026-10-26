import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Conversation, Message, Project, SavedNote, UserProfile } from './types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Deep sanitization to ensure no "undefined" field is sent to Firestore
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        cleaned[key] = cleanFirestoreData(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned;
}

// Standardized Firestore Error Handling as required by skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    // Non-blocking test
    return false;
  }
}

// Check if user is currently signed in via Firebase Auth
export function isUserAuthenticated(): boolean {
  return auth.currentUser !== null;
}

// Migrate guest conversations & notes to Firestore when user logs in with Google
export async function syncGuestDataToFirestore(guestUid: string, userUid: string): Promise<void> {
  try {
    const rawConvs = localStorage.getItem(`nasir_ai_convs_${guestUid}`);
    if (rawConvs) {
      const guestConvos: Conversation[] = JSON.parse(rawConvs);
      for (const c of guestConvos) {
        const syncedConvo = cleanFirestoreData({ ...c, userId: userUid }) as Conversation;
        await setDoc(doc(db, 'conversations', syncedConvo.id), syncedConvo, { merge: true });

        const rawMsgs = localStorage.getItem(`nasir_ai_msgs_${c.id}`);
        if (rawMsgs) {
          const guestMsgs: Message[] = JSON.parse(rawMsgs);
          for (const m of guestMsgs) {
            const syncedMsg = cleanFirestoreData({ ...m, userId: userUid }) as Message;
            await setDoc(
              doc(db, 'conversations', c.id, 'messages', syncedMsg.id),
              syncedMsg
            );
          }
        }
      }
    }

    const rawNotes = localStorage.getItem(`nasir_ai_notes_${guestUid}`);
    if (rawNotes) {
      const guestNotes: SavedNote[] = JSON.parse(rawNotes);
      for (const n of guestNotes) {
        const syncedNote = cleanFirestoreData({ ...n, userId: userUid }) as SavedNote;
        await setDoc(doc(db, 'saved_notes', syncedNote.id), syncedNote, { merge: true });
      }
    }

    const rawProjs = localStorage.getItem(`nasir_ai_projs_${guestUid}`);
    if (rawProjs) {
      const guestProjs: Project[] = JSON.parse(rawProjs);
      for (const p of guestProjs) {
        const syncedProj = cleanFirestoreData({ ...p, userId: userUid }) as Project;
        await setDoc(doc(db, 'projects', syncedProj.id), syncedProj, { merge: true });
      }
    }
  } catch (e) {
    console.warn('Guest migration to Firestore deferred:', e);
  }
}

// Authentication Service
export async function signInWithGoogle(guestUid?: string): Promise<UserProfile> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || undefined,
      isAnonymous: false,
    };

    // Save profile to Firestore
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        cleanFirestoreData({
          ...profile,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not persist user profile to Firestore:', e);
    }

    // Sync any previous guest items to Firestore
    if (guestUid && guestUid !== user.uid) {
      syncGuestDataToFirestore(guestUid, user.uid);
    }

    return profile;
  } catch (err) {
    console.error('Google Sign-in failed:', err);
    throw err;
  }
}

export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string,
  photoURL?: string,
  guestUid?: string
): Promise<UserProfile> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    // Update display name and photo in Firebase Auth
    await updateProfile(user, {
      displayName: displayName.trim() || email.split('@')[0],
      photoURL: photoURL || undefined,
    });

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      displayName: displayName.trim() || email.split('@')[0],
      photoURL: photoURL || undefined,
      isAnonymous: false,
    };

    // Save profile to Firestore
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        cleanFirestoreData({
          ...profile,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not persist new user profile to Firestore:', e);
    }

    if (guestUid && guestUid !== user.uid) {
      syncGuestDataToFirestore(guestUid, user.uid);
    }

    return profile;
  } catch (err: any) {
    console.error('Email Sign-up failed:', err);
    throw err;
  }
}

export async function signInWithEmail(
  email: string,
  pass: string,
  guestUid?: string
): Promise<UserProfile> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const user = cred.user;
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || undefined,
      isAnonymous: false,
    };

    if (guestUid && guestUid !== user.uid) {
      syncGuestDataToFirestore(guestUid, user.uid);
    }

    return profile;
  } catch (err: any) {
    console.error('Email Sign-in failed:', err);
    throw err;
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: any) {
    console.error('Password reset email failed:', err);
    throw err;
  }
}

export async function updateUserProfile(
  displayName: string,
  photoURL?: string
): Promise<void> {
  if (!auth.currentUser) return;
  await updateProfile(auth.currentUser, {
    displayName: displayName.trim(),
    photoURL: photoURL || undefined,
  });

  try {
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      cleanFirestoreData({
        displayName: displayName.trim(),
        photoURL: photoURL || undefined,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (e) {
    console.warn('Could not update profile in Firestore:', e);
  }
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

// Listen to auth changes
export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || undefined,
        isAnonymous: user.isAnonymous,
      });
    } else {
      callback(null);
    }
  });
}

// ----------------- FIRESTORE / LOCAL REPOSITORY -----------------

// Conversations
export async function getConversations(userId: string): Promise<Conversation[]> {
  // If user is guest / unauthenticated, read from localStorage to avoid permission errors
  if (!auth.currentUser) {
    try {
      const stored = localStorage.getItem(`nasir_ai_convs_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  const collectionPath = 'conversations';
  try {
    const q = query(
      collection(db, collectionPath),
      where('userId', '==', auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    const convos: Conversation[] = [];
    snap.forEach((d) => {
      convos.push(d.data() as Conversation);
    });
    return convos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function saveConversation(convo: Conversation): Promise<void> {
  const sanitized = cleanFirestoreData(convo) as Conversation;

  if (!auth.currentUser) {
    try {
      const existing = await getConversations(convo.userId);
      const filtered = existing.filter((c) => c.id !== convo.id);
      localStorage.setItem(`nasir_ai_convs_${convo.userId}`, JSON.stringify([sanitized, ...filtered]));
    } catch (e) {
      console.warn('Could not save conversation to localStorage:', e);
    }
    return;
  }

  const docPath = `conversations/${convo.id}`;
  try {
    await setDoc(doc(db, 'conversations', convo.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  if (!auth.currentUser) {
    try {
      const existing = await getConversations(userId);
      const filtered = existing.filter((c) => c.id !== conversationId);
      localStorage.setItem(`nasir_ai_convs_${userId}`, JSON.stringify(filtered));
      localStorage.removeItem(`nasir_ai_msgs_${conversationId}`);
    } catch (e) {
      console.warn('Could not delete conversation from localStorage:', e);
    }
    return;
  }

  const docPath = `conversations/${conversationId}`;
  try {
    const messagesPath = `conversations/${conversationId}/messages`;
    const msgSnap = await getDocs(collection(db, messagesPath));
    for (const msgDoc of msgSnap.docs) {
      await deleteDoc(msgDoc.ref);
    }
    await deleteDoc(doc(db, 'conversations', conversationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// Messages
export async function getMessages(conversationId: string, userId: string): Promise<Message[]> {
  if (!auth.currentUser) {
    try {
      const stored = localStorage.getItem(`nasir_ai_msgs_${conversationId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  const collectionPath = `conversations/${conversationId}/messages`;
  try {
    const q = query(
      collection(db, collectionPath),
      where('userId', '==', auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    const msgs: Message[] = [];
    snap.forEach((d) => {
      msgs.push(d.data() as Message);
    });
    return msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function saveMessage(message: Message): Promise<void> {
  const sanitized = cleanFirestoreData(message) as Message;

  if (!auth.currentUser) {
    try {
      const existing = await getMessages(message.conversationId, message.userId);
      const filtered = existing.filter((m) => m.id !== message.id);
      localStorage.setItem(`nasir_ai_msgs_${message.conversationId}`, JSON.stringify([...filtered, sanitized]));
    } catch (e) {
      console.warn('Could not save message to localStorage:', e);
    }
    return;
  }

  const docPath = `conversations/${message.conversationId}/messages/${message.id}`;
  try {
    await setDoc(doc(db, 'conversations', message.conversationId, 'messages', message.id), sanitized);
    await setDoc(
      doc(db, 'conversations', message.conversationId),
      cleanFirestoreData({
        updatedAt: message.createdAt,
        lastMessagePreview: message.content.slice(0, 100),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// Projects
export async function getProjects(userId: string): Promise<Project[]> {
  if (!auth.currentUser) {
    try {
      const stored = localStorage.getItem(`nasir_ai_projs_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  const collectionPath = 'projects';
  try {
    const q = query(collection(db, collectionPath), where('userId', '==', auth.currentUser.uid));
    const snap = await getDocs(q);
    const list: Project[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Project);
    });
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function saveProject(project: Project): Promise<void> {
  const sanitized = cleanFirestoreData(project) as Project;

  if (!auth.currentUser) {
    try {
      const existing = await getProjects(project.userId);
      const filtered = existing.filter((p) => p.id !== project.id);
      localStorage.setItem(`nasir_ai_projs_${project.userId}`, JSON.stringify([sanitized, ...filtered]));
    } catch (e) {
      console.warn('Could not save project to localStorage:', e);
    }
    return;
  }

  const docPath = `projects/${project.id}`;
  try {
    await setDoc(doc(db, 'projects', project.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  if (!auth.currentUser) {
    try {
      const existing = await getProjects(userId);
      const filtered = existing.filter((p) => p.id !== projectId);
      localStorage.setItem(`nasir_ai_projs_${userId}`, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Could not delete project from localStorage:', e);
    }
    return;
  }

  const docPath = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// Saved Notes
export async function getSavedNotes(userId: string): Promise<SavedNote[]> {
  if (!auth.currentUser) {
    try {
      const stored = localStorage.getItem(`nasir_ai_notes_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  const collectionPath = 'saved_notes';
  try {
    const q = query(collection(db, collectionPath), where('userId', '==', auth.currentUser.uid));
    const snap = await getDocs(q);
    const list: SavedNote[] = [];
    snap.forEach((d) => {
      list.push(d.data() as SavedNote);
    });
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function saveNote(note: SavedNote): Promise<void> {
  const sanitized = cleanFirestoreData(note) as SavedNote;

  if (!auth.currentUser) {
    try {
      const existing = await getSavedNotes(note.userId);
      const filtered = existing.filter((n) => n.id !== note.id);
      localStorage.setItem(`nasir_ai_notes_${note.userId}`, JSON.stringify([sanitized, ...filtered]));
    } catch (e) {
      console.warn('Could not save note to localStorage:', e);
    }
    return;
  }

  const docPath = `saved_notes/${note.id}`;
  try {
    await setDoc(doc(db, 'saved_notes', note.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteNote(noteId: string, userId: string): Promise<void> {
  if (!auth.currentUser) {
    try {
      const existing = await getSavedNotes(userId);
      const filtered = existing.filter((n) => n.id !== noteId);
      localStorage.setItem(`nasir_ai_notes_${userId}`, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Could not delete note from localStorage:', e);
    }
    return;
  }

  const docPath = `saved_notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'saved_notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
