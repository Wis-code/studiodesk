// StudioDesk Firebase integration.
// Browser modules are pinned to the current Firebase Web SDK used by the project.
const SDK_VERSION = '12.16.0';
let servicesPromise = null;

export const firebaseConfigFromEnv = () => ({
  apiKey: globalThis.STUDIODESK_ENV?.FIREBASE_API_KEY || '',
  authDomain: globalThis.STUDIODESK_ENV?.FIREBASE_AUTH_DOMAIN || '',
  projectId: globalThis.STUDIODESK_ENV?.FIREBASE_PROJECT_ID || '',
  storageBucket: globalThis.STUDIODESK_ENV?.FIREBASE_STORAGE_BUCKET || '',
  appId: globalThis.STUDIODESK_ENV?.FIREBASE_APP_ID || '',
  messagingSenderId: globalThis.STUDIODESK_ENV?.FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: globalThis.STUDIODESK_ENV?.FIREBASE_MEASUREMENT_ID || '',
});

export function firebaseReady() {
  const c = firebaseConfigFromEnv();
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId);
}

export async function getFirebaseServices() {
  if (!firebaseReady()) return null;
  if (servicesPromise) return servicesPromise;

  servicesPromise = (async () => {
    const appSdk = await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`);
    const authSdk = await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`);
    const firestoreSdk = await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`);

    const config = firebaseConfigFromEnv();
    const app = appSdk.initializeApp(config);
    const auth = authSdk.getAuth(app);
    const db = firestoreSdk.getFirestore(app); // production (default) DB in africa-south1

    return { app, auth, db, appSdk, authSdk, firestoreSdk, config };
  })();

  return servicesPromise;
}

export async function firebaseConnectionStatus() {
  if (!firebaseReady()) return { ready: false, mode: 'config', label: 'Firebase configuration missing' };
  try {
    const services = await getFirebaseServices();
    return { ready: Boolean(services), mode: 'live', label: 'Live · Firebase' };
  } catch (error) {
    return { ready: false, mode: 'error', label: 'Firebase connection error', error };
  }
}

export const collections = Object.freeze({
  users: 'users',
  clients: 'clients',
  projects: 'projects',
  tasks: 'tasks',
  standards: 'standards',
  catalogAssets: 'catalogAssets',
  quotes: 'quotes',
  invoices: 'invoices',
  payments: 'payments',
  expenses: 'expenses',
  reviews: 'reviews',
  activity: 'activity',
  portfolio: 'portfolio',
  legalAcceptances: 'legalAcceptances',
  settings: 'settings',
  notifications: 'notifications',
  packageRequests: 'packageRequests',
  publicConfig: 'publicConfig',
  termsVersions: 'termsVersions',
  workerInvites: 'workerInvites',
});
