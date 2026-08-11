export interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded relative" role="alert">
      <div className="flex items-center justify-between">
        <span className="block sm:inline">{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-red-400 hover:text-red-300 font-bold text-xl"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

