import { LoginForm } from '@/components/auth/LoginForm';

export interface LoginPageProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Assistant</h1>
          <p className="text-gray-400">Chat with AI, powered by advanced language models</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <LoginForm onSuccess={onLoginSuccess} onSwitchToRegister={onSwitchToRegister} />
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">
          Your conversations are private and stored securely
        </p>
      </div>
    </div>
  );
};

