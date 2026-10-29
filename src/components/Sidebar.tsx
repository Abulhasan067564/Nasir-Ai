import React, { useState } from 'react';
import {
  MessageSquare,
  Wrench,
  FolderKanban,
  BookmarkCheck,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Globe,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Radio,
  Sun,
  Moon,
} from 'lucide-react';
import { Conversation, Project, SavedNote, UserProfile, Language, Theme } from '../lib/types';
import { translations } from '../lib/translations';

interface SidebarProps {
  currentTab: 'chat' | 'tools' | 'projects' | 'notes';
  setCurrentTab: (tab: 'chat' | 'tools' | 'projects' | 'notes') => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  savedNotes: SavedNote[];
  onSelectNote?: (id: string) => void;
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  language: Language;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenLiveVoice: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  projects,
  activeProjectId,
  onSelectProject,
  savedNotes,
  onSelectNote,
  user,
  onSignIn,
  onSignOut,
  language,
  onToggleLanguage,
  onOpenSettings,
  isCollapsed,
  onToggleCollapse,
  onOpenLiveVoice,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'chats' | 'notes'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (activeProjectId && c.projectId !== activeProjectId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchPreview = c.lastMessagePreview?.toLowerCase().includes(q);
      return matchTitle || matchPreview;
    }
    return true;
  });

  // Filter saved notes
  const filteredNotes = savedNotes.filter((n) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchFolder = n.folder?.toLowerCase().includes(q);
      const matchTags = n.tags?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchContent || matchFolder || matchTags;
    }
    return true;
  });

  const pinnedConversations = filteredConversations.filter((c) => c.pinned);
  const recentConversations = filteredConversations.filter((c) => !c.pinned);

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const executeDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setDeleteConfirmId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  if (isCollapsed) {
    return (
      <aside
        className={`h-full border-r w-16 flex flex-col items-center py-4 justify-between transition-colors duration-200 z-30 select-none ${
          isDark ? 'bg-zinc-950 border-zinc-800/80 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
        }`}
      >
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={onToggleCollapse}
            className={`p-2.5 rounded-xl transition-colors ${
              isDark ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
            }`}
            title="Expand Sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={onNewChat}
            className="p-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
            title={t.newChat}
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenLiveVoice}
            className={`p-2.5 rounded-xl border transition-all relative group ${
              isDark
                ? 'bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border-teal-500/40'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-300'
            }`}
            title={language === 'bn' ? 'সরাসরি লাইভ ভয়েস কল' : 'Live Voice Call with Nasir AI'}
          >
            <Radio className="w-5 h-5 text-teal-500 group-hover:animate-pulse" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </button>

          <div className={`w-8 h-px my-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          <button
            onClick={() => setCurrentTab('chat')}
            className={`p-2.5 rounded-xl transition-colors ${
              currentTab === 'chat'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400'
                  : 'bg-teal-50 text-teal-600 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Chat Workspace"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCurrentTab('tools')}
            className={`p-2.5 rounded-xl transition-colors relative ${
              currentTab === 'tools'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400'
                  : 'bg-teal-50 text-teal-600 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title={t.tools}
          >
            <Wrench className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400" />
          </button>

          <button
            onClick={() => setCurrentTab('projects')}
            className={`p-2.5 rounded-xl transition-colors ${
              currentTab === 'projects'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400'
                  : 'bg-teal-50 text-teal-600 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title={t.projects}
          >
            <FolderKanban className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCurrentTab('notes')}
            className={`p-2.5 rounded-xl transition-colors ${
              currentTab === 'notes'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400'
                  : 'bg-teal-50 text-teal-600 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title={t.savedNotes}
          >
            <BookmarkCheck className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          {/* User Profile / Auth in Collapsed Mode */}
          <button
            onClick={user && !user.isAnonymous ? onOpenSettings : onSignIn}
            className={`w-8 h-8 rounded-full overflow-hidden border transition-colors flex items-center justify-center font-bold text-xs ${
              isDark ? 'border-zinc-700 hover:border-teal-400' : 'border-zinc-300 hover:border-teal-500'
            }`}
            title={user && !user.isAnonymous ? user.displayName : (language === 'bn' ? 'লগইন করুন' : 'Sign In')}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-zinc-950 flex items-center justify-center font-bold">
                {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'N'}
              </span>
            )}
          </button>

          {/* Theme Switcher in Collapsed Mode */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-amber-400 hover:bg-zinc-900' : 'text-indigo-600 hover:bg-zinc-100'
              }`}
              title={isDark ? t.lightMode : t.darkMode}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onToggleLanguage}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Toggle English / বাংলা"
          >
            {language === 'en' ? 'বাং' : 'EN'}
          </button>

          <button
            onClick={onOpenSettings}
            className={`p-2.5 rounded-xl transition-colors ${
              isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title={t.settings}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`h-full border-r w-72 md:w-80 flex flex-col justify-between transition-colors duration-200 select-none z-30 ${
        isDark ? 'bg-zinc-950 border-zinc-800/80 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
      }`}
    >
      {/* Top Header & Branding */}
      <div className={`flex flex-col p-4 border-b ${isDark ? 'border-zinc-900' : 'border-zinc-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-zinc-950 shadow-md shadow-teal-500/20 font-extrabold text-lg">
              N
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold tracking-wide text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Nasir AI
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  v1.0
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                By Nasir • Powered by Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Chat */}
        <button
          onClick={onNewChat}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 font-bold text-sm shadow-md shadow-teal-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.newChat}</span>
        </button>

        {/* Action: Live Voice Call */}
        <button
          onClick={onOpenLiveVoice}
          className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-950/60 to-emerald-950/40 hover:from-teal-900/70 hover:to-emerald-900/50 border border-teal-500/40 text-teal-300 font-semibold text-xs shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] group"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Radio className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          <span className="font-semibold tracking-wide">
            {language === 'bn' ? 'সরাসরি লাইভ ভয়েস কল' : 'Live Voice Call'}
          </span>
        </button>

        {/* Search Chats & Notes */}
        <div className="relative mt-3">
          <Search
            className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              searchQuery ? 'text-teal-400' : isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          />
          <input
            type="text"
            placeholder={t.searchPlaceholder || t.searchChats}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition-all border ${
              isDark
                ? 'bg-zinc-900 border-zinc-800/80 text-zinc-100 placeholder-zinc-500'
                : 'bg-zinc-100/80 border-zinc-300/80 text-zinc-900 placeholder-zinc-400'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title={t.clearSearch}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Category Filter Pills when query is active */}
        {searchQuery.trim() && (
          <div className={`flex items-center gap-1.5 mt-2.5 pt-2 border-t animate-in fade-in duration-150 ${
            isDark ? 'border-zinc-900' : 'border-zinc-200'
          }`}>
            <button
              type="button"
              onClick={() => setSearchFilter('all')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                searchFilter === 'all'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-sm'
                  : isDark
                  ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200'
              }`}
            >
              {t.searchAll} ({filteredConversations.length + filteredNotes.length})
            </button>
            <button
              type="button"
              onClick={() => setSearchFilter('chats')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                searchFilter === 'chats'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-sm'
                  : isDark
                  ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200'
              }`}
            >
              {t.searchChatsTab} ({filteredConversations.length})
            </button>
            <button
              type="button"
              onClick={() => setSearchFilter('notes')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                searchFilter === 'notes'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-sm'
                  : isDark
                  ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200'
              }`}
            >
              {t.searchNotesTab} ({filteredNotes.length})
            </button>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs (shown when not searching) */}
      {!searchQuery.trim() && (
        <div className={`px-3 pt-3 pb-2 grid grid-cols-4 gap-1 border-b text-xs ${
          isDark ? 'border-zinc-900' : 'border-zinc-200'
        }`}>
          <button
            onClick={() => setCurrentTab('chat')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
              currentTab === 'chat'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400 font-semibold shadow-sm'
                  : 'bg-teal-50 text-teal-700 font-semibold border border-teal-200 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px]">Chat</span>
          </button>
          <button
            onClick={() => setCurrentTab('tools')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors relative ${
              currentTab === 'tools'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400 font-semibold shadow-sm'
                  : 'bg-teal-50 text-teal-700 font-semibold border border-teal-200 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span className="text-[10px]">{t.tools}</span>
            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-teal-400" />
          </button>
          <button
            onClick={() => setCurrentTab('projects')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
              currentTab === 'projects'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400 font-semibold shadow-sm'
                  : 'bg-teal-50 text-teal-700 font-semibold border border-teal-200 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span className="text-[10px]">{t.projects}</span>
          </button>
          <button
            onClick={() => setCurrentTab('notes')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
              currentTab === 'notes'
                ? isDark
                  ? 'bg-zinc-800 text-teal-400 font-semibold shadow-sm'
                  : 'bg-teal-50 text-teal-700 font-semibold border border-teal-200 shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span className="text-[10px]">Notes</span>
          </button>
        </div>
      )}

      {/* Projects filter indicator if active */}
      {!searchQuery.trim() && activeProjectId && (
        <div className="mx-3 my-2 px-2.5 py-1.5 rounded-lg bg-teal-950/40 border border-teal-800/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-teal-300 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Project: {projects.find((p) => p.id === activeProjectId)?.title || 'Active'}
            </span>
          </div>
          <button
            onClick={() => onSelectProject(null)}
            className="text-zinc-400 hover:text-white ml-1"
            title="Clear project filter"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Content Area: Search Results or Default Chat History */}
      {searchQuery.trim() ? (
        /* Unified Search Results View */
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* Matched Conversations */}
          {(searchFilter === 'all' || searchFilter === 'chats') && filteredConversations.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5 text-teal-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.chatsMatched}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {filteredConversations.length}
                </span>
              </div>
              <div className="space-y-1">
                {filteredConversations.map((convo) => renderConversationItem(convo))}
              </div>
            </div>
          )}

          {/* Matched Saved Notes */}
          {(searchFilter === 'all' || searchFilter === 'notes') && filteredNotes.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{t.notesMatched}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {filteredNotes.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      if (onSelectNote) {
                        onSelectNote(note.id);
                      }
                      setCurrentTab('notes');
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/70 hover:border-emerald-500/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-300 truncate">
                          {note.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                        {note.folder || 'General'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {note.content.replace(/[#*`_]/g, '')}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {note.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400 border border-zinc-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty search results */}
          {filteredConversations.length === 0 && filteredNotes.length === 0 && (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
                <Search className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  {t.noSearchResults}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px] mx-auto italic truncate">
                  "{searchQuery}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearSearch}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Regular Chat History List */
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* Pinned section */}
          {pinnedConversations.length > 0 && (
            <div>
              <div className="flex items-center gap-1 px-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                <Pin className="w-3 h-3 text-teal-400" />
                <span>{t.pinnedChats}</span>
              </div>
              <div className="space-y-1">
                {pinnedConversations.map((convo) => renderConversationItem(convo))}
              </div>
            </div>
          )}

          {/* Recent section */}
          <div>
            <div className="px-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              {t.recentChats}
            </div>
            {recentConversations.length === 0 && pinnedConversations.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-zinc-400">
                <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2 stroke-[1.5]" />
                <p>{t.noChats}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentConversations.map((convo) => renderConversationItem(convo))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Profile, Language & Settings Footer */}
      <div className={`p-3 border-t flex flex-col gap-2 transition-colors duration-200 ${
        isDark ? 'border-zinc-900 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-50/90'
      }`}>
        <div className="flex items-center justify-between px-1">
          {/* User profile */}
          <div
            onClick={user?.isAnonymous ? onSignIn : onOpenSettings}
            className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
            title={user?.isAnonymous ? (language === 'bn' ? 'লগইন / সাইন আপ করুন' : 'Sign In / Register') : user?.displayName}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-8 h-8 rounded-full object-cover border border-teal-500/40 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-zinc-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'N'}
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className={`text-xs font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                {user?.displayName || t.guestUser}
              </span>
              <span className={`text-[10px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {user?.isAnonymous
                  ? (language === 'bn' ? 'লগইন করতে ক্লিক করুন' : 'Click to Sign In')
                  : user?.email}
              </span>
            </div>
          </div>

          {/* Sign In / Sign Out */}
          {user && !user.isAnonymous ? (
            <button
              onClick={onSignOut}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-900' : 'text-zinc-500 hover:text-rose-600 hover:bg-zinc-200/60'
              }`}
              title={t.signOut}
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 dark:text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
              title={t.signIn}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'লগইন' : 'Login'}</span>
            </button>
          )}
        </div>

        {/* Secondary buttons */}
        <div className={`flex items-center justify-between pt-1 text-xs border-t ${
          isDark ? 'text-zinc-400 border-zinc-900/60' : 'text-zinc-600 border-zinc-200'
        }`}>
          <button
            onClick={onToggleLanguage}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-900 text-zinc-300 hover:text-white' : 'hover:bg-zinc-200/60 text-zinc-700 hover:text-zinc-900'
            }`}
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-[11px] font-medium">{language === 'en' ? 'বাংলা' : 'English'}</span>
          </button>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                isDark
                  ? 'hover:bg-zinc-900 text-zinc-300 hover:text-white'
                  : 'hover:bg-zinc-200/60 text-zinc-700 hover:text-zinc-900'
              }`}
              title={isDark ? t.lightMode : t.darkMode}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span className="text-[11px] font-medium">
                {isDark ? t.lightMode : t.darkMode}
              </span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-900 text-zinc-300 hover:text-white' : 'hover:bg-zinc-200/60 text-zinc-700 hover:text-zinc-900'
            }`}
            title={t.settings}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px]">{t.settings}</span>
          </button>
        </div>
      </div>
    </aside>
  );

  function renderConversationItem(convo: Conversation) {
    const isActive = convo.id === activeConversationId;
    const isEditing = editingId === convo.id;
    const isDeleting = deleteConfirmId === convo.id;

    if (isEditing) {
      return (
        <div
          key={convo.id}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
            isDark ? 'bg-zinc-800 border-teal-500/50' : 'bg-white border-teal-500 shadow-xs'
          }`}
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className={`flex-1 bg-transparent text-xs focus:outline-none ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
            autoFocus
          />
          <button
            onClick={(e) => saveRename(convo.id, e)}
            className="p-1 text-emerald-500 hover:bg-zinc-700/20 rounded"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancelRename}
            className={`p-1 rounded ${isDark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-200'}`}
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    if (isDeleting) {
      return (
        <div
          key={convo.id}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300"
        >
          <span className="text-[11px] font-medium">Delete chat?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => executeDelete(convo.id, e)}
              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px]"
            >
              Yes
            </button>
            <button
              onClick={cancelDelete}
              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white text-[10px]"
            >
              No
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={convo.id}
        onClick={() => {
          setCurrentTab('chat');
          onSelectConversation(convo.id);
        }}
        className={`group flex items-start justify-between px-2.5 py-2 rounded-xl cursor-pointer text-xs transition-all ${
          isActive && currentTab === 'chat'
            ? isDark
              ? 'bg-zinc-800/90 text-white font-medium shadow-sm border border-zinc-700/60'
              : 'bg-teal-50 text-teal-950 font-semibold border border-teal-200 shadow-xs'
            : isDark
            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
        }`}
      >
        <div className="flex items-start gap-2 truncate mr-1 min-w-0">
          <MessageSquare
            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
              isActive && currentTab === 'chat'
                ? 'text-teal-400'
                : convo.pinned
                ? 'text-amber-400'
                : isDark
                ? 'text-zinc-500'
                : 'text-zinc-400'
            }`}
          />
          <div className="flex flex-col truncate min-w-0">
            <div className="flex items-center gap-1 truncate">
              {convo.pinned && (
                <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0 fill-amber-400/30" />
              )}
              <span className="truncate">{convo.title}</span>
            </div>
            {searchQuery && convo.lastMessagePreview && (
              <span className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {convo.lastMessagePreview}
              </span>
            )}
          </div>
        </div>

        {/* Hover action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePinConversation(convo.id);
            }}
            className={`p-1 rounded transition-colors ${
              convo.pinned
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/60'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
            title={convo.pinned ? t.unpinChat : t.pinChat}
          >
            <Pin className={`w-3 h-3 ${convo.pinned ? 'fill-amber-400/40' : ''}`} />
          </button>
          <button
            onClick={(e) => startRename(convo, e)}
            className={`p-1 rounded transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/60' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => confirmDelete(convo.id, e)}
            className={`p-1 rounded transition-colors ${
              isDark ? 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-700/60' : 'text-zinc-500 hover:text-rose-600 hover:bg-zinc-200/60'
            }`}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
};
