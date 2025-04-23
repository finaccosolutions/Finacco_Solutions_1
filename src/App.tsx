import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import TaxAssistant from './components/TaxAssistant';
import Auth from './components/Auth';
import ApiKeySetup from './components/ApiKeySetup';
import UserProfile from './components/UserProfile';
import { supabase } from './lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error checking auth status:', error);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!session);
        }
      } catch (err) {
        console.error('Error in auth check:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} returnUrl={location.pathname} />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/tax-assistant' || 
                    location.pathname === '/api-key-setup' || 
                    location.pathname === '/profile';

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      {!isAuthPage && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col">
              <Hero />
              <Services />
              <About />
              <Contact />
            </div>
          } />
          <Route path="/tax-assistant" element={
            <ProtectedRoute>
              <TaxAssistant />
            </ProtectedRoute>
          } />
          <Route path="/api-key-setup" element={
            <ProtectedRoute>
              <ApiKeySetup onComplete={() => null} />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAuthPage && (
        <>
          <Footer />
          <WhatsAppButton />
        </>
      )}
    </div>
  );
};

function App() {
  React.useEffect(() => {
    document.title = 'Finacco Solutions | Financial & Tech Services';
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;