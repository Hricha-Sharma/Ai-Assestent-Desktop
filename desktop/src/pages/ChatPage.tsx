import { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useConnectionStore } from '@/stores/connectionStore';
import { useAuthStore } from '@/stores/authStore';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { conversationsAPI } from '@/api/conversations';
import { WebSocketManager } from '@/websocket/WebSocketManager';
import type { WebSocketEvent } from '@/types/websocket';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface ChatPageProps {
  onLogout: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onLogout }) => {
  const { isAuthenticated, accessToken, logout } = useAuthStore();
  const {
    currentConversationId,
    setCurrentConversation,
    addConversation,
    addMessage,
    updateMessage,
    messages,
  } = useChatStore();
  const { status, setStatus } = useConnectionStore();
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !currentConversationId) {
      return;
    }

    const manager = new WebSocketManager(API_BASE_URL);

    const handleWebSocketMessage = (event: WebSocketEvent) => {
      const convMessages = messages[currentConversationId] || [];
      
      switch (event.type) {
        case 'message.delta':
          // Stream delta
          if (streamingMessageId !== event.message_id) {
            setStreamingMessageId(event.message_id);
          }
          const currentMessage = convMessages.find((m) => m.id === event.message_id);
          const newContent = (currentMessage?.content || '') + event.delta;
          updateMessage(currentConversationId, event.message_id, {
            content: newContent,
            status: 'pending',
          });
          break;

        case 'message.completed':
          // Message complete
          updateMessage(currentConversationId, event.message_id, {
            status: 'completed',
          });
          setStreamingMessageId(null);
          break;

        case 'message.failed':
          // Message failed
          updateMessage(currentConversationId, event.message_id, {
            status: 'failed',
          });
          setStreamingMessageId(null);
          break;

        case 'error':
          console.error('WebSocket error:', event);
          break;
      }
    };

    const unsubscribeConnection = manager.onConnectionChange((status) => {
      setStatus(status);
    });

    const unsubscribeMessage = manager.onMessage(handleWebSocketMessage);

    manager
      .connect(accessToken)
      .then(() => {
        console.log('WebSocket connected');
      })
      .catch((error) => {
        console.error('WebSocket connection failed:', error);
      });

    setWsManager(manager);

    return () => {
      unsubscribeConnection();
      unsubscribeMessage();
      manager.disconnect();
    };
  }, [isAuthenticated, accessToken, currentConversationId, setStatus, updateMessage, messages, streamingMessageId]);

  const handleCreateConversation = async () => {
    try {
      const newConversation = await conversationsAPI.createConversation({
        title: 'New Conversation',
      });

      addConversation({
        id: newConversation.id,
        userId: '',
        title: newConversation.title,
        createdAt: newConversation.created_at,
        updatedAt: newConversation.updated_at,
      });

      setCurrentConversation(newConversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversation(id);
  };

  const handleSendMessage = async (content: string) => {
    if (!currentConversationId || !wsManager?.isConnected()) {
      return;
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      conversationId: currentConversationId,
      role: 'user' as const,
      content,
      status: 'completed' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addMessage(currentConversationId, userMessage);

    // Create pending assistant message
    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      conversationId: currentConversationId,
      role: 'assistant' as const,
      content: '',
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addMessage(currentConversationId, assistantMessage);

    try {
      wsManager.send({
        type: 'message.send',
        request_id: requestId,
        conversation_id: currentConversationId,
        content,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      updateMessage(currentConversationId, assistantMessage.id, {
        status: 'failed',
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">AI Assistant</h1>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
          <ConversationList
            onSelectConversation={handleSelectConversation}
            onCreateConversation={handleCreateConversation}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {currentConversationId ? (
            <ChatWindow
              conversationId={currentConversationId}
              onSendMessage={handleSendMessage}
              isConnected={status === 'connected'}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 mb-4">Select a conversation or create a new one</p>
                <button
                  onClick={handleCreateConversation}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded font-semibold transition-colors"
                >
                  Start New Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

