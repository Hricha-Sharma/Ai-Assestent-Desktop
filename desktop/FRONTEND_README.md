# Desktop AI Assistant - Frontend

This is the Electron + React + TypeScript frontend for the AI Assistant Desktop application.

## Project Structure

```
desktop/
├── electron/                 # Electron main process
│   ├── main.ts              # Main process entry point
│   ├── preload.ts           # Secure context bridge
│   └── tsconfig.json        # TypeScript config for Electron
│
├── src/
│   ├── app/
│   │   ├── App.tsx          # Root component
│   │   └── routes.tsx       # Routing logic
│   │
│   ├── components/
│   │   ├── auth/            # Login/Register components
│   │   ├── chat/            # Chat UI components
│   │   ├── conversations/   # Conversation management
│   │   └── common/          # Shared components
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx    # Login page
│   │   ├── RegisterPage.tsx # Register page
│   │   └── ChatPage.tsx     # Main chat interface
│   │
│   ├── api/
│   │   ├── client.ts        # HTTP client with axios
│   │   ├── auth.ts          # Auth API methods
│   │   └── conversations.ts # Conversations API methods
│   │
│   ├── websocket/
│   │   ├── WebSocketManager.ts  # WebSocket connection manager
│   │   └── events.ts            # Event emitter utility
│   │
│   ├── stores/
│   │   ├── authStore.ts     # Authentication state (Zustand)
│   │   ├── chatStore.ts     # Chat state management
│   │   └── connectionStore.ts # Connection status
│   │
│   ├── types/
│   │   ├── auth.ts          # Auth type definitions
│   │   ├── conversation.ts  # Chat type definitions
│   │   └── websocket.ts     # WebSocket event types
│   │
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # App component
│   ├── index.css            # Global styles (Tailwind)
│   └── App.css              # App styles
│
├── public/                  # Static assets
├── .env.example             # Environment variables template
├── .env.local               # Local environment variables
├── index.html               # HTML entry point
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config (React)
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
└── README.md                # This file
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- The backend must be running at `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Update .env.local with your backend URL if needed
# VITE_API_URL=http://localhost:8000/api
```

## Development

### Running in Development Mode

```bash
# Start Vite dev server (from desktop directory)
npm run dev

# In another terminal, start Electron
npm run dev:electron
```

Or use concurrent commands:

```bash
# Install concurrently
npm install -D concurrently

# Run both with one command
npm run dev:all
```

### Building for Production

```bash
# Build React + compile Electron
npm run build

# Preview production build
npm run preview
```

## Key Features

### Authentication
- Login and registration with email/password
- JWT token-based authentication
- Automatic token refresh
- Session persistence

### Real-time Chat
- WebSocket-based live messaging
- Streaming AI responses with delta updates
- Message persistence to PostgreSQL
- Automatic reconnection with exponential backoff

### Conversation Management
- Create, list, and delete conversations
- Per-conversation message history
- Draft message preservation during disconnections
- Last message timestamp tracking

### Connection Resilience
- Connection status indicator
- Automatic reconnection on network failure
- Exponential backoff retry strategy (1s → 30s max)
- Local draft preservation during outages
- Graceful degradation when disconnected

### UI/UX
- Dark theme with orange accents
- Responsive layout with sidebar navigation
- Streaming message rendering
- Loading indicators
- Error messages and status displays
- Keyboard shortcuts (Shift+Enter for new line in messages)

## State Management

Uses **Zustand** for lightweight state management:

- `authStore`: User authentication, tokens, login/logout
- `chatStore`: Conversations, messages, drafts
- `connectionStore`: WebSocket connection status

## API Integration

### HTTP Endpoints (via Axios)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `GET /conversations` - List conversations
- `POST /conversations` - Create conversation
- `GET /conversations/{id}` - Get conversation
- `GET /conversations/{id}/messages` - Get messages
- `DELETE /conversations/{id}` - Delete conversation

### WebSocket Events

**Client → Server:**
```json
{
  "type": "message.send",
  "request_id": "unique-id",
  "conversation_id": "conv-id",
  "content": "User message"
}
```

**Server → Client:**
```json
{
  "type": "message.delta",
  "message_id": "msg-id",
  "delta": "Streamed text chunk..."
}
```

```json
{
  "type": "message.completed",
  "message_id": "msg-id"
}
```

## Environment Variables

```env
# Backend API URL
VITE_API_URL=http://localhost:8000/api
```

## Development Guidelines

### Components
- Functional components with React hooks
- TypeScript for type safety
- Props interfaces prefixed with component name
- Export interfaces alongside components

### State Management
- Use Zustand stores for global state
- Local state for UI-only values
- Avoid prop drilling with stores

### API Calls
- Use `apiClient` for HTTP requests
- Use `conversationsAPI` and `authAPI` for typed endpoints
- Handle errors consistently

### Styling
- Use Tailwind CSS utilities
- Dark theme as default (gray-950 background, orange accents)
- Custom components in `@layer components` in CSS files

### WebSocket
- Use `WebSocketManager` for connection management
- Subscribe to events with `onMessage` and `onConnectionChange`
- Implement proper cleanup in useEffect

## Troubleshooting

### WebSocket Connection Fails
- Ensure backend is running on `http://localhost:8000`
- Check that backend has WebSocket support enabled
- Verify `VITE_API_URL` in `.env.local`

### Authentication Issues
- Clear browser localStorage: `localStorage.clear()`
- Check that `/auth/login` returns valid tokens
- Verify JWT secret matches between frontend and backend

### Blank Screen on Startup
- Check Electron preload script in DevTools console
- Verify that Vite dev server is running on port 5173
- Check Electron main process logs

### Styling Issues
- Ensure Tailwind CSS is properly compiled
- Clear `.next` and `dist` folders
- Restart Vite dev server

## Performance Optimizations

- Message list virtualization for large conversations (future enhancement)
- Lazy loading of conversations
- Efficient re-renders with Zustand selectors
- WebSocket reconnection with exponential backoff

## Security Considerations

- ✅ Secure Electron context isolation (`contextIsolation: true`)
- ✅ No Node.js integration in renderer (`nodeIntegration: false`)
- ✅ Sandbox mode enabled
- ✅ JWT tokens stored securely (localStorage - consider sessionStorage for production)
- ✅ HTTPS-only in production
- ✅ Environment variables not exposed to frontend

## Browser Compatibility

Built for Electron, but follows modern web standards:
- Chromium (via Electron) - Latest
- Uses ES2020+ features
- WebSocket support required
- LocalStorage required for auth persistence

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind CSS for styling
3. Keep components small and focused
4. Use Zustand for shared state
5. Add proper error handling
6. Document complex logic

## License

MIT
