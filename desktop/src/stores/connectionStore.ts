import { create } from 'zustand';
import type { ConnectionStatus } from '@/types/websocket';

interface ConnectionStoreState {
  status: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  lastDisconnectTime: number | null;
  reconnectAttempts: number;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setReconnectAttempts: (attempts: number) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setLastDisconnectTime: (time: number | null) => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  status: 'disconnected',
  isConnected: false,
  isConnecting: false,
  isReconnecting: false,
  lastDisconnectTime: null,
  reconnectAttempts: 0,

  setStatus: (status: ConnectionStatus) => {
    set({
      status,
      isConnected: status === 'connected',
      isConnecting: status === 'connecting',
      isReconnecting: status === 'reconnecting',
      lastDisconnectTime: status === 'disconnected' ? Date.now() : null,
    });
  },

  setReconnectAttempts: (attempts: number) => {
    set({ reconnectAttempts: attempts });
  },

  incrementReconnectAttempts: () => {
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }));
  },

  resetReconnectAttempts: () => {
    set({ reconnectAttempts: 0 });
  },

  setLastDisconnectTime: (time: number | null) => {
    set({ lastDisconnectTime: time });
  },
}));

