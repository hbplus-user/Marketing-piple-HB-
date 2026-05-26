import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';

function AppShell() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FB' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg animate-pulse">
            P
          </div>
          <p className="text-sm text-gray-400">Loading Pipeline…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <AppProvider>
      <Dashboard />
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
