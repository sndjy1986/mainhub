import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';

async function clearUsers() {
  const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, 'terminal_users'));
  for (const document of snapshot.docs) {
    if (document.id !== 'sndjy') {
      await deleteDoc(doc(db, 'terminal_users', document.id));
      console.log(`Deleted user: ${document.id}`);
    }
  }
  
  // also check auth users? The user said "in the database". 
  // I'll just clear the db users
  console.log('Done!');
}

clearUsers();
