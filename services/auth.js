import { getFirebaseServices } from './firebase.js';

export async function signInWithEmail(email, password) {
  const f = await getFirebaseServices();
  if (!f) throw new Error('Firebase is not configured.');
  return f.authSdk.signInWithEmailAndPassword(f.auth, email.trim(), password);
}

export async function signInWithGoogle() {
  const f = await getFirebaseServices();
  if (!f) throw new Error('Firebase is not configured.');
  const provider = new f.authSdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return f.authSdk.signInWithPopup(f.auth, provider);
}

export async function signOutUser() {
  const f = await getFirebaseServices();
  if (!f) return;
  return f.authSdk.signOut(f.auth);
}

export async function ensureAnonymousSession() {
  const f = await getFirebaseServices();
  if (!f) throw new Error('Firebase is not configured.');
  if (f.auth.currentUser) return f.auth.currentUser;
  const credential = await f.authSdk.signInAnonymously(f.auth);
  return credential.user;
}

export async function watchAuth(callback) {
  const f = await getFirebaseServices();
  if (!f) {
    callback(null);
    return () => {};
  }
  return f.authSdk.onAuthStateChanged(f.auth, callback);
}
