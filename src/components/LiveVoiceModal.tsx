import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Sparkles,
  MessageSquare,
  RefreshCw,
  X,
  Radio,
} from 'lucide-react';
import { Language } from '../lib/types';
import { sendChatMessage } from '../lib/api';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  projectInstructions?: string;
  onSaveToChatHistory?: (userText: string, aiText: string) => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  projectInstructions = '',
  onSaveToChatHistory,
}) => {
  const [callState, setCallState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastUserSpeech, setLastUserSpeech] = useState('');
  const [lastAiResponse, setLastAiResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const currentSpeechRef = useRef<string>('');
  const timerIntervalRef = useRef<any>(null);
  const isComponentMounted = useRef<boolean>(true);

  // Call timer
  useEffect(() => {
    if (isOpen) {
      setCallDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isOpen]);

  // Format call duration MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    if (!isOpen) return;
    isComponentMounted.current = true;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        if (callState !== 'speaking' && callState !== 'thinking') {
          setCallState('listening');
        }
      };

      recognition.onresult = (event: any) => {
        if (isMuted) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = final || interim;
        if (currentText.trim()) {
          currentSpeechRef.current = currentText.trim();
          setTranscript(currentText.trim());

          // Reset silence timer
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          // Wait 1.3 seconds of silence before automatically submitting user utterance
          silenceTimerRef.current = setTimeout(() => {
            if (currentSpeechRef.current && currentSpeechRef.current.trim().length > 1) {
              handleUserSpoke(currentSpeechRef.current.trim());
              currentSpeechRef.current = '';
            }
          }, 1400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert(
            language === 'bn'
              ? 'মাইক্রোফোন ব্যবহারের অনুমতি দিন লাইভ কথা বলার জন্য।'
              : 'Please allow microphone access to talk directly with Nasir AI.'
          );
        }
      };

      recognition.onend = () => {
        // Automatically restart listening if still open and not speaking/thinking
        if (isComponentMounted.current && !isMuted && callState !== 'speaking' && callState !== 'thinking') {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
        setCallState('listening');
      } catch (err) {
        console.warn('Could not auto-start recognition:', err);
      }
    }

    return () => {
      isComponentMounted.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, language, isMuted]);

  // Handle user speech submission
  const handleUserSpoke = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    setLastUserSpeech(spokenText);
    setTranscript('');
    setCallState('thinking');

    // Pause recognition while AI thinks & speaks
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    try {
      const response = await sendChatMessage(
        spokenText,
        [],
        false,
        projectInstructions
          ? `${projectInstructions}\nRespond conversationally, concisely, and naturally for real-time speech dialogue.`
          : 'Respond conversationally, warmly, and concisely for live voice dialogue.'
      );

      const aiReply = response.reply || '';
      setLastAiResponse(aiReply);
      setCallState('speaking');

      if (onSaveToChatHistory) {
        onSaveToChatHistory(spokenText, aiReply);
      }

      // Speak AI response
      speakAiResponse(aiReply);
    } catch (err: any) {
      console.error('Live voice query failed:', err);
      const errorMsg =
        language === 'bn'
          ? 'দুঃখিত, উত্তর তৈরিতে সাময়িক সমস্যা হয়েছে। আবার বলুন।'
          : 'Sorry, I encountered an issue. Please try speaking again.';
      setLastAiResponse(errorMsg);
      speakAiResponse(errorMsg);
    }
  };

  // Speak AI response via SpeechSynthesis
  const speakAiResponse = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      setCallState('listening');
      restartListening();
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown symbols for natural speech
    const cleanSpeech = textToSpeak
      .replace(/[*#_`>~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .slice(0, 1000); // safety length for conversational turn

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setCallState('listening');
      restartListening();
    };

    utterance.onerror = () => {
      setCallState('listening');
      restartListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  const restartListening = () => {
    if (!recognitionRef.current || isMuted) return;
    try {
      recognitionRef.current.lang = language === 'bn' ? 'bn-BD' : 'en-US';
      recognitionRef.current.start();
    } catch (e) {}
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      restartListening();
    } else {
      setIsMuted(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  };

  const handleEndCall = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col items-center py-8 px-6 text-center">
        {/* Glow ambient background aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top header */}
        <div className="w-full flex items-center justify-between z-10 mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              Live Voice Call
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-mono">
              {formatTime(callDuration)}
            </span>
            <button
              onClick={() => onLanguageChange(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-teal-300 font-medium transition-colors"
              title="Switch language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
            </button>
            <button
              onClick={handleEndCall}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Audio Visualizer */}
        <div className="my-6 relative flex flex-col items-center justify-center">
          {/* Animated concentric rings */}
          <div
            className={`w-44 h-44 rounded-full flex items-center justify-center transition-all duration-500 ${
              callState === 'speaking'
                ? 'bg-teal-500/20 ring-4 ring-teal-500/40 animate-pulse shadow-2xl shadow-teal-500/30'
                : callState === 'listening'
                ? 'bg-emerald-500/15 ring-2 ring-emerald-500/30'
                : callState === 'thinking'
                ? 'bg-amber-500/15 ring-2 ring-amber-500/30'
                : 'bg-zinc-800/40'
            }`}
          >
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-transform duration-300 ${
                callState === 'speaking'
                  ? 'scale-110 bg-gradient-to-tr from-teal-500 to-emerald-400'
                  : 'bg-gradient-to-tr from-teal-600 to-emerald-600'
              } text-zinc-950 font-black text-4xl shadow-xl`}
            >
              N
            </div>
          </div>

          {/* Dynamic Audio Wave Bars */}
          <div className="flex items-center gap-1.5 mt-8 h-10">
            {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 60, 80, 50].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  callState === 'speaking'
                    ? 'bg-teal-400 animate-pulse'
                    : callState === 'listening'
                    ? 'bg-emerald-400'
                    : callState === 'thinking'
                    ? 'bg-amber-400 animate-bounce'
                    : 'bg-zinc-700'
                }`}
                style={{
                  height:
                    callState === 'speaking' || (callState === 'listening' && transcript)
                      ? `${Math.max(12, Math.floor((h * (i % 2 === 0 ? 0.9 : 1.2))))}%`
                      : '8px',
                }}
              />
            ))}
          </div>

          {/* Current Status Label */}
          <p className="mt-4 text-sm font-semibold tracking-wide text-zinc-200">
            {callState === 'listening' && (language === 'bn' ? '🎙️ শুনছি... এখন কথা বলুন' : '🎙️ Listening... speak now')}
            {callState === 'thinking' && (language === 'bn' ? '⚡ চিন্তা করছি...' : '⚡ Thinking...')}
            {callState === 'speaking' && (language === 'bn' ? '🔊 নাসির এআই উত্তর দিচ্ছে...' : '🔊 Nasir AI is speaking...')}
            {callState === 'idle' && (language === 'bn' ? 'কথা বলার জন্য প্রস্তুত' : 'Ready to talk')}
          </p>

          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            {language === 'bn'
              ? 'পৃথিবীর যেকোনো বিষয় নিয়ে প্রশ্ন করুন—বিজ্ঞান, ইতিহাস, গণিত, কোডিং বা ক্যারিয়ার।'
              : 'Ask anything in the world—science, world history, mathematics, coding, or career guidance.'}
          </p>
        </div>

        {/* Live Conversation Transcript Display */}
        {showTranscript && (
          <div className="w-full bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 my-2 text-left max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 space-y-2">
            {transcript && (
              <div className="text-xs text-emerald-300 font-medium flex items-start gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 shrink-0">
                  You
                </span>
                <span className="italic leading-relaxed">{transcript}...</span>
              </div>
            )}
            {lastUserSpeech && !transcript && (
              <div className="text-xs text-zinc-200 flex items-start gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                  You
                </span>
                <span className="leading-relaxed">{lastUserSpeech}</span>
              </div>
            )}
            {lastAiResponse && (
              <div className="text-xs text-teal-200 flex items-start gap-2 pt-1 border-t border-zinc-800/60">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 shrink-0">
                  Nasir AI
                </span>
                <span className="leading-relaxed">{lastAiResponse}</span>
              </div>
            )}
            {!transcript && !lastUserSpeech && !lastAiResponse && (
              <div className="text-center text-xs text-zinc-400 py-2">
                {language === 'bn'
                  ? 'কথা বলা শুরু করুন, স্বয়ংক্রিয়ভাবে উত্তর দেওয়া হবে।'
                  : 'Start speaking naturally. Nasir AI will listen and reply.'}
              </div>
            )}
          </div>
        )}

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-4 mt-4 z-10">
          {/* Mute Mic */}
          <button
            onClick={handleToggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5 fill-current" />
            <span>{language === 'bn' ? 'কল সমাপ্ত' : 'End Call'}</span>
          </button>

          {/* Toggle Transcript View */}
          <button
            onClick={() => setShowTranscript((prev) => !prev)}
            className={`p-4 rounded-full transition-all ${
              showTranscript
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700/60'
            }`}
            title="Toggle Live Transcript"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 mt-5">
          {language === 'bn'
            ? 'লাইভ ভয়েস ইঞ্জিন • হ্যান্ডস-ফ্রি সরাসরি কথা বলার অভিজ্ঞতা'
            : 'Live Voice Engine • Full hands-free conversation with Nasir AI'}
        </p>
      </div>
    </div>
  );
};
