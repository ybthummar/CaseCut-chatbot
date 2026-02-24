/**
 * Firebase Storage — PDF upload + Firestore metadata persistence.
 *
 * Metadata schema (users/{userId}/summaries/{id}):
 *   fileName    : string
 *   fileUrl     : string   (Storage download URL)
 *   userId      : string
 *   modelUsed   : string   (model id slug)
 *   summaryText : string
 *   timestamp   : timestamp
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

/**
 * Upload a PDF to Firebase Storage with progress tracking.
 * @param {string}   userId      – authenticated user UID
 * @param {File}     file        – browser File object
 * @param {Function} onProgress  – callback receiving 0–100
 * @returns {Promise<string>}    – download URL
 */
export const uploadPDF = (userId, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(
      storage,
      `pdfs/${userId}/${Date.now()}_${file.name}`
    );
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
};

/**
 * Save summary metadata to Firestore.
 * @returns {Promise<string>} – document ID
 */
export const saveSummaryMetadata = async (userId, metadata) => {
  const ref = await addDoc(collection(db, 'users', userId, 'summaries'), {
    fileName: metadata.fileName,
    fileUrl: metadata.fileUrl || '',
    userId,
    modelUsed: metadata.modelUsed,
    summaryText: metadata.summaryText,
    timestamp: serverTimestamp(),
  });
  return ref.id;
};
