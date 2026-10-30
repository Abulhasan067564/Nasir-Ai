/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Conversation,
  Message,
  Project,
  SavedNote,
  UserProfile,
  Language,
  Theme,
} from './lib/types';
import {
  auth,
  subscribeToAuth,
  signInWithGoogle,
  signOutUser,
  getConversations,
  saveConversation,
  deleteConversation as deleteConversationDb,
  getMessages,
  saveMessage,
  getProjects,
  saveProject,
  deleteProject as deleteProjectDb,
  getSavedNotes,
  saveNote,
  deleteNote as deleteNoteDb,
  testConnection,
} from './lib/firebase';
import { streamChatMessage } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ToolsWorkspace } from './components/ToolsWorkspace';
import { ProjectsWorkspace } from './components/ProjectsWorkspace';
import { NotesWorkspace } from './components/NotesWorkspace';
import { SettingsModal } from './components/SettingsModal';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { AuthModal } from './components/AuthModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import {
  AdminSettings,
  DEFAULT_ADMIN_SETTINGS,
  getAdminSettings,
  ADMIN_SETTINGS_CHANGE_EVENT,
} from './lib/adminSettings';

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('nasir_ai_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'chat' | 'tools' | 'projects' | 'notes'>('chat');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync theme with document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('nasir_ai_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // User state
  const [user, setUser] = useState<UserProfile | null>(null);

  // Data states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Generating & Abort control
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Initialize Auth and verify Firestore connection on mount
  useEffect(() => {
    testConnection().then((ok) => {
      console.log('Nasir AI Firestore connection ready:', ok);
    });

    // Load dynamic site and admin configuration
    getAdminSettings().then((loaded) => {
      setAdminSettings(loaded);
      if (loaded.siteName) {
        document.title = `${loaded.siteName} — Advanced Full-Stack AI Assistant`;
      }
    });

    const handleSettingsChange = (e: any) => {
      if (e.detail) {
        setAdminSettings(e.detail);
        if (e.detail.siteName) {
          document.title = `${e.detail.siteName} — Advanced Full-Stack AI Assistant`;
        }
      }
    };
    window.addEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleSettingsChange);

    const unsubscribe = subscribeToAuth((authedUser) => {
      if (authedUser) {
        setUser(authedUser);
      } else {
        // Fallback persistent guest user for smooth experience
        let guestUid = localStorage.getItem('nasir_ai_guest_uid');
        if (!guestUid) {
          guestUid = `guest_${Math.random().toString(36).substring(2, 10)}`;
          localStorage.setItem('nasir_ai_guest_uid', guestUid);
        }
        setUser({
          uid: guestUid,
          email: 'guest@nasirai.app',
          displayName: 'Guest User',
          isAnonymous: true,
        });
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleSettingsChange);
    };
  }, []);

  // 2. Load user's conversations, projects, and saved notes when user is identified
  useEffect(() => {
    if (!user) return;

    // Load conversations
    getConversations(user.uid)
      .then((convs) => {
        setConversations(convs);
        if (convs.length > 0 && !activeConversationId) {
          setActiveConversationId(convs[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not load conversations from Firestore:', err);
      });

    // Load projects
    getProjects(user.uid)
      .then((projs) => setProjects(projs))
      .catch((err) => console.warn('Could not load projects:', err));

    // Load notes
    getSavedNotes(user.uid)
      .then((notes) => setSavedNotes(notes))
      .catch((err) => console.warn('Could not load notes:', err));
  }, [user]);

  // 3. Load messages when active conversation changes
  useEffect(() => {
    if (!user || !activeConversationId) {
      setMessages([]);
      return;
    }

    getMessages(activeConversationId, user.uid)
      .then((loadedMsgs) => {
        setMessages(loadedMsgs);
      })
      .catch((err) => {
        console.warn('Could not load messages:', err);
      });
  }, [activeConversationId, user]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const activeProject = projects.find((p) => p.id === (activeConversation?.projectId || activeProjectId)) || null;

  // New Chat Action
  const handleNewChat = (targetProjectId?: string) => {
    setActiveConversationId(null);
    setMessages([]);
    if (targetProjectId) {
      setActiveProjectId(targetProjectId);
    }
    setCurrentTab('chat');
  };

  // Select Conversation
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setCurrentTab('chat');
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string) => {
    if (!user) return;
    try {
      await deleteConversationDb(id, user.uid);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  // Rename Conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    const convo = conversations.find((c) => c.id === id);
    if (!convo) return;

    const updated = { ...convo, title: newTitle, updatedAt: new Date().toISOString() };
    try {
      await saveConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      console.error('Failed to rename conversation:', e);
    }
  };

  // Toggle Pin Conversation
  const handleTogglePinConversation = async (id: string) => {
    const convo = conversations.find((c) => c.id === id);
    if (!convo) return;

    const updated = { ...convo, pinned: !convo.pinned, updatedAt: new Date().toISOString() };
    try {
      await saveConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      console.error('Failed to pin conversation:', e);
    }
  };

  // Link Conversation to Project
  const handleLinkProject = async (projectId: string | undefined) => {
    if (!activeConversation) return;

    const updated = { ...activeConversation, projectId, updatedAt: new Date().toISOString() };
    try {
      await saveConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e) {
      console.error('Failed to link project:', e);
    }
  };

  // Send Message Flow
  const handleSendMessage = async (text: string, useSearch = false, fileContext?: string) => {
    if (!user || isGenerating) return;

    const now = new Date().toISOString();
    let currentConvoId = activeConversationId;

    // Create new conversation if none active
    if (!currentConvoId) {
      const generatedTitle = text.slice(0, 45).replace(/\n/g, ' ') || 'New Chat';
      const newConvo: Conversation = {
        id: `convo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.uid,
        title: generatedTitle,
        ...(activeProjectId ? { projectId: activeProjectId } : {}),
        pinned: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await saveConversation(newConvo);
        setConversations((prev) => [newConvo, ...prev]);
        setActiveConversationId(newConvo.id);
        currentConvoId = newConvo.id;
      } catch (err) {
        console.error('Failed to create conversation in Firestore:', err);
        currentConvoId = newConvo.id;
      }
    }

    // Build user message content (with file context if attached)
    const promptToSend = fileContext ? `${fileContext}\n\n${text}` : text;
    const userMessage: Message = {
      id: `msg_u_${Date.now()}`,
      conversationId: currentConvoId,
      userId: user.uid,
      role: 'user',
      content: promptToSend,
      createdAt: now,
    };

    // Save user message to state & DB
    setMessages((prev) => [...prev, userMessage]);
    saveMessage(userMessage).catch((e) => console.warn('Could not save user message:', e));

    // Prepare assistant message placeholder for streaming
    const assistantMessageId = `msg_a_${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      conversationId: currentConvoId,
      userId: user.uid,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      searchGrounded: useSearch,
    };

    setMessages((prev) => [...prev, assistantPlaceholder]);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Context history for the model
    const historyPayload = [...messages, userMessage].map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Project instructions if active
    const projectInstructions = activeProject?.instructions || '';

    let accumulatedText = '';

    await streamChatMessage(
      promptToSend,
      historyPayload,
      useSearch,
      projectInstructions,
      {
        onToken: (token) => {
          accumulatedText += token;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: accumulatedText } : m))
          );
        },
        onDone: (data) => {
          setIsGenerating(false);
          const finalMsg: Message = {
            id: assistantMessageId,
            conversationId: currentConvoId!,
            userId: user.uid,
            role: 'assistant',
            content: data.fullText || accumulatedText,
            citations: data.citations,
            searchGrounded: data.searchGrounded,
            createdAt: new Date().toISOString(),
          };

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? finalMsg : m))
          );
          saveMessage(finalMsg).catch((e) => console.warn('Could not save assistant message:', e));
        },
        onError: (err) => {
          setIsGenerating(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: `⚠️ Nasir AI Encountered an error: ${err}\nPlease retry or verify your network.`,
                  }
                : m
            )
          );
        },
      },
      abortController.signal
    );
  };

  // Edit previous user message and regenerate from there
  const handleEditAndResubmit = async (messageId: string, newText: string) => {
    const targetIdx = messages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    // Prune messages from target onwards
    const pruned = messages.slice(0, targetIdx);
    setMessages(pruned);

    await handleSendMessage(newText, false);
  };

  // Regenerate last response
  const handleRegenerate = async () => {
    if (messages.length === 0 || isGenerating) return;

    // Find last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove last assistant message
    if (messages[messages.length - 1].role === 'assistant') {
      setMessages((prev) => prev.slice(0, -1));
    }

    await handleSendMessage(lastUserMsg.content, false);
  };

  // Stop Generation
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  // Projects CRUD
  const handleCreateProject = async (title: string, description: string, instructions: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      userId: user.uid,
      title,
      description,
      instructions,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveProject(newProject);
      setProjects((prev) => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const handleUpdateProject = async (id: string, title: string, description: string, instructions: string) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    const updated: Project = {
      ...proj,
      title,
      description,
      instructions,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e) {
      console.error('Failed to update project:', e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!user) return;
    try {
      await deleteProjectDb(id, user.uid);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  const handleStartChatInProject = (projectId: string) => {
    setActiveProjectId(projectId);
    handleNewChat(projectId);
  };

  // Notes CRUD
  const handleSaveToNotes = async (
    title: string,
    content: string,
    folder = 'General',
    tags: string[] = []
  ) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newNote: SavedNote = {
      id: `note_${Date.now()}`,
      userId: user.uid,
      title,
      content,
      folder,
      tags,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveNote(newNote);
      setSavedNotes((prev) => [newNote, ...prev]);
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  };

  const handleUpdateNote = async (
    id: string,
    title: string,
    content: string,
    folder = 'General',
    tags: string[] = []
  ) => {
    const note = savedNotes.find((n) => n.id === id);
    if (!note) return;
    const updated: SavedNote = {
      ...note,
      title,
      content,
      folder,
      tags,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveNote(updated);
      setSavedNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!user) return;
    try {
      await deleteNoteDb(id, user.uid);
      setSavedNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  // Auth actions
  const handleSignIn = () => {
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
  };

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden font-sans antialiased transition-colors duration-200 ${
        theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-zinc-900'
      }`}
    >
      {/* Collapsible Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={() => handleNewChat()}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => setActiveProjectId(id)}
        savedNotes={savedNotes}
        onSelectNote={(id) => {
          setActiveNoteId(id);
          setCurrentTab('notes');
        }}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'bn' : 'en'))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdminPanel={() => setIsAdminOpen(true)}
        siteName={adminSettings.siteName}
        siteTagline={language === 'bn' ? adminSettings.siteTaglineBn : adminSettings.siteTagline}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Workspace Area */}
      <main
        className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-200 ${
          theme === 'dark' ? 'bg-zinc-900/30' : 'bg-slate-100/70'
        }`}
      >
        {currentTab === 'chat' && (
          <ChatWorkspace
            conversation={activeConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onEditAndResubmit={handleEditAndResubmit}
            onRegenerate={handleRegenerate}
            onStopGenerating={handleStopGenerating}
            isGenerating={isGenerating}
            projects={projects}
            activeProject={activeProject}
            onLinkProject={handleLinkProject}
            onSaveToNotes={(title, content) => handleSaveToNotes(title, content)}
            language={language}
            siteName={adminSettings.siteName}
            welcomeHeading={language === 'bn' ? adminSettings.welcomeGreetingBn : adminSettings.welcomeGreetingEn}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            isSidebarCollapsed={isSidebarCollapsed}
            onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onTogglePin={handleTogglePinConversation}
          />
        )}

        {currentTab === 'tools' && (
          <ToolsWorkspace
            onStartChatWithPrompt={(prompt, useSearch) => {
              handleNewChat();
              handleSendMessage(prompt, useSearch);
            }}
            onSaveToNotes={(title, content) => handleSaveToNotes(title, content, 'AI Tools')}
            language={language}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsWorkspace
            projects={projects}
            conversations={conversations}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onStartChatInProject={handleStartChatInProject}
            language={language}
          />
        )}

        {currentTab === 'notes' && (
          <NotesWorkspace
            notes={savedNotes}
            onCreateNote={handleSaveToNotes}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            language={language}
            activeNoteId={activeNoteId}
            onSelectNote={setActiveNoteId}
          />
        )}
      </main>

      {/* Settings & Creator Attribution Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        onLanguageChange={(l) => setLanguage(l)}
        theme={theme}
        onThemeChange={(th) => setTheme(th)}
        onOpenAdminPanel={() => setIsAdminOpen(true)}
      />

      {/* Live Voice Conversation Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        language={language}
        onLanguageChange={(l) => setLanguage(l)}
        projectInstructions={activeProject?.instructions}
        onSaveToChatHistory={async (userText, aiText) => {
          if (!user) return;
          const now = new Date().toISOString();
          let currentConvoId = activeConversationId;
          if (!currentConvoId) {
            const newConvoTitle = userText.slice(0, 45).replace(/\n/g, ' ') || 'Voice Call';
            const newConvo: Conversation = {
              id: `convo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              userId: user.uid,
              title: newConvoTitle,
              ...(activeProjectId ? { projectId: activeProjectId } : {}),
              pinned: false,
              archived: false,
              createdAt: now,
              updatedAt: now,
            };
            try {
              await saveConversation(newConvo);
              setConversations((prev) => [newConvo, ...prev]);
              setActiveConversationId(newConvo.id);
              currentConvoId = newConvo.id;
            } catch (err) {
              console.error('Error saving voice conversation:', err);
              return;
            }
          }

          const userMsg: Message = {
            id: `msg_u_${Date.now()}`,
            conversationId: currentConvoId,
            userId: user.uid,
            role: 'user',
            content: userText,
            createdAt: now,
          };
          const aiMsg: Message = {
            id: `msg_a_${Date.now() + 1}`,
            conversationId: currentConvoId,
            userId: user.uid,
            role: 'assistant',
            content: aiText,
            createdAt: new Date().toISOString(),
          };

          try {
            await saveMessage(userMsg);
            await saveMessage(aiMsg);
            setMessages((prev) => [...prev, userMsg, aiMsg]);
          } catch (err) {
            console.error('Error saving voice messages to conversation:', err);
          }
        }}
      />

      {/* Complete Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
        guestUid={user?.isAnonymous ? user.uid : undefined}
        onSuccess={(profile) => {
          setUser(profile);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Admin Panel Master Console */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        language={language}
        theme={theme}
        conversations={conversations}
        messages={messages}
        savedNotes={savedNotes}
        projects={projects}
        userId={user?.uid}
        onDataRestored={(restored) => {
          if (restored.conversations.length > 0) setConversations(restored.conversations);
          if (restored.messages.length > 0) setMessages(restored.messages);
          if (restored.savedNotes.length > 0) setSavedNotes(restored.savedNotes);
          if (restored.projects.length > 0) setProjects(restored.projects);
        }}
      />
    </div>
  );
}
