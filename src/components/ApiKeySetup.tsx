import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, Key, Loader2, Info } from 'lucide-react';

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
  const [apiKey, setApiKey] = useState('');

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Test message to validate API key"
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Invalid API key');
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const saveApiKey = async () => {
    setGenerating(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('No authenticated session');
      }

      if (!apiKey) {
        throw new Error('Please enter your Gemini API key');
      }

      if (!apiKey.startsWith('AIza')) {
        throw new Error('Invalid Gemini API key format. Key should start with "AIza"');
      }

      // Validate the API key before saving
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        throw new Error('Invalid API key. Please check your key and try again.');
      }

      const { error: insertError } = await supabase
        .from('api_keys')
        .upsert({
          user_id: session.user.id,
          gemini_key: apiKey
        });

      if (insertError) throw insertError;
      
      // Set the API key in the window object
      window.__GEMINI_API_KEY = apiKey;
      console.log('API key successfully set and validated');
      onComplete();
    } catch (error) {
      console.error('Error saving API key:', error);
      if (error instanceof Error) {
        setError(error.message.includes('authenticated') 
          ? 'Please sign in again.'
          : error.message);
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
                Set Up Your Gemini API Key
              </h2>
              <p className="text-gray-600">
                Enter your Gemini API key to start using the AI assistant
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">How to get your API key:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Visit the <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Google AI Studio</a></li>
                    <li>Sign in with your Google account</li>
                    <li>Create a new API key or use an existing one</li>
                    <li>Copy and paste your API key here</li>
                  </ol>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              />
            </div>

            <button
              onClick={saveApiKey}
              disabled={generating || !apiKey.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Save API Key
                </>
              )}
            </button>

            <p className="mt-4 text-sm text-gray-500 text-center">
              Your API key will be securely stored and used only for your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;