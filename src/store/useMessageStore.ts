import { create } from 'zustand';

export type ScreenMessageType = 'above' | 'below' | 'top';

export interface ScreenMessage {
  id: string;
  type: ScreenMessageType;
  text: string;
  expiresAt: number;
}

interface MessageState {
  messages: ScreenMessage[];
  addScreenMessage: (type: ScreenMessageType, text: string, durationMs?: number) => void;
  removeMessage: (id: string) => void;
  removeMessageByType: (type: ScreenMessageType) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  
  addScreenMessage: (type, text, durationMs = 2500) => {
    const id = Math.random().toString(36).substring(2, 9);
    const expiresAt = durationMs === 0 ? Infinity : Date.now() + durationMs;
    
    set((state) => ({
      // Keep only 1 message of each type at a time to prevent overlapping spam
      messages: [
        ...state.messages.filter(m => m.expiresAt > Date.now() && m.type !== type),
        { id, type, text, expiresAt }
      ]
    }));
  },
  
  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter(m => m.id !== id)
    }));
  },
  
  removeMessageByType: (type) => {
    set((state) => ({
      messages: state.messages.filter(m => m.type !== type)
    }));
  }
}));
