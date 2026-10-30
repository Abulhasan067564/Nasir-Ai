import { Conversation, Message, SavedNote, Project } from './types';
import {
  saveConversation,
  saveMessage,
  saveNote,
  saveProject,
} from './firebase';

export interface ExportDataPayload {
  app: string;
  version: string;
  exportedAt: string;
  conversations: Conversation[];
  messages: Message[];
  savedNotes: SavedNote[];
  projects: Project[];
}

export interface ImportResult {
  success: boolean;
  importedCounts: {
    conversations: number;
    messages: number;
    notes: number;
    projects: number;
  };
  restoredData: {
    conversations: Conversation[];
    messages: Message[];
    savedNotes: SavedNote[];
    projects: Project[];
  };
  error?: string;
}

/**
 * Exports all user conversations, messages, saved notes, and workspace projects to a local JSON file.
 */
export function exportAllUserData(
  conversations: Conversation[],
  currentMessages: Message[],
  savedNotes: SavedNote[],
  projects: Project[],
  guestUid?: string
): { success: boolean; filename: string } {
  // Aggregate messages across current active conversation and local cache
  const allMessagesMap = new Map<string, Message>();

  // Add messages currently in state
  for (const msg of currentMessages) {
    allMessagesMap.set(msg.id, msg);
  }

  // Check localStorage for messages of all conversations
  for (const conv of conversations) {
    try {
      const stored = localStorage.getItem(`nasir_ai_msgs_${conv.id}`);
      if (stored) {
        const parsed: Message[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const m of parsed) {
            allMessagesMap.set(m.id, m);
          }
        }
      }
    } catch (e) {
      // Continue gathering
    }
  }

  // Gather any notes in localStorage
  let allNotes = [...savedNotes];
  if (guestUid) {
    try {
      const storedNotes = localStorage.getItem(`nasir_ai_notes_${guestUid}`);
      if (storedNotes) {
        const parsed: SavedNote[] = JSON.parse(storedNotes);
        const existingIds = new Set(allNotes.map((n) => n.id));
        for (const n of parsed) {
          if (!existingIds.has(n.id)) {
            allNotes.push(n);
          }
        }
      }
    } catch {}
  }

  const payload: ExportDataPayload = {
    app: 'Nasir AI',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    conversations,
    messages: Array.from(allMessagesMap.values()),
    savedNotes: allNotes,
    projects,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `nasir_ai_backup_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

/**
 * Imports conversations, messages, notes, and projects from a JSON backup file.
 */
export async function importUserData(
  jsonText: string,
  userId: string
): Promise<ImportResult> {
  try {
    const data = JSON.parse(jsonText);

    // Validate minimum structural requirements
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid JSON format: root must be an object.');
    }

    const importedConvs: Conversation[] = Array.isArray(data.conversations) ? data.conversations : [];
    const importedMsgs: Message[] = Array.isArray(data.messages) ? data.messages : [];
    const importedNotes: SavedNote[] = Array.isArray(data.savedNotes)
      ? data.savedNotes
      : Array.isArray(data.notes)
      ? data.notes
      : [];
    const importedProjects: Project[] = Array.isArray(data.projects) ? data.projects : [];

    const now = new Date().toISOString();

    // 1. Process Conversations
    const processedConvs: Conversation[] = [];
    for (const c of importedConvs) {
      if (!c.id || !c.title) continue;
      const conv: Conversation = {
        id: c.id,
        userId: userId,
        title: c.title,
        projectId: c.projectId || undefined,
        pinned: Boolean(c.pinned),
        archived: Boolean(c.archived),
        lastMessagePreview: c.lastMessagePreview || '',
        createdAt: c.createdAt || now,
        updatedAt: now,
      };
      processedConvs.push(conv);
      // Persist to storage & Firestore in background
      saveConversation(conv).catch((err) => console.warn('Could not save imported conv to DB:', err));
    }

    // 2. Process Messages
    const processedMsgs: Message[] = [];
    const msgsByConv = new Map<string, Message[]>();

    for (const m of importedMsgs) {
      if (!m.id || !m.content || !m.conversationId) continue;
      const msg: Message = {
        id: m.id,
        conversationId: m.conversationId,
        userId: userId,
        role: m.role === 'assistant' || m.role === 'user' ? m.role : 'user',
        content: m.content,
        citations: Array.isArray(m.citations) ? m.citations : undefined,
        searchGrounded: Boolean(m.searchGrounded),
        toolUsed: m.toolUsed || undefined,
        createdAt: m.createdAt || now,
      };
      processedMsgs.push(msg);

      if (!msgsByConv.has(m.conversationId)) {
        msgsByConv.set(m.conversationId, []);
      }
      msgsByConv.get(m.conversationId)!.push(msg);

      // Persist to DB in background
      saveMessage(msg).catch((err) => console.warn('Could not save imported msg to DB:', err));
    }

    // Save grouped messages to localStorage cache for instant access
    for (const [convId, list] of msgsByConv.entries()) {
      try {
        localStorage.setItem(`nasir_ai_msgs_${convId}`, JSON.stringify(list));
      } catch (e) {}
    }

    // 3. Process Saved Notes
    const processedNotes: SavedNote[] = [];
    for (const n of importedNotes) {
      if (!n.id || (!n.title && !n.content)) continue;
      const note: SavedNote = {
        id: n.id,
        userId: userId,
        title: n.title || 'Untitled Note',
        content: n.content || '',
        folder: n.folder || undefined,
        tags: Array.isArray(n.tags) ? n.tags : [],
        projectId: n.projectId || undefined,
        createdAt: n.createdAt || now,
        updatedAt: now,
      };
      processedNotes.push(note);
      saveNote(note).catch((err) => console.warn('Could not save imported note to DB:', err));
    }

    // 4. Process Projects
    const processedProjects: Project[] = [];
    for (const p of importedProjects) {
      if (!p.id || !p.title) continue;
      const proj: Project = {
        id: p.id,
        userId: userId,
        title: p.title,
        description: p.description || '',
        instructions: p.instructions || '',
        createdAt: p.createdAt || now,
        updatedAt: now,
      };
      processedProjects.push(proj);
      saveProject(proj).catch((err) => console.warn('Could not save imported proj to DB:', err));
    }

    return {
      success: true,
      importedCounts: {
        conversations: processedConvs.length,
        messages: processedMsgs.length,
        notes: processedNotes.length,
        projects: processedProjects.length,
      },
      restoredData: {
        conversations: processedConvs,
        messages: processedMsgs,
        savedNotes: processedNotes,
        projects: processedProjects,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      importedCounts: { conversations: 0, messages: 0, notes: 0, projects: 0 },
      restoredData: { conversations: [], messages: [], savedNotes: [], projects: [] },
      error: error?.message || 'Failed to parse backup JSON file.',
    };
  }
}
