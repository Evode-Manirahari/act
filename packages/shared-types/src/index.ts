export type Trade = 'ELECTRICAL' | 'HVAC' | 'PLUMBING' | 'WELDING';
export type MessageRole = 'USER' | 'ASSISTANT';

export interface User {
  id: string;
  deviceId: string;
  trade: Trade;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  trade: Trade;
  startedAt: string;
  endedAt?: string;
  jobAddress?: string;
  jobNotes?: string;
  summary?: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  imageKey?: string;
  isSafetyAlert: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  imageBase64?: string;
}

export interface ChatResponse {
  message: string;
  isSafetyAlert: boolean;
  sessionId: string;
}
