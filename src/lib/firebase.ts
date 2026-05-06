import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, addDoc, query, orderBy, limit, getDocs, Timestamp, onSnapshot, setDoc, updateDoc, terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Use the specific database ID from the config if available
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Attempt to clear persistence to avoid "INTERNAL ASSERTION FAILED"
clearIndexedDbPersistence(db).catch(() => {});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType | string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType | string, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error Access Denied: ', jsonError);
  // We throw a fresh error with the JSON string to help the system diagnose
  throw new Error(jsonError);
}

export async function signIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      console.error(`Firebase Error: Unauthorized Domain. Please add "${currentDomain}" to your authorized domains in the Firebase Console (Authentication > Settings > Authorized Domains).`);
      alert(`Firebase Error: Unauthorized Domain. \n\nPlease add "${currentDomain}" to your authorized domains in the Firebase Console (Authentication > Settings > Authorized Domains).`);
    }
    console.error('Error signing in:', error);
    throw error;
  }
}

export async function logOut() {
  await signOut(auth);
}

// Test connection as required by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export type PersonnelMember = {
  id: string;
  name: string;
  shift: 'A' | 'B' | 'C' | 'D' | 'Other';
  phone?: string;
  email?: string;
};

export type GlobalSettings = {
  backgroundStyle: 'glow' | 'emergency';
  lightIntensity: number;
  employees?: string[];
  personnel?: PersonnelMember[];
  supervisors?: Record<string, string>;
  defaultCameraIds?: string[];
  updatedAt?: any;
  updatedBy?: string | null;
};

export async function updateGlobalSettings(settings: Partial<GlobalSettings>) {
  try {
    const settingsRef = doc(db, 'settings', 'global');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'anonymous'
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/global');
  }
}

export type ShiftReport = {
  id?: string;
  name: string;
  date: string;
  shift: string;
  createdAt: any;
  data: any;
  htmlReport: string;
  plainReport: string;
};

export async function saveReport(report: Omit<ShiftReport, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'reports'), {
      ...report,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reports');
  }
}

export async function getReports(limitCount: number = 50) {
  try {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ShiftReport));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export { signInWithPopup, doc, onSnapshot };

