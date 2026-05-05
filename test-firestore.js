import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  setTimeout(() => process.exit(1), 5000);
  try {
    const userDocRef = doc(db, 'users', 'dVhcfl6W8XNUPMpgzON0qwBRvCC2');
    await setDoc(userDocRef, { role: 'admin', email: 'sndjy1986@gmail.com' }, { merge: true });
    console.log("SUCCESS writing user");
    process.exit(0);
  } catch (err) {
    console.error("ERROR writing user:", err.message);
    process.exit(1);
  }
}

test();
