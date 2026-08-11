export type WebSocketEvent = 
  | MessageSendEvent
  | MessageDeltaEvent
  | MessageCompletedEvent
  | MessageFailedEvent
  | ConnectionReadyEvent
  | ErrorEvent;

export type MessageSendEvent = {
  type: 'message.send';
  request_id: string;
  conversation_id: string;
  content: string;
};

export type MessageDeltaEvent = {
  type: 'message.delta';
  message_id: string;
  delta: string;
};

export type MessageCompletedEvent = {
  type: 'message.completed';
  message_id: string;
};

export type MessageFailedEvent = {
  type: 'message.failed';
  message_id: string;
  error: string;
};

export type ConnectionReadyEvent = {
  type: 'connection.ready';
  session_id: string;
};

export type ErrorEvent = {
  type: 'error';
  code: string;
  message: string;
};

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

