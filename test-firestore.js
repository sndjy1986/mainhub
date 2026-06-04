import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { INITIAL_UNITS, TRANSPORT_ADDRS, QRV_UNITS } from './src/lib/dispatchConstants.ts';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seed() {
  console.log("Starting full database seed on:", firebaseConfig.firestoreDatabaseId);
  try {
    // 1. Map fleet configurations
    const transportFleet = INITIAL_UNITS.map(u => ({
      id: u.id,
      name: u.id,
      homePost: u.home || 'Headquarters',
      address: TRANSPORT_ADDRS[u.id] || "",
      type: 'transport'
    }));

    const qrvFleet = QRV_UNITS.map(q => ({
      id: q.name,
      name: q.name,
      homePost: 'Headquarters',
      address: q.addr,
      type: 'qrv'
    }));

    const fullFleet = [...transportFleet, ...qrvFleet];

    // 2. Set settings/global doc
    const globalSettingsRef = doc(db, 'settings', 'global');
    await setDoc(globalSettingsRef, {
      emergencyMode: false,
      emergencyBackgroundOpacity: 15,
      bgMain: "#05070c",
      bgSurface: "rgba(10, 15, 26, 0.7)",
      appTheme: "dark",
      fleetConfigs: fullFleet,
      personnel: [],
      updatedAt: new Date().toISOString(),
      themeOverrides: {
        brandBlue: "#3b82f6",
        brandIndigo: "#6366f1",
        brandEmerald: "#10b981",
        brandPanel: "rgba(10, 15, 26, 0.7)",
        colorBorder: "rgba(255, 255, 255, 0.05)",
        brandBg: "#05070c"
      }
    }, { merge: true });
    console.log("✅ Main settings/global doc seeded!");

    // 3. Batch write units
    const batch = writeBatch(db);
    for (const item of fullFleet) {
      const unitDocRef = doc(db, 'units', item.id);
      batch.set(unitDocRef, {
        id: item.id,
        status: 'READY',
        statusStart: new Date().toISOString(),
        pos: null,
        isOos: false,
        isInactive: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
    console.log(`✅ successfully seeded ${fullFleet.length} units!`);
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
