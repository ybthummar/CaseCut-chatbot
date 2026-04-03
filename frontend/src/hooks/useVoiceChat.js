/**
 * useVoiceChat — Bridges useVoiceAgent with Firestore chat persistence.
 *
 * Creates a voice session in Firestore on first speech, then persists
 * every user utterance and AI response as chat messages in real-time.
 * Supports session history (past voice sessions) and session switching.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVoiceAgent } from './useVoiceAgent'
import {
  createChat,
  addMessage,
  subscribeToChatList,
  subscribeToChatMessages,
  deleteChat,
} from '../services/chatService'

export function useVoiceChat(user, { language = 'english', onError } = {}) {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])

  const sessionRef = useRef(null)
  const firstMsgRef = useRef(true)
  const userRef = useRef(user)
  const creatingSession = useRef(false)

  useEffect(() => { userRef.current = user }, [user])

  // ── Persist user speech to Firestore ────────────────────────────
  const handleUserSpeech = useCallback(async (text) => {
    const uid = userRef.current?.uid
    if (!uid) return

    let sid = sessionRef.current

    // Create a new Firestore session on first utterance
    if (!sid && !creatingSession.current) {
      creatingSession.current = true
      try {
        sid = await createChat(uid, `🎙️ ${text.slice(0, 60)}`, 'voice')
        sessionRef.current = sid
        setActiveSessionId(sid)
        firstMsgRef.current = true
      } catch (err) {
        console.error('Failed to create voice session:', err)
        creatingSession.current = false
        return
      }
      creatingSession.current = false
    }

    if (!sid) return

    try {
      await addMessage(uid, sid, {
        role: 'user',
        text,
        isFirstMessage: firstMsgRef.current,
      })
      firstMsgRef.current = false
    } catch (err) {
      console.error('Failed to save user message:', err)
    }
  }, [])

  // ── Persist agent response to Firestore ─────────────────────────
  const handleAgentResponse = useCallback(async (text) => {
    const uid = userRef.current?.uid
    if (!uid || !sessionRef.current) return

    try {
      await addMessage(uid, sessionRef.current, {
        role: 'assistant',
        text,
        model: 'voice-agent',
      })
    } catch (err) {
      console.error('Failed to save agent response:', err)
    }
  }, [])

  // ── Voice agent (with persistence callbacks) ────────────────────
  const voice = useVoiceAgent({
    language,
    onError,
    onUserSpeech: handleUserSpeech,
    onAgentResponse: handleAgentResponse,
  })

  // ── Subscribe to voice sessions list ────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setSessions([])
      return
    }
    return subscribeToChatList(user.uid, (chats) => {
      setSessions(chats.filter((c) => c.role === 'voice'))
    })
  }, [user?.uid])

  // ── Subscribe to active session messages ────────────────────────
  useEffect(() => {
    if (!user?.uid || !activeSessionId) {
      setMessages([])
      return
    }
    return subscribeToChatMessages(user.uid, activeSessionId, setMessages)
  }, [user?.uid, activeSessionId])

  // ── Start a new voice session ───────────────────────────────────
  const startNewSession = useCallback(() => {
    voice.stopAll()
    sessionRef.current = null
    setActiveSessionId(null)
    setMessages([])
    voice.clearMemory()
    firstMsgRef.current = true
    creatingSession.current = false
  }, [voice])

  // ── Select a past session (view-only) ───────────────────────────
  const selectSession = useCallback((id) => {
    voice.stopAll()
    voice.clearMemory()
    sessionRef.current = id
    setActiveSessionId(id)
    firstMsgRef.current = false
  }, [voice])

  // ── Delete a session ────────────────────────────────────────────
  const removeSession = useCallback(async (id) => {
    if (!user?.uid) return
    try {
      await deleteChat(user.uid, id)
      if (sessionRef.current === id) {
        startNewSession()
      }
    } catch (err) {
      console.error('Failed to delete voice session:', err)
    }
  }, [user, startNewSession])

  return {
    // Voice agent state + controls (spread)
    ...voice,
    // Session management
    sessions,
    activeSessionId,
    messages,
    startNewSession,
    selectSession,
    removeSession,
  }
}
