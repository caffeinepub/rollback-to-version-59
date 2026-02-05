import { useEffect } from 'react';
import { usePinAuth } from './hooks/usePinAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import PinAuth from './components/PinAuth';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { 
    isAuthenticated, 
    isInitializing, 
    hasPinSetup, 
    setupPin, 
    verifyPin, 
    logout, 
    resetPin, 
    isVerifyingPin,
    authError 
  } = usePinAuth();
  const queryClient = useQueryClient();

  // Clear query cache on logout
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.clear();
    }
  }, [isAuthenticated, queryClient]);

  const handleResetPin = () => {
    resetPin();
    queryClient.clear();
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 via-blue-50 to-amber-50">
        <Header isAuthenticated={false} onLogout={logout} />
        <main className="flex-1">
          <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
            <div className="text-center space-y-4 bg-white p-12 rounded-2xl shadow-2xl border border-gray-200">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
              <div>
                <p className="text-lg font-bold text-gray-900">Loading...</p>
                <p className="text-sm text-gray-600 mt-2">Initializing application</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
        <Toaster />
      </div>
    );
  }

  // Show PIN auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 via-blue-50 to-amber-50">
        <Header isAuthenticated={false} onLogout={logout} />
        <main className="flex-1">
          <PinAuth
            hasPinSetup={hasPinSetup}
            onSetupPin={setupPin}
            onVerifyPin={verifyPin}
            onResetPin={handleResetPin}
            isVerifyingPin={isVerifyingPin}
            authError={authError}
          />
        </main>
        <Footer />
        <Toaster />
      </div>
    );
  }

  // Show dashboard immediately after authentication - fully offline
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 via-blue-50 to-amber-50">
      <Header isAuthenticated={true} onLogout={logout} />
      <main className="flex-1">
        <Dashboard />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
