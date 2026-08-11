import { getFirebaseServices, collections } from './firebase.js';
import { ensureAnonymousSession } from './auth.js';
import { assets as starterAssets, standards as starterStandards } from '../data/seed.js';

const withId = d => ({ id: d.id, ...d.data() });
const sortByDateDesc = (a, b, key = 'updatedAt') => {
  const av = a?.[key]?.toMillis?.() ?? a?.[key]?.seconds * 1000 ?? 0;
  const bv = b?.[key]?.toMillis?.() ?? b?.[key]?.seconds * 1000 ?? 0;
  return bv - av;
};

export async function getCurrentUserProfile() {
  const f = await getFirebaseServices();
  if (!f?.auth.currentUser || f.auth.currentUser.isAnonymous) return null;
  const ref = f.firestoreSdk.doc(f.db, collections.users, f.auth.currentUser.uid);
  const snap = await f.firestoreSdk.getDoc(ref);
  return snap.exists() ? withId(snap) : null;
}

export async function subscribeCollection(name, callback, { limit = 100 } = {}) {
  const f = await getFirebaseServices();
  if (!f) return () => {};
  const q = f.firestoreSdk.query(
    f.firestoreSdk.collection(f.db, name),
    f.firestoreSdk.limit(limit)
  );
  return f.firestoreSdk.onSnapshot(q, snap => callback(snap.docs.map(withId)), error => callback([], error));
}

export async function subscribePublicConfig(callback) {
  const f = await getFirebaseServices();
  if (!f) return () => {};
  const ref = f.firestoreSdk.doc(f.db, collections.publicConfig, 'branding');
  return f.firestoreSdk.onSnapshot(ref, snap => callback(snap.exists() ? withId(snap) : null), () => callback(null));
}

export async function subscribeToPublishedCatalog(callback) {
  const f = await getFirebaseServices();
  if (!f) return () => {};
  const q = f.firestoreSdk.query(
    f.firestoreSdk.collection(f.db, collections.catalogAssets),
    f.firestoreSdk.where('published', '==', true),
    f.firestoreSdk.limit(100)
  );
  return f.firestoreSdk.onSnapshot(q, snap => {
    const rows = snap.docs.map(withId).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
    callback(rows);
  }, () => callback([]));
}

export async function subscribeOwnerWorkspace(callback) {
  const f = await getFirebaseServices();
  if (!f?.auth.currentUser || f.auth.currentUser.isAnonymous) return () => {};
  const unsubs = [];
  const state = { projects: [], clients: [], tasks: [], invoices: [], payments: [], expenses: [], catalogAssets: [], standards: [], portfolio: [] };
  const emit = () => callback({ ...state });
  const watch = async (key, collectionName) => {
    const unsub = await subscribeCollection(collectionName, (rows) => {
      state[key] = rows.sort((a,b)=>sortByDateDesc(a,b));
      emit();
    }, { limit: 250 });
    unsubs.push(unsub);
  };
  await Promise.all([
    watch('projects', collections.projects),
    watch('clients', collections.clients),
    watch('tasks', collections.tasks),
    watch('invoices', collections.invoices),
    watch('payments', collections.payments),
    watch('expenses', collections.expenses),
    watch('catalogAssets', collections.catalogAssets),
    watch('standards', collections.standards),
    watch('portfolio', collections.portfolio),
  ]);
  return () => unsubs.forEach(fn => typeof fn === 'function' && fn());
}

export async function subscribeToMyProjects(callback) {
  const f = await getFirebaseServices();
  if (!f?.auth.currentUser || f.auth.currentUser.isAnonymous) return () => {};
  const uid = f.auth.currentUser.uid;
  const q = f.firestoreSdk.query(
    f.firestoreSdk.collection(f.db, collections.projects),
    f.firestoreSdk.where('accessUserIds', 'array-contains', uid),
    f.firestoreSdk.limit(100)
  );
  return f.firestoreSdk.onSnapshot(q, snap => callback(snap.docs.map(withId).sort((a,b)=>sortByDateDesc(a,b))));
}

