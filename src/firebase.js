import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCoyqNXGr2GA6W-wsVFG9n2AJ2cl_ZoXY4",
  authDomain: "adopta-un-amigo-9957b.firebaseapp.com",
  projectId: "adopta-un-amigo-9957b",
  storageBucket: "adopta-un-amigo-9957b.appspot.com",
  messagingSenderId: "1060200202643",
  appId: "1:1060200202643:web:145c6a3038102730de2866",
  measurementId: "G-N67V0JPNLP",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Inicializa analytics solo cuando el entorno lo soporta
isSupported().then((ok) => { if (ok) getAnalytics(app); });

export default app;
