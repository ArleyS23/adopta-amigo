import { firebaseAuth, firestore } from "../firebaseAdmin.js";

const rolesCache = new Map();
const CACHE_TTL = 2 * 60 * 1000;

async function resolveUserRole(uid) {
  const cached = rolesCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const snap = await firestore.collection("users").doc(uid).get();
  const role = snap.exists && snap.data().role === "admin" ? "admin" : "user";
  rolesCache.set(uid, { value: role, expiresAt: Date.now() + CACHE_TTL });
  return role;
}

export async function requireAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) return res.status(401).json({ message: "Missing Authorization header" });
  try {
    const decoded = await firebaseAuth.verifyIdToken(match[1]);
    const role = await resolveUserRole(decoded.uid);
    req.auth = {
      uid: decoded.uid,
      email: decoded.email || null,
      role,
    };
    next();
  } catch (err) {
    console.error("[Auth]", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
