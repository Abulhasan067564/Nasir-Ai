import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  Edit2,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { Project, Conversation, Language } from '../lib/types';
import { translations } from '../lib/translations';

interface ProjectsWorkspaceProps {
  projects: Project[];
  conversations: Conversation[];
  onCreateProject: (title: string, description: string, instructions: string) => Promise<void>;
  onUpdateProject: (id: string, title: string, description: string, instructions: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onStartChatInProject: (projectId: string) => void;
  language: Language;
}

export const ProjectsWorkspace: React.FC<ProjectsWorkspaceProps> = ({
  projects,
  conversations,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onStartChatInProject,
  language,
}) => {
  const t = translations[language];

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formInstructions, setFormInstructions] = useState('');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const projectConversations = conversations.filter((c) => c.projectId === selectedProjectId);

  const startCreate = () => {
    setFormTitle('');
    setFormDesc('');
    setFormInstructions('');
    setIsCreating(true);
    setIsEditing(false);
  };

  const startEdit = (p: Project) => {
    setFormTitle(p.title);
    setFormDesc(p.description);
    setFormInstructions(p.instructions);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;

    if (isCreating) {
      await onCreateProject(formTitle.trim(), formDesc.trim(), formInstructions.trim());
      setIsCreating(false);
    } else if (isEditing && selectedProjectId) {
      await onUpdateProject(selectedProjectId, formTitle.trim(), formDesc.trim(), formInstructions.trim());
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onDeleteProject(id);
    setDeleteConfirmId(null);
    if (selectedProjectId === id) {
      setSelectedProjectId(projects.find((p) => p.id !== id)?.id || null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/40 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <FolderKanban className="w-5 h-5 text-teal-400" />
          <h1 className="text-base font-bold text-white">{t.projects}</h1>
        </div>

        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-semibold shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.createProject}</span>
        </button>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Projects List */}
        <div className="lg:col-span-4 border-r border-zinc-800/80 overflow-y-auto p-4 space-y-2 bg-zinc-950/60 scrollbar-thin scrollbar-thumb-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 px-2 uppercase tracking-wider mb-2">
            Workspaces ({projects.length})
          </p>

          {projects.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
              <FolderKanban className="w-10 h-10 text-zinc-700 mx-auto stroke-[1.5]" />
              <p>{t.noProjects}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {projects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                const count = conversations.filter((c) => c.projectId === p.id).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className={`w-full flex items-start justify-between p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-zinc-800/90 border border-teal-500/50 shadow-md shadow-teal-500/5'
                        : 'bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="overflow-hidden mr-2">
                      <div className="font-semibold text-xs md:text-sm text-zinc-100 truncate">
                        {p.title}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                        {p.description || 'No description provided'}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 text-teal-400 shrink-0 font-medium">
                      {count} chats
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Project Details & Editor */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-900/30">
          {isCreating || isEditing ? (
            /* Create / Edit Form */
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>{isCreating ? t.createProject : 'Edit Project Workspace'}</span>
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
                    {t.projectTitle} *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. HSC 2026 Physics Prep, React SaaS Development..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    {t.projectDesc}
                  </label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Brief description of the workspace goal..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    {t.projectInstructions}
                  </label>
                  <p className="text-[11px] text-zinc-400 mb-1.5">
                    Nasir AI will remember these rules in every chat created inside this project.
                  </p>
                  <textarea
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    placeholder="e.g. Always respond in clear Bengali with step-by-step mathematical proofs. Focus on HSC curriculum formulas."
                    rows={5}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60 resize-none leading-relaxed"
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
                    disabled={!formTitle.trim()}
                    className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-semibold shadow-md shadow-teal-500/20"
                  >
                    {t.saveProject}
                  </button>
                </div>
              </div>
            </div>
          ) : selectedProject ? (
            /* Selected Project View */
            <div className="space-y-6">
              {/* Project Card */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedProject.title}</h2>
                    <p className="text-xs md:text-sm text-zinc-400 mt-1">
                      {selectedProject.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(selectedProject)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                      title="Edit project"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(selectedProject.id)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-400 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {deleteConfirmId === selectedProject.id && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between">
                    <span>{t.deleteProjectConfirm}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(selectedProject.id)}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Instructions Preview */}
                {selectedProject.instructions && (
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-1">
                    <span className="font-semibold text-teal-400 uppercase tracking-wider text-[10px]">
                      Project Custom Instructions / Context:
                    </span>
                    <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {selectedProject.instructions}
                    </p>
                  </div>
                )}

                {/* Start Chat In Project Action */}
                <div className="pt-2">
                  <button
                    onClick={() => onStartChatInProject(selectedProject.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 text-xs md:text-sm font-semibold shadow-md shadow-teal-500/20"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Start New Chat in this Project</span>
                  </button>
                </div>
              </div>

              {/* Conversations inside this project */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                  <span>Project Conversations ({projectConversations.length})</span>
                </h3>

                {projectConversations.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-3">
                    No conversations linked yet. Click "Start New Chat in this Project" above.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-900">
                    {projectConversations.map((convo) => (
                      <div
                        key={convo.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="text-zinc-200 truncate">{convo.title}</span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(convo.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-400 text-xs">
              Select or create a project to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
