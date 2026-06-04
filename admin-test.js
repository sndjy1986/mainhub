import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: applicationDefault(),
  projectId: "gen-lang-client-0286011656"
});

const db = getFirestore(app, "ai-studio-057bbc3f-888f-4671-8ac4-ddcfe33c1602");

async function run() {
  try {
    const docRef = db.collection('settings').doc('global');
    const docSnap = await docRef.get();
    console.log("Admin SDK SUCCESS, exists:", docSnap.exists);
    if (docSnap.exists) {
      console.log("Data:", docSnap.data());
    } else {
      console.log("Document settings/global does not exist yet!");
    }
    
    // Attempt a write to a test collection
    await db.collection('test_connection').doc('status').set({
      connected: true,
      timestamp: new Date()
    });
    console.log("Admin SDK successfully wrote to test_connection!");
    
    process.exit(0);
  } catch (err) {
    console.error("Admin SDK ERROR:", err.message);
    process.exit(1);
  }
}

run();
