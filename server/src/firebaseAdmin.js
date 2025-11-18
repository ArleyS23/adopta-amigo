import admin from "firebase-admin";

let app;

if (!admin.apps.length) {
  let credentials;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      credentials = admin.credential.cert(JSON.parse(raw));
    } catch (err) {
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON");
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credentials = admin.credential.applicationDefault();
  }

  if (!credentials) {
    throw new Error("Missing Firebase admin credentials. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.");
  }

  app = admin.initializeApp({
    credential: credentials,
  });
} else {
  app = admin.app();
}

export const firebaseAuth = admin.auth(app);
export const firestore = admin.firestore(app);
