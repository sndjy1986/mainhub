import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
  credential: applicationDefault(),
  projectId: firebaseConfig.projectId
});

const db = getFirestore(app);
db.settings({ databaseId: firebaseConfig.firestoreDatabaseId }); // Admin SDK syntax for databaseId

async function run() {
  try {
    const snap = await db.collection('settings').limit(1).get();
    console.log("Admin SDK SUCCESS, docs:", snap.size);
    
    // Add user as admin
    await db.collection('users').doc('dVhcfl6W8XNUPMpgzON0qwBRvCC2').set({
      role: 'admin',
      email: 'sndjy1986@gmail.com',
      updatedAt: new Date()
    }, { merge: true });
    console.log("Admin SDK wrote user!");
    process.exit(0);
  } catch (err) {
    console.error("Admin SDK ERROR:", err.message);
    process.exit(1);
  }
}

run();
