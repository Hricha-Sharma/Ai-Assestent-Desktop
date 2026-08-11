import { useChatStore } from '@/stores/chatStore';
import { conversationsAPI } from '@/api/conversations';
import { ConversationItem } from './ConversationItem';
import { Loading } from '@/components/common/Loading';
import { useEffect } from 'react';
import type { Conversation } from '@/types/conversation';

export interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  onCreateConversation,
}) => {
  const { conversations, currentConversationId, isLoadingConversations, setConversations, removeConversation } =
    useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await conversationsAPI.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await conversationsAPI.deleteConversation(id);
      removeConversation(id);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onCreateConversation}
        className="w-full m-4 mb-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded transition-colors duration-200"
      >
        + New Chat
      </button>

      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {isLoadingConversations && (
          <div className="flex justify-center py-8">
            <Loading size="sm" />
          </div>
        )}

        {conversations.length === 0 && !isLoadingConversations && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No conversations yet</p>
            <p className="text-gray-500 text-xs mt-2">Create a new chat to get started</p>
          </div>
        )}

        {conversations.map((conversation: Conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={currentConversationId === conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            onDelete={(e) => handleDelete(e, conversation.id)}
          />
        ))}
      </div>
    </div>
  );
};

