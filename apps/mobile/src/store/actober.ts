import { create } from 'zustand';
import { Trade, Session, Message } from '@actober/shared-types';

interface ActoberState {
  currentUser: { id: string; deviceId: string; trade: Trade } | null;
  activeSession: Session | null;
  sessions: Session[];
  isLoading: boolean;
  voiceEnabled: boolean;
  cameraEnabled: boolean;
  handsFreeMode: boolean;
  setTrade: (trade: Trade) => void;
  startSession: (session: Session) => void;
  endSession: () => void;
  addMessage: (message: Message) => void;
  toggleVoice: () => void;
  toggleCamera: () => void;
  toggleHandsFree: () => void;
  setUser: (user: { id: string; deviceId: string; trade: Trade }) => void;
  setLoading: (loading: boolean) => void;
}

export const useActoberStore = create<ActoberState>((set) => ({
  currentUser: null,
  activeSession: null,
  sessions: [],
  isLoading: false,
  voiceEnabled: true,
  cameraEnabled: false,
  handsFreeMode: false,
  setTrade: (trade) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, trade } : null,
    })),
  startSession: (session) => set({ activeSession: session }),
  endSession: () => set({ activeSession: null }),
  addMessage: (message) =>
    set((state) => ({
      activeSession: state.activeSession
        ? {
            ...state.activeSession,
            messages: [...(state.activeSession.messages || []), message],
          }
        : null,
    })),
  toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),
  toggleCamera: () => set((state) => ({ cameraEnabled: !state.cameraEnabled })),
  toggleHandsFree: () => set((state) => ({ handsFreeMode: !state.handsFreeMode })),
  setUser: (user) => set({ currentUser: user }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
