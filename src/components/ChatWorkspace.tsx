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
} from 'lucide-react';
import { Message, Conversation, Project, Language, Citation } from '../lib/types';
import { translations } from '../lib/translations';
import { MarkdownView } from './MarkdownView';

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
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenLiveVoice?: () => void;
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
  onToggleSidebar,
  isSidebarCollapsed,
  onOpenLiveVoice,
}) => {
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
    <div className="flex-1 flex flex-col h-full bg-zinc-900/40 relative overflow-hidden">
      {/* Workspace Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-sm text-zinc-100 truncate">
              {conversation?.title || 'New Conversation'}
            </span>
          </div>

          {/* Project selector dropdown */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500">•</span>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={conversation?.projectId || ''}
                onChange={(e) => onLinkProject(e.target.value || undefined)}
                className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-zinc-900 text-zinc-400">
                  {t.noProject}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Live Voice Call Button */}
          {onOpenLiveVoice && (
            <button
              onClick={onOpenLiveVoice}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 border border-teal-500/40 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              title={language === 'bn' ? 'সরাসরি লাইভ ভয়েস কল শুরু করুন' : 'Start Live Voice Call with Nasir AI'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Radio className="w-3.5 h-3.5 text-teal-400" />
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
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/10'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60'
            }`}
            title={t.searchGroundingDesc}
          >
            <Globe className={`w-3.5 h-3.5 ${useSearch ? 'text-teal-400 animate-pulse' : ''}`} />
            <span className="hidden md:inline">{t.searchGrounding}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${useSearch ? 'bg-teal-400' : 'bg-zinc-500'}`}
            />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title={t.exportChat}
            >
              <Download className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={exportAsMarkdown}
                  className="flex items-center gap-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 text-left"
                >
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>{t.exportMarkdown}</span>
                </button>
                <button
                  onClick={exportAsText}
                  className="flex items-center gap-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 text-left"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{t.exportText}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 text-left"
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
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="max-w-3xl mx-auto py-8 md:py-16 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-zinc-950 shadow-xl shadow-teal-500/20 font-black text-3xl">
              N
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {t.welcomeHeading}
              </h1>
              <p className="mt-2 text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
                {t.welcomeSub}
              </p>
            </div>

            {/* Starter Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 text-left">
              {t.starterPrompts.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => onSendMessage(starter.prompt, false)}
                  className="p-4 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-teal-500/40 transition-all text-left group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                    <span>{starter.title}</span>
                    <Sparkles className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-400 group-hover:text-zinc-200 line-clamp-2 leading-relaxed">
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
                    <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 bg-teal-600/90 text-white shadow-md shadow-teal-900/20 text-sm md:text-base leading-relaxed relative">
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
                            className="absolute -left-8 top-3 p-1 rounded text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-bold text-sm shrink-0 shadow-md shadow-teal-500/20 mt-1">
                    N
                  </div>
                  <div className="flex-1 overflow-hidden space-y-2">
                    <div className="rounded-2xl p-4 bg-zinc-950/80 border border-zinc-800/80 text-zinc-100 text-sm md:text-base shadow-sm">
                      <MarkdownView content={message.content} />

                      {/* Error Retry Option */}
                      {message.content.includes('⚠️') && (
                        <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={onRegenerate}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-semibold hover:bg-teal-500/30 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'পুনরায় উত্তর তৈরি করুন' : 'Retry Response'}</span>
                          </button>
                        </div>
                      )}

                      {/* Web Grounding Citations */}
                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-zinc-800/80">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 mb-2">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{t.sources}</span>
                            <span className="text-zinc-500 font-normal">
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
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-teal-300 transition-colors"
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
                    <div className="flex items-center gap-1 pt-1 opacity-80 group-hover:opacity-100 transition-opacity text-xs text-zinc-400">
                      <button
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                        title={t.copy}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{t.copied}</span>
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
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                        title={speakingId === message.id ? 'Stop audio' : t.speak}
                      >
                        {speakingId === message.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                            <span className="text-teal-400">Playing</span>
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
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                        title={t.saveNote}
                      >
                        {savedNoteId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{t.noteSaved}</span>
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
                          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
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
              <div className="flex gap-3.5 items-center text-xs text-zinc-400 pl-1">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                <span>Nasir AI is generating...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Area */}
      <div className="p-4 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-md shrink-0 z-20">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Active Voice Typing Recording Banner */}
          {isListening && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-950/90 to-emerald-950/90 border border-teal-500/50 shadow-lg text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 truncate">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="font-semibold text-teal-300">
                  {language === 'bn' ? 'ভয়েস টাইপিং হচ্ছে...' : 'Listening...'}
                </span>
                {interimTranscript && (
                  <span className="text-zinc-300 italic truncate max-w-xs">
                    "{interimTranscript}"
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setVoiceLang((prev) => (prev === 'bn-BD' ? 'en-US' : 'bn-BD'))}
                  className="px-2 py-0.5 rounded-md bg-zinc-900 border border-teal-500/30 text-[10px] font-bold text-teal-300 hover:text-white transition-colors"
                  title="Switch Voice Typing Language"
                >
                  {voiceLang === 'bn-BD' ? 'বাংলা (BD)' : 'English (US)'}
                </button>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11px] font-semibold transition-colors"
                >
                  {language === 'bn' ? 'সম্পন্ন' : 'Stop'}
                </button>
              </div>
            </div>
          )}

          {/* Microphone Error Alert */}
          {micError && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-150">
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
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900 border border-teal-500/40 text-xs text-teal-300">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{attachedFile.name}</span>
                <span className="text-zinc-500 text-[10px]">
                  ({Math.round(attachedFile.content.length / 1024)} KB attached)
                </span>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Text Input Container */}
          <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 focus-within:border-teal-500/60 focus-within:ring-1 focus-within:ring-teal-500/30 transition-all shadow-lg p-2">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.askAnything}
              rows={1}
              className="w-full bg-transparent text-sm md:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none px-2 py-1 max-h-48 scrollbar-thin scrollbar-thumb-zinc-700 leading-relaxed"
            />

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2 px-1 border-t border-zinc-800/60">
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
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
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
                      ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
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
                      ? 'bg-teal-500/20 text-teal-300 font-medium'
                      : 'text-zinc-500 hover:text-zinc-300'
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
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                  title={t.sendMessage}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 text-center">
            Nasir AI delivers research-backed answers with Google Search grounding. Verify important facts.
          </p>
        </div>
      </div>
    </div>
  );
};