export async function ensureWorkspaceSeed() {
  const f = await getFirebaseServices();
  if (!f?.auth.currentUser) throw new Error('Sign in first.');
  const batch = f.firestoreSdk.writeBatch(f.db);
  const now = f.firestoreSdk.serverTimestamp();

  const studioRef = f.firestoreSdk.doc(f.db, collections.settings, 'studio');
  const publicConfigRef = f.firestoreSdk.doc(f.db, collections.publicConfig, 'branding');
  const studioSnap = await f.firestoreSdk.getDoc(studioRef);
  if (!studioSnap.exists()) {
    batch.set(studioRef, {
      brandName: 'Wiscode Studio',
      registeredCompanyName: 'Wiscode Innovations Limited',
      foundationPrice: 0,
      currency: 'NGN',
      depositRate: 0.5,
      paymentReleasePolicy: { requireDepositToStart: true, requireFullPaymentToRelease: true, allowOwnerOverride: true },
      legalProfileConfigured: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  const publicConfigSnap = await f.firestoreSdk.getDoc(publicConfigRef);
  if (!publicConfigSnap.exists()) {
    batch.set(publicConfigRef, { foundationPrice: 0, currency: 'NGN', depositRate: 0.5, published: true, updatedAt: now });
  }

  for (const [key, standard] of Object.entries(starterStandards)) {
    const ref = f.firestoreSdk.doc(f.db, collections.standards, key);
    const snap = await f.firestoreSdk.getDoc(ref);
    if (!snap.exists()) batch.set(ref, { ...standard, version: 1, active: true, createdAt: now, updatedAt: now });
  }

  for (let i = 0; i < starterAssets.length; i++) {
    const asset = starterAssets[i];
    const ref = f.firestoreSdk.doc(f.db, collections.catalogAssets, asset.id);
    const snap = await f.firestoreSdk.getDoc(ref);
    if (!snap.exists()) {
      batch.set(ref, {
        ...asset,
        sortOrder: i + 1,
        published: false,
        pricingStatus: 'review_required',
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await batch.commit();
}

export async function saveCatalogAsset(assetId, patch) {
  const f = await getFirebaseServices();
  if (!f?.auth.currentUser) throw new Error('Sign in first.');
  const ref = f.firestoreSdk.doc(f.db, collections.catalogAssets, assetId);
  await f.firestoreSdk.setDoc(ref, { ...patch, updatedAt: f.firestoreSdk.serverTimestamp() }, { merge: true });
}

export async function saveStudioSettings(patch) {
  const f = await getFirebaseServices();
  const ref = f.firestoreSdk.doc(f.db, collections.settings, 'studio');
  const publicRef = f.firestoreSdk.doc(f.db, collections.publicConfig, 'branding');
  const stamp = f.firestoreSdk.serverTimestamp();
  const batch = f.firestoreSdk.writeBatch(f.db);
  batch.set(ref, { ...patch, updatedAt: stamp }, { merge: true });
  const publicPatch = {};
  ['foundationPrice','currency','depositRate'].forEach(k => { if (patch[k] !== undefined) publicPatch[k] = patch[k]; });
  if (Object.keys(publicPatch).length) batch.set(publicRef, { ...publicPatch, published: true, updatedAt: stamp }, { merge: true });
  await batch.commit();
}

export async function getStudioSettings() {
  const f = await getFirebaseServices();
  const ref = f.firestoreSdk.doc(f.db, collections.settings, 'studio');
  const snap = await f.firestoreSdk.getDoc(ref);
  return snap.exists() ? withId(snap) : null;
}

export async function createProjectFromConfiguration({ project, client, diagnostic }) {
  const f = await getFirebaseServices();
  if (!f?.auth.currentUser) throw new Error('Sign in first.');
  const uid = f.auth.currentUser.uid;
  const clientRef = f.firestoreSdk.doc(f.firestoreSdk.collection(f.db, collections.clients));
  const projectRef = f.firestoreSdk.doc(f.firestoreSdk.collection(f.db, collections.projects));
  const batch = f.firestoreSdk.writeBatch(f.db);
  const now = f.firestoreSdk.serverTimestamp();

  batch.set(clientRef, {
    name: client.name,
    email: client.email || '',
    phone: client.phone || '',
    company: client.company || client.name,
    userIds: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(projectRef, {
    ...project,
    clientId: clientRef.id,
    clientName: client.name,
    accessUserIds: [uid],
    managementUserIds: [uid],
    workerIds: [],
    clientUserIds: [],
    progress: 0,
    health: 'healthy',
    status: 'draft',
    archived: false,
    releaseState: 'locked',
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  });

  (diagnostic.steps || []).forEach((step, index) => {
    const taskRef = f.firestoreSdk.doc(f.firestoreSdk.collection(f.db, collections.tasks));
    batch.set(taskRef, {
      projectId: projectRef.id,
      title: step.label,
      standardStepId: step.id,
      status: 'not-started',
      weight: Number(step.weight || 1),
      estimatedHours: Number(step.estimatedHours || 0),
      assigneeIds: [],
      dependencyIds: [],
      sortOrder: index + 1,
      createdAt: now,
      updatedAt: now,
    });
  });

  const activityRef = f.firestoreSdk.doc(f.firestoreSdk.collection(f.db, collections.activity));
  batch.set(activityRef, {
    projectId: projectRef.id,
    type: 'project_created',
    message: 'Project created from StudioDesk diagnostic configuration.',
    actorId: uid,
    createdAt: now,
  });

  await batch.commit();
  return { projectId: projectRef.id, clientId: clientRef.id };
}

export async function createInvoice({ projectId, clientId, clientName, amount, currency = 'NGN', dueDate, notes = '' }) {
  const f = await getFirebaseServices();
  const ref = f.firestoreSdk.doc(f.firestoreSdk.collection(f.db, collections.invoices));
  const invoiceNo = `WSC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  await f.firestoreSdk.setDoc(ref, {
    projectId, clientId, clientName, invoiceNo,
    amount: Number(amount || 0), paidAmount: 0, balance: Number(amount || 0), currency,
    status: 'unpaid', dueDate: dueDate || null, notes,
    createdAt: f.firestoreSdk.serverTimestamp(), updatedAt: f.firestoreSdk.serverTimestamp(),
  });
  return { id: ref.id, invoiceNo };
}

export async function recordPayment({ invoice, amount, method = 'bank_transfer', reference = '', notes = '' }) {
  const f = await getFirebaseServices();
  const paymentRef = f.firestoreSdk.doc(f.firestoreSdk.collection(f.db, collections.payments));
  const invoiceRef = f.firestoreSdk.doc(f.db, collections.invoices, invoice.id);
  const paymentAmount = Number(amount || 0);
  const nextPaid = Number(invoice.paidAmount || 0) + paymentAmount;
  const balance = Math.max(0, Number(invoice.amount || 0) - nextPaid);
  const batch = f.firestoreSdk.writeBatch(f.db);
  batch.set(paymentRef, {
    invoiceId: invoice.id,
    projectId: invoice.projectId,
    clientId: invoice.clientId,
    amount: paymentAmount,
    currency: invoice.currency || 'NGN',
    method, reference, notes,
    status: 'confirmed',
    confirmedBy: f.auth.currentUser.uid,
    receivedAt: f.firestoreSdk.serverTimestamp(),
    createdAt: f.firestoreSdk.serverTimestamp(),
  });
  batch.update(invoiceRef, {
    paidAmount: nextPaid,
    balance,
    status: balance <= 0 ? 'paid' : 'partially_paid',
    updatedAt: f.firestoreSdk.serverTimestamp(),
  });
  await batch.commit();
  return paymentRef.id;
}

export async function archiveProject(projectId) {
  const f = await getFirebaseServices();
  const ref = f.firestoreSdk.doc(f.db, collections.projects, projectId);
  await f.firestoreSdk.updateDoc(ref, { archived: true, status: 'closed', closedAt: f.firestoreSdk.serverTimestamp(), updatedAt: f.firestoreSdk.serverTimestamp() });
}

export async function submitPublicPackageRequest(payload) {
  const f = await getFirebaseServices();
  if (!f) throw new Error('Firebase is not configured.');
  const user = await ensureAnonymousSession();
  const record = { ...payload, createdBy: user.uid, status: 'new', createdAt: f.firestoreSdk.serverTimestamp() };
  const ref = await f.firestoreSdk.addDoc(f.firestoreSdk.collection(f.db, collections.packageRequests), record);
  return ref.id;
}
