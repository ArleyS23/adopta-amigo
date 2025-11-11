import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";

const conversationId = (petId, ownerId, adopterId) => `conv_${petId}_${ownerId}_${adopterId}`;

export async function ensureConversation(pet, adopter, adopterProfile) {
  const id = conversationId(pet.id, pet.ownerId, adopter.uid);
  const ref = doc(db, "conversations", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id,
      petId: pet.id,
      petName: pet.name,
      ownerId: pet.ownerId,
      ownerName: pet.ownerName || pet.ownerId || "Usuario",
      adopterId: adopter.uid,
      adopterName: adopterProfile?.displayName || adopter.email || "Usuario",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return id;
}

export function listenConversation(conversationId, callback) {
  return onSnapshot(doc(db, "conversations", conversationId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function listenMessages(conversationId, callback) {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))); 
  });
}

export async function sendMessage(conversationId, senderId, text) {
  const trimmed = text?.trim();
  if (!trimmed) return;
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  await addDoc(messagesRef, {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    updatedAt: serverTimestamp(),
    lastMessage: trimmed,
  });
}

export async function updateConversationStatus(conversationId, status) {
  await updateDoc(doc(db, "conversations", conversationId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function listenOwnerRequests(ownerId, callback) {
  if (!ownerId) return () => {};
  const q = query(collection(db, "conversations"), where("ownerId", "==", ownerId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))); 
  });
}
