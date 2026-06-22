import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';

type AppPhase = 'auth' | 'welcome' | 'dashboard';

function AppShell() {
  const { session, loading } = useAuth();
  const [appPhase, setAppPhase] = useState<AppPhase>('auth');

  useEffect(() => {
    if (!session) {
      setAppPhase('auth');
    } else if (appPhase === 'auth') {
      // Session restored on page refresh — show welcome page bird's-eye view
      setAppPhase('welcome');
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #dde4f5 0%, #e8d8ef 40%, #f5d9d4 80%, #fde8d0 100%)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid rgba(66,133,244,0.2)',
            borderTopColor: '#4285F4',
          }}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.45 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <LoginPage onEnterDashboard={() => setAppPhase('welcome')} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AppProvider>
      <AnimatePresence mode="wait">
        {appPhase === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            style={{ width: '100%', minHeight: '100vh' }}
          >
            <WelcomePage onEnter={() => setAppPhase('dashboard')} />
          </motion.div>
        )}
        {appPhase === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{ height: '100vh' }}
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
