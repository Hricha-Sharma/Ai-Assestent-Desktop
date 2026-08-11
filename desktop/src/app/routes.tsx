import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ChatPage } from '@/pages/ChatPage';
import { Loading } from '@/components/common/Loading';

type AuthMode = 'login' | 'register';

export const Routes: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loading size="lg" message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {authMode === 'login' ? (
          <LoginPage
            onLoginSuccess={() => {
              // Will be automatically redirected after login
            }}
            onSwitchToRegister={() => setAuthMode('register')}
          />
        ) : (
          <RegisterPage
            onRegisterSuccess={() => {
              // Will be automatically redirected after register
            }}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}
      </>
    );
  }

  return <ChatPage onLogout={() => setAuthMode('login')} />;
};

