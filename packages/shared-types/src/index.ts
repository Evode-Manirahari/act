export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED';
export type JobDomain = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'HVAC' | 'PAINTING' | 'TILING' | 'GENERAL';
export type ProjectCategory = 'MAKE' | 'IMPROVE' | 'GROW' | 'CREATE';
export type ProjectStatus = 'SUGGESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type MessageRole = 'USER' | 'ASSISTANT';
export type ConversationPhase = 'DISCOVERY' | 'SUGGESTION' | 'COACHING' | 'COMPLETE';

export interface User {
  id: string;
  deviceId: string;
  name?: string;
  experienceLevel: ExperienceLevel;
  domain?: JobDomain;
  subscriptionTier: 'FREE' | 'PLUS';
  subscriptionExpiry?: string;
  projectsThisMonth: number;
  monthResetAt: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  materials: string[];
  timeRequired: number; // minutes
  steps: Step[];
  currentStepIndex: number;
  contextSnapshot: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Step {
  id: string;
  projectId: string;
  order: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  projectId?: string;
  phase: ConversationPhase;
  messages: Message[];
  project?: Project;
  createdAt: string;
}

export interface ProjectSuggestion {
  title: string;
  description: string;
  category: ProjectCategory;
  timeRequired: number; // minutes
  materials: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  whyItFits: string;
  steps: Array<{ title: string; description: string }>;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ChatResponse {
  message: Message;
  phase: ConversationPhase;
  suggestions?: ProjectSuggestion[];
  project?: Project;
}
