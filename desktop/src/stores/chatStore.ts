import { create } from 'zustand';
import type { Message, Conversation } from '@/types/conversation';

interface ChatStoreState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  messageDrafts: Record<string, string>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setCurrentConversation: (id: string) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  setMessageDraft: (conversationId: string, draft: string) => void;
  getMessageDraft: (conversationId: string) => string;
  clearMessageDraft: (conversationId: string) => void;
  setLoadingConversations: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  setError: (error: string | null) => void;
  removeConversation: (id: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  messageDrafts: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  error: null,

  setConversations: (conversations) => {
    set({ conversations });
  },

  addConversation: (conversation) => {
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));
  },

  setCurrentConversation: (id) => {
    set({ currentConversationId: id });
  },

  setMessages: (conversationId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages,
      },
    }));
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    }));
  },

  updateMessage: (conversationId, messageId, updates) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    }));
  },

  setMessageDraft: (conversationId, draft) => {
    set((state) => ({
      messageDrafts: {
        ...state.messageDrafts,
        [conversationId]: draft,
      },
    }));
  },

  getMessageDraft: (conversationId) => {
    return get().messageDrafts[conversationId] || '';
  },

  clearMessageDraft: (conversationId) => {
    set((state) => ({
      messageDrafts: {
        ...state.messageDrafts,
        [conversationId]: '',
      },
    }));
  },

  setLoadingConversations: (loading) => {
    set({ isLoadingConversations: loading });
  },

  setLoadingMessages: (loading) => {
    set({ isLoadingMessages: loading });
  },

  setError: (error) => {
    set({ error });
  },

  removeConversation: (id) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== id)
      ),
    }));
  },

  reset: () => {
    set({
      conversations: [],
      currentConversationId: null,
      messages: {},
      messageDrafts: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      error: null,
    });
  },
}));

