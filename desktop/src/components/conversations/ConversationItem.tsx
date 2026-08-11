import type { Conversation } from '@/types/conversation';

export interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
  onDelete,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded cursor-pointer transition-colors duration-150 group ${
        isSelected
          ? 'bg-orange-900/30 border border-orange-600'
          : 'hover:bg-gray-800 border border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{conversation.title}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(conversation.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity"
          title="Delete conversation"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

