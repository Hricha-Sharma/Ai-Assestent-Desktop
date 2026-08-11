import { RegisterForm } from '@/components/auth/RegisterForm';

export interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join to start chatting with AI</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <RegisterForm onSuccess={onRegisterSuccess} onSwitchToLogin={onSwitchToLogin} />
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">
          We'll never share your data with third parties
        </p>
      </div>
    </div>
  );
};

