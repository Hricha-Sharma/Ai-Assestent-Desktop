import { useEffect } from 'react';
import { Routes } from '@/app/routes';
import { useAuthStore } from '@/stores/authStore';
import './App.css';

function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize authentication on app load
    initializeAuth();
  }, [initializeAuth]);

  return <Routes />;
}

export default App;

