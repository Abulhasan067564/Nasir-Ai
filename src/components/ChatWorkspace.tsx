import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Globe,
  Paperclip,
  Mic,
  MicOff,
  Copy,
  Check,
  RotateCcw,
  BookmarkPlus,
  Volume2,
  VolumeX,
  ExternalLink,
  Edit3,
  Download,
  Printer,
  Sparkles,
  Layers,
  ChevronDown,
  FileText,
  X,
  Loader2,
  Menu,
  Radio,
  AlertCircle,
  Pin,
  Sun,
  Moon,
  Database,
} from 'lucide-react';
import { Message, Conversation, Project, Language, Citation, Theme } from '../lib/types';
import { translations } from '../lib/translations';
import { MarkdownView } from './MarkdownView';
import { NasirLogo } from './NasirLogo';
import { exportAllUserData } from '../lib/dataBackup';

interface ChatWorkspaceProps {
  conversation: Conversation | null;
  messages: Message[];
  onSendMessage: (text: string, useSearch: boolean, fileContext?: string) => Promise<void>;
  onEditAndResubmit: (messageId: string, newText: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onStopGenerating: () => void;
  isGenerating: boolean;
  projects: Project[];
  activeProject: Project | null;
  onLinkProject: (projectId: string | undefined) => void;
  onSaveToNotes: (title: string, content: string) => void;
  language: Language;
  siteName?: string;
  welcomeHeading?: string;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenLiveVoice?: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
  onTogglePin?: (id: string) => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  conversation,
  messages,
  onSendMessage,
  onEditAndResubmit,
  onRegenerate,
  onStopGenerating,
  isGenerating,
  projects,
  activeProject,
  onLinkProject,
  onSaveToNotes,
  language,
  siteName = 'Nasir AI',
  welcomeHeading,
  onToggleSidebar,
  isSidebarCollapsed,
  onOpenLiveVoice,
  theme = 'dark',
  onToggleTheme,
  onTogglePin,
}) => {
  const isDark = theme === 'dark';
  const t = translations[language];

  // Composer states
  const [inputText, setInputText] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'bn-BD' | 'en-US'>(language === 'bn' ? 'bn-BD' : 'en-US');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Sync voiceLang when app language changes
  useEffect(() => {
    setVoiceLang(language === 'bn' ? 'bn-BD' : 'en-US');
  }, [language]);

  // Web Speech API Voice Typing Handler
  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        language === 'bn'
          ? 'আপনার ব্রাউজারে ভয়েস টাইপিং সমর্থিত নয়। Google Chrome বা Edge ব্রাউজার ব্যবহার করুন।'
          : 'Voice typing is not supported in this browser. Please use Google Chrome or Edge.'
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLang;

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTrans += chunk;
          } else {
            interim += chunk;
          }
        }

        if (finalTrans) {
          setInputText((prev) => (prev ? `${prev.trim()} ${finalTrans.trim()}` : finalTrans.trim()));
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicError(
            language === 'bn'
              ? 'মাইক্রোফোনের অনুমতি প্রয়োজন। অনুগ্রহ করে ব্রাউজার সেটিংসে মাইক অনুমোদন করুন।'
              : 'Microphone permission denied. Please allow microphone access in your browser settings.'
          );
        } else if (event.error !== 'no-speech') {
          setMicError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition exception:', err);
      setIsListening(false);
      setMicError(err?.message || 'Could not start voice typing');
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !attachedFile) || isGenerating) return;

    let fullMessage = inputText.trim();
    const fileCtx = attachedFile ? `[Attached File: ${attachedFile.name}]\n${attachedFile.content}` : undefined;

    setInputText('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(fullMessage, useSearch, fileCtx);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({
        name: file.name,
        content: content.slice(0, 100000), // safety ceiling
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveNote = (msg: Message) => {
    const title = msg.content.split('\n')[0].replace(/[#*`]/g, '').slice(0, 50) || 'AI Note';
    onSaveToNotes(title, msg.content);
    setSavedNoteId(msg.id);
    setTimeout(() => setSavedNoteId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_]/g, ''));
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Export options
  const exportAsMarkdown = () => {
    let md = `# ${conversation?.title || 'Nasir AI Chat'}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach((m) => {
      md += `### ${m.role === 'user' ? 'User' : 'Nasir AI'}\n\n${m.content}\n\n`;
      if (m.citations && m.citations.length > 0) {
        md += `**Sources:**\n`;
        m.citations.forEach((c) => {
          md += `- [${c.title}](${c.url})\n`;
        });
        md += '\n';
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conversation?.title || 'chat').replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportAsText = () => {
    let text = `${conversation?.title || 'Nasir AI Chat'}\n\n`;
    messages.forEach((m) => {
      text += `[${m.role.toUpperCase()}]:\n${m.content}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conversation?.title || 'chat').replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    window.print();
    setShowExportMenu(false);
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-zinc-900/40 text-zinc-100' : 'bg-slate-50 text-zinc-900'
      }`}
    >
      {/* Workspace Header */}
      <header
        className={`h-14 border-b backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0 transition-colors duration-200 ${
          isDark
            ? 'border-zinc-800/80 bg-zinc-950/80 text-zinc-100'
            : 'border-zinc-200 bg-white/95 text-zinc-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 truncate">
            <span className={`font-semibold text-sm truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {conversation?.title || 'New Conversation'}
            </span>
            {conversation?.pinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                <Pin className="w-2.5 h-2.5 fill-amber-500/40" />
                <span>Pinned</span>
              </span>
            )}
          </div>

          {/* Project selector dropdown */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>•</span>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
            }`}>
              <Layers className="w-3.5 h-3.5 text-teal-500" />
              <select
                value={conversation?.projectId || ''}
                onChange={(e) => onLinkProject(e.target.value || undefined)}
                className={`bg-transparent text-xs focus:outline-none cursor-pointer ${
                  isDark ? 'text-zinc-300' : 'text-zinc-800'
                }`}
              >
                <option value="" className={isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-zinc-500'}>
                  {t.noProject}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className={isDark ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-zinc-800'}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Active Chat Pin / Unpin Button */}
          {conversation && onTogglePin && (
            <button
              onClick={() => onTogglePin(conversation.id)}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                conversation.pinned
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title={conversation.pinned ? t.unpinChat : t.pinChat}
            >
              <Pin className={`w-4 h-4 ${conversation.pinned ? 'fill-amber-400/40 text-amber-400' : ''}`} />
            </button>
          )}

          {/* Theme Switcher in Header */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-400'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-indigo-600'
              }`}
              title={isDark ? t.lightMode : t.darkMode}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Live Voice Call Button */}
          {onOpenLiveVoice && (
            <button
              onClick={onOpenLiveVoice}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isDark
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 border-teal-500/40'
                  : 'bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-teal-800 border-teal-300'
              }`}
              title={language === 'bn' ? 'সরাসরি লাইভ ভয়েস কল শুরু করুন' : 'Start Live Voice Call with Nasir AI'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Radio className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden sm:inline font-semibold">
                {language === 'bn' ? 'লাইভ ভয়েস কল' : 'Live Voice'}
              </span>
            </button>
          )}

          {/* Live Web Search Grounding Toggle */}
          <button
            onClick={() => setUseSearch((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              useSearch
                ? isDark
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/10'
                  : 'bg-teal-50 text-teal-800 border border-teal-300 shadow-xs'
                : isDark
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-300'
            }`}
            title={t.searchGroundingDesc}
          >
            <Globe className={`w-3.5 h-3.5 ${useSearch ? 'text-teal-500 animate-pulse' : ''}`} />
            <span className="hidden md:inline">{t.searchGrounding}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${useSearch ? 'bg-teal-500' : 'bg-zinc-400'}`}
            />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
              title={t.exportChat}
            >
              <Download className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <div className={`absolute right-0 mt-1 w-52 rounded-xl shadow-xl py-1 z-50 text-xs border ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-800'
              }`}>
                <button
                  onClick={exportAsMarkdown}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-teal-500" />
                  <span>{t.exportMarkdown}</span>
                </button>
                <button
                  onClick={exportAsText}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>{t.exportText}</span>
                </button>
                <button
                  onClick={() => {
                    if (conversation) {
                      exportAllUserData([conversation], messages, [], projects);
                    }
                    setShowExportMenu(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>{language === 'bn' ? 'JSON ব্যাকআপ (.json)' : 'Export JSON Backup (.json)'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <Printer className="w-4 h-4 text-zinc-400" />
                  <span>{t.printChat}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Messages Scroll Area */}
      <div className={`flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin ${
        isDark ? 'scrollbar-thumb-zinc-800' : 'scrollbar-thumb-zinc-300'
      }`}>
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="max-w-3xl mx-auto py-8 md:py-16 text-center space-y-6">
            <div className="inline-flex items-center justify-center">
              <NasirLogo size="xl" />
            </div>
            <div>
              <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                {welcomeHeading || t.welcomeHeading}
              </h1>
              <p className={`mt-2 text-sm max-w-lg mx-auto leading-relaxed ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                {t.welcomeSub}
              </p>
            </div>

            {/* Starter Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 text-left">
              {t.starterPrompts.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => onSendMessage(starter.prompt, false)}
                  className={`p-4 rounded-xl border transition-all text-left group ${
                    isDark
                      ? 'bg-zinc-950/70 hover:bg-zinc-900/80 border-zinc-800/80 hover:border-teal-500/40 text-zinc-300'
                      : 'bg-white hover:bg-teal-50/40 border-zinc-200 hover:border-teal-400 shadow-xs text-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-500 dark:text-teal-400 group-hover:text-teal-600 dark:group-hover:text-teal-300">
                    <span>{starter.title}</span>
                    <Sparkles className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className={`mt-1.5 text-xs line-clamp-2 leading-relaxed ${
                    isDark ? 'text-zinc-400 group-hover:text-zinc-200' : 'text-zinc-600 group-hover:text-zinc-900'
                  }`}>
                    {starter.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversation Messages */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isEditing = editingMessageId === message.id;

              if (isUser) {
                return (
                  <div key={message.id} className="flex justify-end group">
                    <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-900/20 text-sm md:text-base leading-relaxed relative">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full bg-teal-700/80 text-white rounded-lg p-2 text-sm focus:outline-none resize-none border border-teal-400"
                            rows={3}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 text-xs rounded bg-teal-800 text-zinc-200 hover:text-white"
                            >
                              {t.cancel}
                            </button>
                            <button
                              onClick={() => {
                                onEditAndResubmit(message.id, editingContent);
                                setEditingMessageId(null);
                              }}
                              className="px-2.5 py-1 text-xs rounded bg-white text-teal-900 font-semibold hover:bg-teal-100"
                            >
                              {t.saveAndSubmit}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <button
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingContent(message.content);
                            }}
                            className="absolute -left-8 top-3 p-1 rounded text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t.editMessage}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              // Assistant message
              return (
                <div key={message.id} className="flex gap-3.5 items-start group">
                  <NasirLogo size="sm" className="mt-1" />
                  <div className="flex-1 overflow-hidden space-y-2">
                    <div className={`rounded-2xl p-4 text-sm md:text-base border shadow-xs transition-colors ${
                      isDark
                        ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-100'
                        : 'bg-white border-zinc-200 text-zinc-900'
                    }`}>
                      <MarkdownView content={message.content} />

                      {/* Error Retry Option */}
                      {message.content.includes('⚠️') && (
                        <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={onRegenerate}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs font-semibold hover:bg-teal-500/30 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'পুনরায় উত্তর তৈরি করুন' : 'Retry Response'}</span>
                          </button>
                        </div>
                      )}

                      {/* Web Grounding Citations */}
                      {message.citations && message.citations.length > 0 && (
                        <div className={`mt-4 pt-3 border-t ${isDark ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-500 dark:text-teal-400 mb-2">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{t.sources}</span>
                            <span className={isDark ? 'text-zinc-500 font-normal' : 'text-zinc-400 font-normal'}>
                              ({message.citations.length} {t.citationsFound})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {message.citations.map((citation, cIdx) => (
                              <a
                                key={cIdx}
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                                  isDark
                                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-teal-300'
                                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 hover:text-teal-700'
                                }`}
                              >
                                <span className="truncate max-w-[200px]">{citation.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className={`flex items-center gap-1 pt-1 opacity-80 group-hover:opacity-100 transition-opacity text-xs ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      <button
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
                        }`}
                        title={t.copy}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">{t.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t.copy}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleSpeak(message.id, message.content)}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
                        }`}
                        title={speakingId === message.id ? 'Stop audio' : t.speak}
                      >
                        {speakingId === message.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
                            <span className="text-teal-500 font-semibold">Playing</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{t.speak}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleSaveNote(message)}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
                        }`}
                        title={t.saveNote}
                      >
                        {savedNoteId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">{t.noteSaved}</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>{t.saveNote}</span>
                          </>
                        )}
                      </button>

                      {messages[messages.length - 1].id === message.id && (
                        <button
                          onClick={onRegenerate}
                          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
                          }`}
                          title={t.regenerate}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t.regenerate}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div className={`flex gap-3.5 items-center text-xs pl-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                <span>Nasir AI is generating...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Area */}
      <div className={`p-4 border-t backdrop-blur-md shrink-0 z-20 transition-colors duration-200 ${
        isDark ? 'bg-zinc-950/90 border-zinc-800/80' : 'bg-white/95 border-zinc-200 shadow-lg'
      }`}>
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Active Voice Typing Recording Banner */}
          {isListening && (
            <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl border shadow-lg text-xs animate-in fade-in duration-200 ${
              isDark
                ? 'bg-gradient-to-r from-teal-950/90 to-emerald-950/90 border-teal-500/50'
                : 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-300'
            }`}>
              <div className="flex items-center gap-2.5 truncate">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="font-semibold text-teal-600 dark:text-teal-300">
                  {language === 'bn' ? 'ভয়েস টাইপিং হচ্ছে...' : 'Listening...'}
                </span>
                {interimTranscript && (
                  <span className={`italic truncate max-w-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    "{interimTranscript}"
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setVoiceLang((prev) => (prev === 'bn-BD' ? 'en-US' : 'bn-BD'))}
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors ${
                    isDark
                      ? 'bg-zinc-900 border-teal-500/30 text-teal-300 hover:text-white'
                      : 'bg-white border-teal-300 text-teal-700 hover:text-teal-900'
                  }`}
                  title="Switch Voice Typing Language"
                >
                  {voiceLang === 'bn-BD' ? 'বাংলা (BD)' : 'English (US)'}
                </button>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 text-[11px] font-semibold transition-colors"
                >
                  {language === 'bn' ? 'সম্পন্ন' : 'Stop'}
                </button>
              </div>
            </div>
          )}

          {/* Microphone Error Alert */}
          {micError && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{micError}</span>
              </div>
              <button
                type="button"
                onClick={() => setMicError(null)}
                className="text-rose-400 hover:text-rose-200 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* File Attachment Pill */}
          {attachedFile && (
            <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${
              isDark
                ? 'bg-zinc-900 border-teal-500/40 text-teal-300'
                : 'bg-teal-50 border-teal-300 text-teal-800'
            }`}>
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{attachedFile.name}</span>
                <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  ({Math.round(attachedFile.content.length / 1024)} KB attached)
                </span>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className={`p-0.5 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Text Input Container */}
          <div className={`relative rounded-2xl border transition-all shadow-md p-2 ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 focus-within:border-teal-500/60 focus-within:ring-1 focus-within:ring-teal-500/30'
              : 'bg-zinc-50/90 border-zinc-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/30'
          }`}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.askAnything}
              rows={1}
              className={`w-full bg-transparent text-sm md:text-base focus:outline-none resize-none px-2 py-1 max-h-48 scrollbar-thin leading-relaxed ${
                isDark
                  ? 'text-zinc-100 placeholder-zinc-500 scrollbar-thumb-zinc-700'
                  : 'text-zinc-900 placeholder-zinc-400 scrollbar-thumb-zinc-300'
              }`}
            />

            {/* Bottom Actions Row */}
            <div className={`flex items-center justify-between pt-2 px-1 border-t ${
              isDark ? 'border-zinc-800/60' : 'border-zinc-200'
            }`}>
              <div className="flex items-center gap-1.5">
                {/* File Attachment Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".txt,.md,.csv,.json,.ts,.js,.py,.html,.css"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl transition-colors ${
                    isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }`}
                  title={t.uploadFile}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Voice Input (Speech-to-Text) Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-xl transition-all ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-500 animate-pulse'
                      : isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }`}
                  title={isListening ? t.listening : t.voiceInput}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Search Grounding Quick Toggle */}
                <button
                  type="button"
                  onClick={() => setUseSearch((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                    useSearch
                      ? isDark
                        ? 'bg-teal-500/20 text-teal-300 font-medium'
                        : 'bg-teal-50 text-teal-800 border border-teal-300 font-medium'
                      : isDark
                      ? 'text-zinc-500 hover:text-zinc-300'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                  title={t.searchGroundingDesc}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>

              {/* Send or Stop Button */}
              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStopGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{t.stopGenerating}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() && !attachedFile}
                  className={`p-2 rounded-xl transition-all ${
                    inputText.trim() || attachedFile
                      ? 'bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold shadow-md shadow-teal-500/20 hover:scale-105 active:scale-95'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  }`}
                  title={t.sendMessage}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className={`text-[11px] text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Nasir AI delivers research-backed answers with Google Search grounding. Verify important facts.
          </p>
        </div>
      </div>
    </div>
  );
};
