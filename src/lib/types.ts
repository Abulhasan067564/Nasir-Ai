export type Language = 'en' | 'bn';
export type Theme = 'dark' | 'light';

export interface Citation {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  searchGrounded?: boolean;
  toolUsed?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  projectId?: string;
  pinned?: boolean;
  archived?: boolean;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  folder?: string;
  tags?: string[];
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolResult {
  id: string;
  userId: string;
  toolId: string;
  prompt: string;
  result: string;
  citations?: Citation[];
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAnonymous?: boolean;
  preferredLanguage?: Language;
}

export interface AIToolDef {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  category: 'research' | 'education' | 'career' | 'development' | 'writing' | 'productivity' | 'creator';
  icon: string;
  useSearch?: boolean;
}
