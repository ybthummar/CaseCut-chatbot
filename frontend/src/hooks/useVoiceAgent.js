/**
 * useVoiceAgent — Real-time conversational AI voice agent for CaseCut.
 *
 * Features:
 *  - Real-time speech recognition (Web Speech API)
 *  - Sends spoken input to /voice-chat backend agent
 *  - Speaks the AI response back using TTS
 *  - Barge-in: if user starts speaking, TTS stops immediately
 *  - Simple conversation memory (last N turns persisted in state)
 *  - NOT a TTS reader of chat responses — this is a standalone agent
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { voiceChat } from '../api/chatApi'

// ── Language map ────────────────────────────────────────────────────
const LANG_MAP = {
  english:   'en-IN',
  hindi:     'hi-IN',
  bengali:   'bn-IN',
  tamil:     'ta-IN',
  telugu:    'te-IN',
  marathi:   'mr-IN',
  gujarati:  'gu-IN',
  kannada:   'kn-IN',
  malayalam: 'ml-IN',
  punjabi:   'pa-IN',
  urdu:      'ur-IN',
}

// ── Helper: split text into ~200-char sentence-boundary chunks ──────
function chunkText(text, maxLen = 200) {
  if (!text || text.length <= maxLen) return [text]
  const chunks = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining)
      break
    }
    let cut = -1
    for (const sep of ['. ', '। ', '? ', '! ', '; ', ', ']) {
      const idx = remaining.lastIndexOf(sep, maxLen)
      if (idx > 0 && idx > cut) cut = idx + sep.length
    }
    if (cut <= 0) cut = maxLen
    chunks.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  return chunks.filter(Boolean)
}

/**
 * @param {Object} opts
 * @param {string}   opts.language   - current language key
 * @param {Function} opts.onError    - called with error string
 */
