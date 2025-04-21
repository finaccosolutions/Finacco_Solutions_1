import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, Key, Loader2 } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

interface ApiKeySetupProps {
  onComplete: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onComplete }) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAndSaveApiKey = async () => {
    setGenerating(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('No authenticated session');
      }

      // Generate a random API key
      const apiKey = 'AIza' + Array.from(crypto.getRandomValues(new Uint8Array(30)))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

      const { error: insertError } = await supabase
        .from('api_keys')
        .upsert({
          user_id: session.user.id,
          gemini_key: apiKey
        });

      if (insertError) throw insertError;
      
      window.__GEMINI_API_KEY = apiKey;
      onComplete();
    } catch (error) {
      console.error('Error generating API key:', error);
      if (error instanceof Error) {
        setError(error.message.includes('authenticated') 
          ? 'Please sign in again.'
          : 'Failed to generate API key. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25"></div>
          <div className="relative bg-white p-8 rounded-lg shadow-xl border border-gray-100">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                AI Assistant Setup
              </h2>
              <p className="text-gray-600">
                We'll automatically set up your AI assistant with a secure API key.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={generateAndSaveApiKey}
              disabled={generating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Set Up AI Assistant
                </>
              )}
            </button>

            <p className="mt-4 text-sm text-gray-500 text-center">
              This will automatically generate and securely store your API key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;