/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, sendEmailVerification, updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  generateKeyPair,
  exportKeyToBase64,
  importPrivateKey,
  importPublicKey,
  signText,
} from "../utils/rsa";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsaState, setRsaState] = useState({ ready: false, privateKey: null, publicKeyBase64: null });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    let active = true;
    async function ensureRSAKeys(currentUser) {
      if (!currentUser) {
        if (active) setRsaState({ ready: true, privateKey: null, publicKeyBase64: null });
        return;
      }

      const storagePrivate = `rsa_private_${currentUser.uid}`;
      const storagePublic = `rsa_public_${currentUser.uid}`;

      let privateKeyBase64 = localStorage.getItem(storagePrivate);
      let publicKeyBase64 = localStorage.getItem(storagePublic);
      let privateKey = null;

      if (privateKeyBase64) {
        try {
          privateKey = await importPrivateKey(privateKeyBase64);
        } catch {
          localStorage.removeItem(storagePrivate);
          privateKeyBase64 = null;
        }
      }

      if (!publicKeyBase64) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().publicKey) {
          publicKeyBase64 = userDoc.data().publicKey;
          localStorage.setItem(storagePublic, publicKeyBase64);
        }
      }

      if (publicKeyBase64) {
        try {
          await importPublicKey(publicKeyBase64);
        } catch {
          localStorage.removeItem(storagePublic);
          publicKeyBase64 = null;
        }
      }

      if (!privateKey || !publicKeyBase64) {
        const pair = await generateKeyPair();
        privateKey = pair.privateKey;
        const newPublicKey = pair.publicKey;
        privateKeyBase64 = await exportKeyToBase64(privateKey);
        publicKeyBase64 = await exportKeyToBase64(newPublicKey);
        localStorage.setItem(storagePrivate, privateKeyBase64);
        localStorage.setItem(storagePublic, publicKeyBase64);
        await setDoc(doc(db, "users", currentUser.uid), {
          uid: currentUser.uid,
          email: currentUser.email,
          publicKey: publicKeyBase64,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      if (active) setRsaState({ ready: true, privateKey, publicKeyBase64 });
    }

    setRsaState((prev) => ({ ...prev, ready: false }));
    ensureRSAKeys(user);
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    async function loadProfile(currentUser) {
      if (!currentUser) {
        if (active) setProfile(null);
        return;
      }
      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const base = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || "",
          savedPets: [],
        };
        await setDoc(ref, base, { merge: true });
        if (active) setProfile(base);
        return;
      }
      const data = snap.data();
      if (active) {
        setProfile({
          displayName: data.displayName || currentUser.displayName || "",
          savedPets: data.savedPets || [],
          publicKey: data.publicKey || rsaState.publicKeyBase64 || null,
        });
      }
    }
    loadProfile(user);
    return () => { active = false; };
  }, [user, rsaState.publicKeyBase64]);

  const login    = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
  const register = async (email, pass) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    if (user && !user.emailVerified) await sendEmailVerification(user);
    return user;
  };
  const logout = () => signOut(auth);
  const signSecure = (text) => {
    if (!rsaState.privateKey) throw new Error("RSA keys not ready");
    return signText(rsaState.privateKey, text);
  };
  const refreshUser = async () => {
    if (!auth.currentUser) return null;
    await auth.currentUser.reload();
    setUser(auth.currentUser);
    return auth.currentUser;
  };
  const syncOwnerNames = async (newName) => {
    if (!user) return;
    const q = query(collection(db, "pets"), where("ownerId", "==", user.uid));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.update(docSnap.ref, { ownerName: newName || user.email || "Usuario" });
    });
    await batch.commit();
  };

  const updateDisplayName = async (name) => {
    if (!user) return;
    const trimmed = name.trim();
    await setDoc(doc(db, "users", user.uid), { displayName: trimmed }, { merge: true });
    if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: trimmed });
    await syncOwnerNames(trimmed);
    setProfile((prev) => ({
      ...(prev || {}),
      displayName: trimmed,
      savedPets: prev?.savedPets || [],
    }));
  };
  const toggleSavedPet = async (petId) => {
    if (!user) throw new Error("Debes iniciar sesion para guardar favoritos");
    let nextSaved = [];
    setProfile((prev) => {
      const current = prev?.savedPets || [];
      const exists = current.includes(petId);
      nextSaved = exists ? current.filter((id) => id !== petId) : [...current, petId];
      return { ...(prev || {}), savedPets: nextSaved };
    });
    await setDoc(doc(db, "users", user.uid), { savedPets: nextSaved }, { merge: true });
  };

  return <AuthCtx.Provider value={{
    user,
    login,
    register,
    logout,
    loading,
    rsaReady: rsaState.ready,
    rsaPublicKey: rsaState.publicKeyBase64,
    signSecure,
    refreshUser,
    profile,
    updateDisplayName,
    toggleSavedPet,
  }}>
    {children}
  </AuthCtx.Provider>;
}
