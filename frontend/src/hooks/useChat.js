import { useState, useEffect, useCallback } from 'react';
import {
  createChat,
  addMessage,
  subscribeToChatList,
  subscribeToChatMessages,
  deleteChat,
} from '../services/chatService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Custom hook — manages chat list, active chat, messages, and API calls.
 * All data kept in sync via Firestore onSnapshot listeners.
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

        // Call backend
        const res = await fetch(`${API_URL}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, role, topic, k: 5 }),
        });

        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();

        // Persist assistant reply
        await addMessage(user.uid, chatId, {
          role: 'assistant',
          text: data.summary,
          cases: data.cases || [],
          model: 'casecut-legal',
        });
      } catch (err) {
        console.error('sendMessage error:', err);

        // Write an error-reply so the user sees feedback in the chat
        const chatId = activeChatId;
        if (chatId) {
          try {
            await addMessage(user.uid, chatId, {
              role: 'assistant',
              text: 'Unable to process your request. Please check your connection and try again.',
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
