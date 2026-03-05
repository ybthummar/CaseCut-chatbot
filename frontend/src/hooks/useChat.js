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
 * All data kept in sync via Firestore onSnapshot listeners.
 * Supports: RAG search, PDF chat, conversation history, strategic mode.
 */
export function useChat(user) {
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null); // uploaded PDF text for chat

  // ── Real-time: chat list ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToChatList(user.uid, setChatList);
    return unsub;
  }, [user]);

  // ── Real-time: messages for active chat ────────────────────────────
  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToChatMessages(user.uid, activeChatId, setMessages);
    return unsub;
  }, [user, activeChatId]);

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
      if (!user || !text.trim()) return;
      setLoading(true);

      try {
        let chatId = activeChatId;
        const isNew = !chatId;

        if (isNew) {
          const chatTitle = pdfDocument
            ? `📄 ${pdfDocument.filename || 'PDF'}: ${text.slice(0, 60)}`
            : text.slice(0, 80);
          chatId = await createChat(user.uid, chatTitle, role);
          setActiveChatId(chatId);
        }

        // Persist user message
        await addMessage(user.uid, chatId, {
          role: 'user',
          text,
          isFirstMessage: isNew,
        });

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

          // Persist assistant reply for PDF chat
          await addMessage(user.uid, chatId, {
            role: 'assistant',
            text: data.answer || 'No answer returned.',
            cases: data.citations || [],
            model: `casecut-legal (${data.source || 'unknown'})`,
            confidence: data.confidence || null,
            isPdfChat: true,
          });
        } else {
          // ── Standard RAG mode ─────────────────────────────────
          data = await apiSendQuery(text, role, topic, 5, history);

          await addMessage(user.uid, chatId, {
            role: 'assistant',
            text: data.summary || 'No summary returned.',
            cases: data.cases || [],
            model: `casecut-legal (${data.source || 'unknown'})`,
            confidence: data.confidence || null,
          });
        }

      } catch (err) {
        console.error('sendMessage error:', err);

        let errorText = '**⚠️ Error**\n\n';
        if (err.status === 0 || err.isNetworkError) {
          errorText += 'Cannot reach the backend server.\n\n';
          errorText += '**Fix:** Run `cd backend && python -m uvicorn app.main:app --reload`';
        } else if (err.status === 500) {
          errorText += `**Server Error:** ${err.message}\n\n`;
          errorText += '**Fix:** Check the backend terminal for the full traceback.';
        } else if (err.status === 422) {
          errorText += `**Validation Error:** ${err.message}\n\n`;
          errorText += 'The request format may be incorrect.';
        } else {
          errorText += err.message || 'Unable to process your request.';
        }

        const chatId = activeChatId;
        if (chatId) {
          try {
            await addMessage(user.uid, chatId, {
              role: 'assistant',
              text: errorText,
            });
          } catch (_) {
            /* swallow nested error */
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [user, activeChatId, pdfDocument, getConversationHistory]
  );

  // ── Chat management ────────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setPdfDocument(null);
  }, []);

  const selectChat = useCallback((chatId) => {
    setActiveChatId(chatId);
    setPdfDocument(null); // clear PDF when switching chats
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
  };
}
