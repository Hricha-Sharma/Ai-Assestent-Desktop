import { useConnectionStore } from '@/stores/connectionStore';
import type { ConnectionStatus as ConnectionStatusType } from '@/types/websocket';

export const ConnectionStatus: React.FC = () => {
  const { status } = useConnectionStore();

  type StatusConfig = Record<ConnectionStatusType, {
    icon: string;
    text: string;
    color: string;
    bgColor: string;
  }>;

  const statusConfig: StatusConfig = {
    connected: {
      icon: '●',
      text: 'Connected',
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
    },
    connecting: {
      icon: '◌',
      text: 'Connecting...',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
    },
    reconnecting: {
      icon: '↻',
      text: 'Reconnecting...',
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
    },
    disconnected: {
      icon: '●',
      text: 'Disconnected',
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
    },
  };

  const config = statusConfig[status as ConnectionStatusType];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm ${config.bgColor}`}>
      <span className={`${config.color} ${status === 'reconnecting' ? 'animate-spin' : ''}`}>
        {config.icon}
      </span>
      <span className={config.color}>{config.text}</span>
    </div>
  );
};

