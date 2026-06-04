import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
  credential: applicationDefault(),
  projectId: firebaseConfig.projectId
});

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
    
    // Let's seed /settings/global with default settings so that the app doesn't crash on start!
    const defaultSettings = {
      backgroundStyle: 'glow',
      lightIntensity: 0.5,
      employees: [],
      personnel: [],
      supervisors: {},
      defaultCameraIds: [],
      fleetConfigs: [],
      sidebarLinks: []
    };
    await docRef.set(defaultSettings, { merge: true });
    console.log("Admin SDK successfully initialized settings/global!");
    
    process.exit(0);
  } catch (err) {
    console.error("Admin SDK ERROR:", err.message);
    process.exit(1);
  }
}

run();
