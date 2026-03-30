import { create } from 'zustand';
import type { User, Session, Project, Message, ConversationPhase, ProjectSuggestion } from '@actober/shared-types';

interface ActState {
  // User
  user: User | null;
  setUser: (user: User) => void;
  patchUser: (patch: Partial<User>) => void;

  // Active session
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;

  // Messages (optimistic UI + streaming)
  messages: Message[];
  addMessage: (msg: Message) => void;
  setMessages: (msgs: Message[]) => void;
  appendToMessage: (id: string, delta: string) => void;
  replaceMessage: (id: string, msg: Message) => void;

  // Current phase
  phase: ConversationPhase;
  setPhase: (phase: ConversationPhase) => void;

  // Pending suggestions (shown as cards)
  suggestions: ProjectSuggestion[] | null;
  setSuggestions: (s: ProjectSuggestion[] | null) => void;

  // Active project
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;

  // History
  projects: Project[];
  setProjects: (p: Project[]) => void;
  upsertProject: (p: Project) => void;

  // Loading state
  isTyping: boolean;
  setIsTyping: (v: boolean) => void;
}

export const useActStore = create<ActState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  patchUser: (patch) => set((s) => s.user ? { user: { ...s.user, ...patch } } : {}),

  session: null,
  setSession: (session) => set({ session, messages: session.messages ?? [] }),
  clearSession: () => set({ session: null, messages: [], phase: 'DISCOVERY', suggestions: null, activeProject: null }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  appendToMessage: (id, delta) => set((s) => ({
    messages: s.messages.map((m) =>
      m.id === id ? { ...m, content: m.content + delta } : m
    ),
  })),
  replaceMessage: (id, msg) => set((s) => ({
    messages: s.messages.map((m) => m.id === id ? msg : m),
  })),

  phase: 'DISCOVERY',
  setPhase: (phase) => set({ phase }),

  suggestions: null,
  setSuggestions: (suggestions) => set({ suggestions }),

  activeProject: null,
  setActiveProject: (activeProject) => set({ activeProject }),

  projects: [],
  setProjects: (projects) => set({ projects }),
  upsertProject: (p) => set((s) => {
    const idx = s.projects.findIndex(x => x.id === p.id);
    if (idx >= 0) {
      const updated = [...s.projects];
      updated[idx] = p;
      return { projects: updated };
    }
    return { projects: [p, ...s.projects] };
  }),

  isTyping: false,
  setIsTyping: (isTyping) => set({ isTyping }),
}));
