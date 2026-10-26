import React, { useState } from 'react';
import {
  BookmarkCheck,
  Plus,
  Search,
  Trash2,
  Edit2,
  Copy,
  Check,
  Download,
  Tag,
  Folder,
  FileText,
  X,
  Share2,
} from 'lucide-react';
import { SavedNote, Language } from '../lib/types';
import { translations } from '../lib/translations';
import { MarkdownView } from './MarkdownView';

interface NotesWorkspaceProps {
  notes: SavedNote[];
  onCreateNote: (title: string, content: string, folder?: string, tags?: string[]) => Promise<void>;
  onUpdateNote: (id: string, title: string, content: string, folder?: string, tags?: string[]) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  language: Language;
}

export const NotesWorkspace: React.FC<NotesWorkspaceProps> = ({
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  language,
}) => {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    notes.length > 0 ? notes[0].id : null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFolder, setFormFolder] = useState('General');
  const [formTags, setFormTags] = useState('');

  // Extract unique folders
  const allFolders = ['all', ...Array.from(new Set(notes.map((n) => n.folder || 'General')))];

  const filteredNotes = notes.filter((n) => {
    if (selectedFolder !== 'all' && (n.folder || 'General') !== selectedFolder) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTag = n.tags?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchContent || matchTag;
    }
    return true;
  });

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || filteredNotes[0] || null;

  const startCreate = () => {
    setFormTitle('');
    setFormContent('');
    setFormFolder('General');
    setFormTags('');
    setIsCreating(true);
    setIsEditing(false);
  };

  const startEdit = (note: SavedNote) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormFolder(note.folder || 'General');
    setFormTags((note.tags || []).join(', '));
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isCreating) {
      await onCreateNote(formTitle.trim(), formContent.trim(), formFolder.trim(), tagsArray);
      setIsCreating(false);
    } else if (isEditing && selectedNote) {
      await onUpdateNote(selectedNote.id, formTitle.trim(), formContent.trim(), formFolder.trim(), tagsArray);
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onDeleteNote(id);
    if (selectedNoteId === id) {
      setSelectedNoteId(notes.find((n) => n.id !== id)?.id || null);
    }
  };

  const handleCopyNote = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadNote = () => {
    if (!selectedNote) return;
    const blob = new Blob([`# ${selectedNote.title}\n\n${selectedNote.content}`], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNote.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/40 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <BookmarkCheck className="w-5 h-5 text-teal-400" />
          <h1 className="text-base font-bold text-white">{t.notesTitle}</h1>
        </div>

        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-semibold shadow-md shadow-teal-500/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.newNote}</span>
        </button>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Notes List & Filter */}
        <div className="lg:col-span-4 border-r border-zinc-800/80 overflow-y-auto p-4 space-y-3 bg-zinc-950/60 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search saved notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60"
            />
          </div>

          {/* Folder tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {allFolders.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={`px-2.5 py-1 rounded-lg shrink-0 capitalize transition-colors ${
                  selectedFolder === f
                    ? 'bg-zinc-800 text-teal-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Notes list */}
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
              <FileText className="w-8 h-8 text-zinc-700 mx-auto" />
              <p>{t.noNotes}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredNotes.map((note) => {
                const isSelected = note.id === selectedNote?.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className={`w-full flex flex-col p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-zinc-800/90 border border-teal-500/50 shadow-md'
                        : 'bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs md:text-sm text-zinc-100 truncate mr-2">
                        {note.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {note.content}
                    </p>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {note.tags.slice(0, 3).map((tg, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-teal-400 border border-zinc-800"
                          >
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Note Detail / Editor */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-900/30">
          {isCreating || isEditing ? (
            /* Note Editor Form */
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <h2 className="text-sm font-bold text-white">
                  {isCreating ? t.newNote : 'Edit Saved Note'}
                </h2>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    {t.noteTitle} *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Note title..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      {t.noteFolder}
                    </label>
                    <input
                      type="text"
                      value={formFolder}
                      onChange={(e) => setFormFolder(e.target.value)}
                      placeholder="e.g. Science, Career, Coding..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      {t.noteTags}
                    </label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="react, physics, exam..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    {t.noteContent} *
                  </label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Enter formatted note or response text..."
                    rows={12}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60 font-mono leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs hover:text-white"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formTitle.trim() || !formContent.trim()}
                    className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-semibold shadow-md shadow-teal-500/20"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          ) : selectedNote ? (
            /* Selected Note View */
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-zinc-900">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-teal-400 border border-zinc-800 font-medium">
                      {selectedNote.folder || 'General'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Last edited {new Date(selectedNote.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white mt-1.5">
                    {selectedNote.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyNote}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                    title={t.copy}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadNote}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                    title="Export Markdown"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(selectedNote)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                    title="Edit Note"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedNote.id)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-400 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note Tags */}
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedNote.tags.map((tg, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 rounded-md bg-teal-950/30 text-teal-300 border border-teal-800/40"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}

              {/* Note Content (Rendered Markdown) */}
              <div className="pt-2 text-zinc-100 leading-relaxed">
                <MarkdownView content={selectedNote.content} />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-400 text-xs">
              Select or create a note to view its contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