export function useVoiceAgent({ language = 'english', onError, onUserSpeech, onAgentResponse } = {}) {
  // 'idle' | 'listening' | 'processing' | 'speaking'
  const [status, setStatus] = useState('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [supported, setSupported] = useState(true)
  const [memory, setMemory] = useState([]) // [{role, text}]
  const [lastAgentResponse, setLastAgentResponse] = useState('')

  const recognitionRef  = useRef(null)
  const synthRef        = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null)
  const manualStop      = useRef(false)
  const statusRef       = useRef(status)
  const onErrorRef      = useRef(onError)
  const restartTimer    = useRef(null)
  const speakQueueRef   = useRef([])
  const speakCancelRef  = useRef(false)
  const abortControllerRef = useRef(null)
  const languageRef     = useRef(language)
  const onUserSpeechRef = useRef(onUserSpeech)
  const onAgentResponseRef = useRef(onAgentResponse)

  useEffect(() => { statusRef.current = status }, [status])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { languageRef.current = language }, [language])
  useEffect(() => { onUserSpeechRef.current = onUserSpeech }, [onUserSpeech])
  useEffect(() => { onAgentResponseRef.current = onAgentResponse }, [onAgentResponse])

  // ── Safe restart recognition after a short delay ──────────────
  const safeRestart = useCallback((recognition, delay = 150) => {
    if (restartTimer.current) clearTimeout(restartTimer.current)
    restartTimer.current = setTimeout(() => {
      if (!manualStop.current && statusRef.current === 'listening') {
        try { recognition.start() } catch {}
      }
    }, delay)
  }, [])

  // ── TTS speak function ────────────────────────────────────────
  const speakText = useCallback((text, onDone) => {
    if (!synthRef.current || !text) {
      onDone?.()
      return
    }

    synthRef.current.cancel()
    speakCancelRef.current = false
    speakQueueRef.current = []

    const langCode = LANG_MAP[languageRef.current] || 'en-IN'
    const voices = synthRef.current.getVoices()
    const targetLang = langCode.split('-')[0]
    const matchVoice = voices.find(v => v.lang.startsWith(targetLang))
      || voices.find(v => v.lang.startsWith('en'))

    const chunks = chunkText(text)
    speakQueueRef.current = [...chunks]

    const speakNext = () => {
      if (speakCancelRef.current || speakQueueRef.current.length === 0) {
        if (statusRef.current === 'speaking') setStatus('idle')
        speakQueueRef.current = []
        onDone?.()
        return
      }

      const chunk = speakQueueRef.current.shift()
      const utt = new SpeechSynthesisUtterance(chunk)
      utt.lang  = langCode
      utt.rate  = 1.0
      utt.pitch = 1.0
      if (matchVoice) utt.voice = matchVoice

      utt.onstart = () => setStatus('speaking')
      utt.onend   = () => speakNext()
      utt.onerror = () => {
        speakQueueRef.current = []
        setStatus('idle')
        onDone?.()
      }

      synthRef.current.speak(utt)
    }

    setStatus('speaking')
    speakNext()
  }, [])

  // ── Stop TTS immediately (barge-in) ────────────────────────────
  const stopSpeaking = useCallback(() => {
    speakCancelRef.current = true
    speakQueueRef.current = []
    if (synthRef.current) synthRef.current.cancel()
    if (statusRef.current === 'speaking') setStatus('idle')
  }, [])

  // ── Send message to voice agent and speak response ─────────────
  const sendToAgent = useCallback(async (userText) => {
    if (!userText.trim()) return

    // Add user message to memory
    setMemory(prev => {
      const updated = [...prev, { role: 'user', text: userText.trim() }]
      return updated.slice(-20) // keep last 20 turns
    })

    // Notify listener of user speech (for persistence)
    try { onUserSpeechRef.current?.(userText.trim()) } catch {}

    setStatus('processing')

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const result = await voiceChat(
        userText.trim(),
        languageRef.current,
        [...memory, { role: 'user', text: userText.trim() }].slice(-10),
        abortControllerRef.current.signal,
      )

      const agentResponse = result?.response || 'Sorry, I could not understand. Please try again.'
      setLastAgentResponse(agentResponse)

      // Add agent response to memory
      setMemory(prev => {
        const updated = [...prev, { role: 'assistant', text: agentResponse }]
        return updated.slice(-20)
      })

      // Notify listener of agent response (for persistence)
      try { onAgentResponseRef.current?.(agentResponse) } catch {}

      // Speak the response, then auto-listen again
      speakText(agentResponse, () => {
        // After speaking, auto-start listening again if not manually stopped
        if (!manualStop.current) {
          startListeningInternal()
        }
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Voice agent error:', err)
      setStatus('idle')
      if (onErrorRef.current) {
        onErrorRef.current(err?.message || 'Voice agent failed. Please try again.')
      }
    }
  }, [memory, speakText])

  // ── Initialize SpeechRecognition ──────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let final   = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }

      setLiveTranscript(interim || final)

      if (final) {
        setLiveTranscript('')
        // Stop listening, process the message
        manualStop.current = true
        try { recognition.stop() } catch {}
        sendToAgent(final.trim())
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (!manualStop.current && statusRef.current === 'listening') {
          safeRestart(recognition, 250)
        } else {
          setStatus(s => s === 'listening' ? 'idle' : s)
        }
        return
      }

      const messages = {
        'not-allowed':        'Microphone access denied. Please allow microphone permission.',
        'audio-capture':      'No microphone found. Please connect a microphone.',
        'network':            'Network error. Speech recognition needs an internet connection.',
        'service-not-allowed':'Speech service unavailable in this browser.',
      }
      const msg = messages[event.error] || `Speech recognition error: ${event.error}`
      if (onErrorRef.current) onErrorRef.current(msg)
      setStatus('idle')
      setLiveTranscript('')
    }

    recognition.onend = () => {
      if (!manualStop.current && statusRef.current === 'listening') {
        safeRestart(recognition)
      } else if (statusRef.current === 'listening') {
        setStatus('idle')
      }
    }

    recognitionRef.current = recognition
    return () => {
      if (restartTimer.current) clearTimeout(restartTimer.current)
    }
  }, [safeRestart, sendToAgent])

  // ── Update recognition language ────────────────────────────────
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language] || 'en-IN'
    }
  }, [language])

  // ── Start listening (internal, no barge-in stop needed) ────────
  const startListeningInternal = useCallback(() => {
    if (!recognitionRef.current) return

    manualStop.current = false
    setLiveTranscript('')
    setStatus('listening')
    recognitionRef.current.lang = LANG_MAP[languageRef.current] || 'en-IN'

    try {
      recognitionRef.current.start()
    } catch {
      try { recognitionRef.current.abort() } catch {}
      setTimeout(() => {
        try { recognitionRef.current.start() } catch {}
      }, 150)
    }
  }, [])

  // ── Start listening (with barge-in — stops any ongoing TTS) ───
  const startListening = useCallback(() => {
    // Barge-in: stop speaking immediately when user wants to talk
    stopSpeaking()
    startListeningInternal()
  }, [stopSpeaking, startListeningInternal])

  // ── Stop listening ────────────────────────────────────────────
  const stopListening = useCallback(() => {
    manualStop.current = true
    if (restartTimer.current) clearTimeout(restartTimer.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }
    setStatus(s => s === 'listening' ? 'idle' : s)
    setLiveTranscript('')
  }, [])

  // ── Toggle listening ──────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (statusRef.current === 'listening') {
      stopListening()
    } else if (statusRef.current === 'speaking') {
      // Barge-in: interrupt AI, start listening
      startListening()
    } else {
      startListening()
    }
  }, [startListening, stopListening])

  // ── Stop everything ───────────────────────────────────────────
  const stopAll = useCallback(() => {
    manualStop.current = true
    if (restartTimer.current) clearTimeout(restartTimer.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }
    stopSpeaking()
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setStatus('idle')
    setLiveTranscript('')
  }, [stopSpeaking])

  // ── Clear memory ──────────────────────────────────────────────
  const clearMemory = useCallback(() => {
    setMemory([])
    setLastAgentResponse('')
  }, [])

  // ── Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      manualStop.current = true
      speakCancelRef.current = true
      if (restartTimer.current) clearTimeout(restartTimer.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
      if (synthRef.current) synthRef.current.cancel()
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  return {
    status,
    liveTranscript,
    supported,
    memory,
    lastAgentResponse,
    toggleListening,
    startListening,
    stopListening,
    stopSpeaking,
    stopAll,
    clearMemory,
  }
}
