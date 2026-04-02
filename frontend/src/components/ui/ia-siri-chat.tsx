"use client";

import { Mic, MicOff, Volume2, VolumeX, Sparkles, Loader2, Square } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  onVolumeChange?: (volume: number) => void;
  className?: string;
  demoMode?: boolean;
  /** If true, renders as inline overlay (no min-h-screen) */
  inline?: boolean;
  status?: 'idle' | 'listening' | 'processing' | 'speaking';
  onToggle?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  velocity: { x: number; y: number };
}

export function VoiceChat({
  onStart,
  onStop,
  onVolumeChange,
  className,
  demoMode = false,
  inline = false,
  status: externalStatus,
  onToggle,
}: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [waveformData, setWaveformData] = useState<number[]>(Array(24).fill(0));
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const animationRef = useRef<number>();

  // Sync with external status if provided
  useEffect(() => {
    if (externalStatus) {
      setIsListening(externalStatus === 'listening');
      setIsProcessing(externalStatus === 'processing');
      setIsSpeaking(externalStatus === 'speaking');
    }
  }, [externalStatus]);

  // Generate particles for ambient effect
  useEffect(() => {
    const dim = inline ? 200 : 400;
    const count = inline ? 10 : 20;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * dim,
        y: Math.random() * dim,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5,
        },
      });
    }
    setParticles(newParticles);
  }, [inline]);

  // Animate particles
  useEffect(() => {
    const dim = inline ? 200 : 400;
    const animateParticles = () => {
      setParticles((prev) =>
        prev.map((particle) => ({
          ...particle,
          x: (particle.x + particle.velocity.x + dim) % dim,
          y: (particle.y + particle.velocity.y + dim) % dim,
          opacity: Math.max(0.05, Math.min(0.4, particle.opacity + (Math.random() - 0.5) * 0.02)),
        }))
      );
      animationRef.current = requestAnimationFrame(animateParticles);
    };
    animationRef.current = requestAnimationFrame(animateParticles);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [inline]);

  // Real-time duration timer (1-second tick)
  useEffect(() => {
    if (isListening) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Waveform and volume animation (fast tick)
  useEffect(() => {
    if (isListening || isSpeaking || isProcessing) {
      intervalRef.current = setInterval(() => {
        const newWaveform = Array(24)
          .fill(0)
          .map(() => Math.random() * (isListening ? 100 : isSpeaking ? 70 : isProcessing ? 40 : 20));
        setWaveformData(newWaveform);
        const newVolume = Math.random() * 100;
        setVolume(newVolume);
        onVolumeChange?.(newVolume);
      }, isProcessing ? 200 : 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setWaveformData(Array(24).fill(0));
      setVolume(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isListening, isSpeaking, isProcessing, onVolumeChange]);

  const handleToggleListening = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    if (demoMode) return;
    if (isListening) {
      setIsListening(false);
      onStop?.(duration);
      setDuration(0);
    } else {
      setIsListening(true);
      onStart?.();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (isListening) return "Listening... tap to stop";
    if (isProcessing) return "Processing your query...";
    if (isSpeaking) return "Speaking... tap to stop";
    return "Tap to speak";
  };

  const getStatusColor = () => {
    if (isListening) return "text-red-400";
    if (isProcessing) return "text-yellow-400";
    if (isSpeaking) return "text-green-400";
    return "text-gray-400";
  };

  const orbSize = inline ? "w-20 h-20" : "w-32 h-32";
  const iconSize = inline ? "w-8 h-8" : "w-12 h-12";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center relative overflow-hidden",
        !inline && "min-h-screen",
        inline && "py-6",
        className
      )}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-purple-400/20 rounded-full"
            style={{ left: particle.x, top: particle.y, opacity: particle.opacity }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Background glow */}
      {!inline && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl"
            animate={{
              scale: isListening ? [1, 1.2, 1] : [1, 1.1, 1],
              opacity: isListening ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center space-y-4">
        {/* Main voice button */}
        <motion.div className="relative" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <motion.button
            onClick={handleToggleListening}
            className={cn(
              "relative rounded-full flex items-center justify-center transition-all duration-300",
              "bg-gradient-to-br from-white/20 to-white/5 border-2 backdrop-blur-sm",
              orbSize,
              isListening
                ? "border-red-500 shadow-lg shadow-red-500/25"
                : isProcessing
                ? "border-yellow-500 shadow-lg shadow-yellow-500/25"
                : isSpeaking
                ? "border-green-500 shadow-lg shadow-green-500/25"
                : "border-gray-300/50 hover:border-purple-400/50"
            )}
            animate={{
              boxShadow: isListening
                ? [
                    "0 0 0 0 rgba(239, 68, 68, 0.4)",
                    "0 0 0 20px rgba(239, 68, 68, 0)",
                  ]
                : isSpeaking
                ? [
                    "0 0 0 0 rgba(34, 197, 94, 0.3)",
                    "0 0 0 15px rgba(34, 197, 94, 0)",
                  ]
                : undefined,
            }}
            transition={{ duration: 1.5, repeat: (isListening || isSpeaking) ? Infinity : 0 }}
          >
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div key="proc" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <Loader2 className={cn(iconSize, "text-yellow-500 animate-spin")} />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div key="speak" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-1"
                >
                  <Volume2 className={cn(iconSize, "text-green-500")} />
                  <Square className="w-3 h-3 text-red-400 fill-red-400" />
                </motion.div>
              ) : isListening ? (
                <motion.div key="listen" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <MicOff className={cn(iconSize, "text-red-400")} />
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <Mic className={cn(iconSize, "text-gray-400")} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Pulse rings */}
          <AnimatePresence>
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-500/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-500/20"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                />
              </>
            )}
            {isSpeaking && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-green-500/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              </>
            )}
            {isProcessing && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-yellow-500/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ borderStyle: "dashed" }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Waveform visualizer */}
        <div className="flex items-center justify-center space-x-0.5 h-10">
          {waveformData.map((height, index) => (
            <motion.div
              key={index}
              className={cn(
                "w-1 rounded-full transition-colors duration-300",
                isListening ? "bg-red-500" : isProcessing ? "bg-yellow-500" : isSpeaking ? "bg-green-500" : "bg-gray-300"
              )}
              animate={{
                height: `${Math.max(3, height * 0.4)}px`,
                opacity: isListening || isSpeaking || isProcessing ? 1 : 0.3,
              }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            />
          ))}
        </div>

        {/* Status and timer */}
        <div className="text-center space-y-1">
          <motion.p
            className={cn("text-sm font-medium transition-colors", getStatusColor())}
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{
              duration: 2,
              repeat: isListening || isProcessing || isSpeaking ? Infinity : 0,
            }}
          >
            {getStatusText()}
          </motion.p>

          {isListening && (
            <p className="text-xs text-gray-500 font-mono">{formatTime(duration)}</p>
          )}

          {volume > 0 && (isListening || isSpeaking) && (
            <motion.div
              className="flex items-center justify-center space-x-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <VolumeX className="w-3 h-3 text-gray-400" />
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  animate={{ width: `${volume}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <Volume2 className="w-3 h-3 text-gray-400" />
            </motion.div>
          )}
        </div>

        {/* AI indicator */}
        <motion.div
          className="flex items-center space-x-2 text-xs text-gray-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-3 h-3" />
          <span>CaseCut AI Voice</span>
        </motion.div>
      </div>
    </div>
  );
}

export default VoiceChat;
