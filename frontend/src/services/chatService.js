/**
 * Firestore chat persistence — subcollection-based schema.
 *
 * Schema:
 *   users/{userId}/chats/{chatId}
 *     ├── title       : string   (first 80 chars of first message)
 *     ├── role        : string   (lawyer | judge | student)
 *     ├── createdAt   : timestamp
 *     └── updatedAt   : timestamp
 *
 *   users/{userId}/chats/{chatId}/messages/{messageId}
 *     ├── role        : 'user' | 'assistant'
 *     ├── text        : string
 *     ├── cases       : array    (optional — case citations)
 *     ├── model       : string   (optional — AI model slug)
 *     └── timestamp   : timestamp
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Collection helpers ──────────────────────────────────────────────

const userChatsCol = (uid) => collection(db, 'users', uid, 'chats');

const chatMessagesCol = (uid, chatId) =>
  collection(db, 'users', uid, 'chats', chatId, 'messages');

// ─── Write operations ────────────────────────────────────────────────

/** Create a new chat document; returns its ID. */
export const createChat = async (userId, title, role) => {
  const ref = await addDoc(userChatsCol(userId), {
    title: title || 'New conversation',
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/** Append a message to a chat's messages subcollection. */
export const addMessage = async (userId, chatId, message) => {
  const ref = await addDoc(chatMessagesCol(userId, chatId), {
    role: message.role,
    text: message.text,
    ...(message.cases ? { cases: message.cases } : {}),
    ...(message.model ? { model: message.model } : {}),
    timestamp: serverTimestamp(),
  });

  // Keep chat metadata fresh
  const updates = { updatedAt: serverTimestamp() };
  if (message.isFirstMessage) {
    updates.title = message.text.slice(0, 80);
  }
  await updateDoc(doc(db, 'users', userId, 'chats', chatId), updates);

  return ref.id;
};

/** Delete a chat document (orphaned messages subcollection is harmless). */
export const deleteChat = async (userId, chatId) => {
  await deleteDoc(doc(db, 'users', userId, 'chats', chatId));
};

// ─── Real-time listeners ─────────────────────────────────────────────

/** Subscribe to the user's chat list (most recent first). Returns unsubscribe fn. */
export const subscribeToChatList = (userId, callback) => {
  const q = query(userChatsCol(userId), orderBy('updatedAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

/** Subscribe to a single chat's messages (chronological). Returns unsubscribe fn. */
export const subscribeToChatMessages = (userId, chatId, callback) => {
  const q = query(chatMessagesCol(userId, chatId), orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};
