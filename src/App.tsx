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
import { supabase } from './lib/supabase';

import DocumentTemplates from './pages/DocumentTemplates';
import CreateDocument from './pages/CreateDocument';
import DocumentTemplatesAdmin from './pages/admin/DocumentTemplatesAdmin';


interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
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
          // Check if user is admin
          if (session?.user?.email?.endsWith('@finaccosolutions.com')) {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        console.error('Error in auth check:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user?.email?.endsWith('@finaccosolutions.com')) {
        setIsAdmin(true);
      }
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

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  useEffect(() => {
    document.title = 'Finacco Solutions | Financial & Tech Services';
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <>
            <Navbar />
            <Hero />
            <Services />
            <About />
            <Contact />
            <Footer />
            <WhatsAppButton />
          </>
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
        <Route path="/documents" element={
          <ProtectedRoute>
            <DocumentTemplates />
          </ProtectedRoute>
        } />
        <Route path="/create-document/:templateId" element={
          <ProtectedRoute>
            <CreateDocument />
          </ProtectedRoute>
        } />
        <Route path="/admin/templates" element={
          <ProtectedRoute adminOnly>
            <DocumentTemplatesAdmin />
          </ProtectedRoute>
        } />
        <Route path="/tax-assistant" element={
            <ProtectedRoute>
              <TaxAssistant />
            </ProtectedRoute>
          } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;