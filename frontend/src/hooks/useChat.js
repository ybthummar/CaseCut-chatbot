import { useState, useEffect, useCallback } from 'react';
import {
  createChat,
  addMessage,
  subscribeToChatList,
  subscribeToChatMessages,
  deleteChat,
} from '../services/chatService';
import { sendQuery as apiSendQuery, chatWithPDF as apiChatWithPDF } from '../api/chatApi';

/**
 * Custom hook — manages chat list, active chat, messages, and API calls.
 *
 * Data is kept in sync via Firestore onSnapshot listeners when available.
 * If Firestore fails (permission-denied, offline), the hook falls back to
 * in-memory state so the user always sees their messages and error feedback.
 */
export function useChat(user) {
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [firestoreOk, setFirestoreOk] = useState(true);

  // ── Real-time: chat list ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToChatList(user.uid, (chats) => {
      setChatList(chats);
      setFirestoreOk(true);
    });

    // subscribeToChatList returns an unsubscribe fn from onSnapshot.
    // onSnapshot accepts an error callback as a second arg — but our
    // chatService wraps it without one, so we patch below.
    return unsub;
  }, [user]);

  // ── Real-time: messages for active chat ────────────────────────────
  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToChatMessages(user.uid, activeChatId, (msgs) => {
      setMessages(msgs);
      setFirestoreOk(true);
    });
    return unsub;
  }, [user, activeChatId]);

  // ── Helper: add a message to local state (in-memory fallback) ──────
  const addLocalMessage = useCallback((msg) => {
    const localMsg = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      ...msg,
    };
    setMessages((prev) => [...prev, localMsg]);
    return localMsg;
  }, []);

  // ── Helper: try Firestore, fall back to local ─────────────────────
  const trySaveMessage = useCallback(async (userId, chatId, msg) => {
    try {
      await addMessage(userId, chatId, msg);
      return true;
    } catch (err) {
      console.warn('Firestore write failed, using local state:', err.message);
      setFirestoreOk(false);
      addLocalMessage(msg);
      return false;
    }
  }, [addLocalMessage]);

  // ── Build conversation history from recent messages ────────────────
  const getConversationHistory = useCallback(() => {
    if (!messages || messages.length === 0) return null;
    return messages.slice(-6).map(m => ({
      role: m.role,
      text: typeof m.text === 'string' ? m.text.slice(0, 500) : '',
    }));
  }, [messages]);

  // ── Send a message (creates chat if needed) ────────────────────────
  const sendMessage = useCallback(
    async (text, role, topic) => {
      if (!text.trim()) return;
      setLoading(true);

      // Always show the user's message immediately in local state
      addLocalMessage({ role: 'user', text });

      try {
        let chatId = activeChatId;
        const isNew = !chatId;

        // Try to create chat in Firestore
        if (isNew) {
          if (user) {
            try {
              const chatTitle = pdfDocument
                ? `📄 ${pdfDocument.filename || 'PDF'}: ${text.slice(0, 60)}`
                : text.slice(0, 80);
              chatId = await createChat(user.uid, chatTitle, role);
              setActiveChatId(chatId);
            } catch (fsErr) {
              console.warn('Firestore createChat failed:', fsErr.message);
              setFirestoreOk(false);
              chatId = `local_${Date.now()}`;
              setActiveChatId(chatId);
            }
          } else {
            chatId = `local_${Date.now()}`;
            setActiveChatId(chatId);
          }
        }

        // Try to persist user message to Firestore
        if (user && firestoreOk) {
          await trySaveMessage(user.uid, chatId, {
            role: 'user',
            text,
            isFirstMessage: isNew,
          });
        }

        // Get conversation history for context
        const history = getConversationHistory();

        let data;

        if (pdfDocument && pdfDocument.full_text) {
          // ── PDF Chat mode ─────────────────────────────────────
          data = await apiChatWithPDF(
            text,
            pdfDocument.full_text,
            role,
            history,
          );

          const assistantMsg = {
            role: 'assistant',
            text: data.answer || 'No answer returned.',
            cases: data.citations || [],
            model: `casecut-legal (${data.source || 'unknown'})`,
            confidence: data.confidence || null,
            isPdfChat: true,
          };

          // Show in local state immediately
          addLocalMessage(assistantMsg);

          // Try Firestore persist (non-blocking)
          if (user && firestoreOk) {
            trySaveMessage(user.uid, chatId, assistantMsg).catch(() => {});
          }

        } else {
          // ── Standard RAG mode ─────────────────────────────────
          data = await apiSendQuery(text, role, topic, 5, history);

          const assistantMsg = {
            role: 'assistant',
            text: data.summary || 'No summary returned.',
            cases: data.cases || [],
            model: `casecut-legal (${data.source || 'unknown'})`,
            confidence: data.confidence || null,
          };

          // Show in local state immediately
          addLocalMessage(assistantMsg);

          // Try Firestore persist (non-blocking)
          if (user && firestoreOk) {
            trySaveMessage(user.uid, chatId, assistantMsg).catch(() => {});
          }
        }

      } catch (err) {
        console.error('sendMessage error:', err);

        let errorText = '**⚠️ Error**\n\n';

        // Detect Firebase permission errors
        if (err.code === 'permission-denied' || err.message?.includes('permission')) {
          errorText += '**Firestore Permission Denied**\n\n';
          errorText += 'Your Firebase security rules are blocking access.\n\n';
          errorText += '**Fix:** Go to [Firebase Console](https://console.firebase.google.com) → Firestore → Rules, and set:\n\n';
          errorText += '```\nrules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /users/{userId}/{document=**} {\n      allow read, write: if request.auth != null\n                         && request.auth.uid == userId;\n    }\n  }\n}\n```';
          setFirestoreOk(false);
        } else if (err.status === 0 || err.isNetworkError || err.message?.includes('Failed to fetch')) {
          errorText += 'Cannot reach the backend server.\n\n';
          errorText += '**Fix:** Make sure the backend is running:\n```\ncd backend && python -m uvicorn app.main:app --reload\n```';
        } else if (err.status === 500) {
          errorText += `**Server Error:** ${err.message}\n\n`;
          errorText += 'Check the backend terminal for the full traceback.';
        } else if (err.status === 422) {
          errorText += `**Validation Error:** ${err.message}\n\n`;
          errorText += 'The request format may be incorrect.';
        } else {
          errorText += err.message || 'Unable to process your request.';
        }

        // Always show error in local state (never depend on Firestore for errors)
        addLocalMessage({
          role: 'assistant',
          text: errorText,
          isError: true,
        });

      } finally {
        setLoading(false);
      }
    },
    [user, activeChatId, pdfDocument, firestoreOk, getConversationHistory, addLocalMessage, trySaveMessage]
  );

  // ── Chat management ────────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setPdfDocument(null);
  }, []);

  const selectChat = useCallback((chatId) => {
    setActiveChatId(chatId);
    setPdfDocument(null);
  }, []);

  const removeChat = useCallback(
    async (chatId) => {
      if (!user) return;
      try {
        await deleteChat(user.uid, chatId);
        if (chatId === activeChatId) {
          setActiveChatId(null);
          setMessages([]);
          setPdfDocument(null);
        }
      } catch (err) {
        console.error('removeChat error:', err);
      }
    },
    [user, activeChatId]
  );

  // ── PDF management ─────────────────────────────────────────────────
  const setPdfForChat = useCallback((parsedDocument) => {
    setPdfDocument(parsedDocument);
  }, []);

  const clearPdf = useCallback(() => {
    setPdfDocument(null);
  }, []);

  return {
    chatList,
    activeChatId,
    messages,
    loading,
    sendMessage,
    startNewChat,
    selectChat,
    removeChat,
    pdfDocument,
    setPdfForChat,
    clearPdf,
    firestoreOk,
  };
}
