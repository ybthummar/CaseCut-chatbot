import { useState, useEffect, useCallback } from 'react';
import {
  createChat,
  addMessage,
  subscribeToChatList,
  subscribeToChatMessages,
  deleteChat,
} from '../services/chatService';
import { sendQuery as apiSendQuery } from '../api/chatApi';

/**
 * Custom hook — manages chat list, active chat, messages, and API calls.
 * All data kept in sync via Firestore onSnapshot listeners.
 * Uses the centralized API client for backend calls.
 */
export function useChat(user) {
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // ── Send a message (creates chat if needed) ────────────────────────
  const sendMessage = useCallback(
    async (text, role, topic) => {
      if (!user || !text.trim()) return;
      setLoading(true);

      try {
        let chatId = activeChatId;
        const isNew = !chatId;

        if (isNew) {
          chatId = await createChat(user.uid, text.slice(0, 80), role);
          setActiveChatId(chatId);
        }

        // Persist user message
        await addMessage(user.uid, chatId, {
          role: 'user',
          text,
          isFirstMessage: isNew,
        });

        // Call backend via centralized API client
        const data = await apiSendQuery(text, role, topic, 5);

        // Persist assistant reply
        await addMessage(user.uid, chatId, {
          role: 'assistant',
          text: data.summary || 'No summary returned.',
          cases: data.cases || [],
          model: `casecut-legal (${data.source || 'unknown'})`,
        });

      } catch (err) {
        console.error('sendMessage error:', err);

        // Build a user-visible error message
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

        // Write error reply so user sees feedback in chat
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
    [user, activeChatId]
  );

  // ── Chat management ────────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
  }, []);

  const selectChat = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  const removeChat = useCallback(
    async (chatId) => {
      if (!user) return;
      try {
        await deleteChat(user.uid, chatId);
        if (chatId === activeChatId) {
          setActiveChatId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('removeChat error:', err);
      }
    },
    [user, activeChatId]
  );

  return {
    chatList,
    activeChatId,
    messages,
    loading,
    sendMessage,
    startNewChat,
    selectChat,
    removeChat,
  };
}
