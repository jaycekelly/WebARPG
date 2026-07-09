import { create } from 'zustand';
import { globalMouseX, globalMouseY } from '../components/GlobalTooltip';

export type ScreenMessageType = 'above' | 'below' | 'top' | 'mouse';

export interface ScreenMessage {
  id: string;
  type: ScreenMessageType;
  text: string;
  expiresAt: number;
  x?: number;
  y?: number;
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
    
    // For mouse messages, capture the current global mouse coordinates
    let x = undefined;
    let y = undefined;
    if (type === 'mouse') {
       x = globalMouseX;
       y = globalMouseY;
    }
    
    set((state) => ({
      // Keep only 1 message of each type at a time to prevent overlapping spam
      messages: [
        ...state.messages.filter(m => m.expiresAt > Date.now() && m.type !== type),
        { id, type, text, expiresAt, x, y }
      ]
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          messages: state.messages.filter(m => m.id !== id)
        }));
      }, durationMs);
    }
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
