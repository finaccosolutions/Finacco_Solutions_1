import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import ApiKeySetup from './ApiKeySetup';
import ChatPage from './ChatPage';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

const TaxAssistant = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      if (!session) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('gemini_key')
        .eq('user_id', session.user.id)
        .single();

      if (apiKeyError && apiKeyError.code !== 'PGRST116') {
        throw apiKeyError;
      }

      setHasApiKey(!!apiKeyData);
      if (apiKeyData) {
        window.__GEMINI_API_KEY = apiKeyData.gemini_key;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} returnUrl="/tax-assistant" />;
  }

  if (!hasApiKey) {
    return (
      <ApiKeySetup
        onComplete={() => {
          setHasApiKey(true);
          navigate('/tax-assistant');
        }}
      />
    );
  }

  return <ChatPage />;
};

export default TaxAssistant;