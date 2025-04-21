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

// Retry configuration
const RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_TIMEOUT = 15000; // 15 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onComplete }) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  const validateApiKey = async (key: string, attempt = 1): Promise<{ isValid: boolean; error?: string }> => {
    try {
      // Basic validation checks
      if (!key || typeof key !== 'string') {
        return { 
          isValid: false, 
          error: 'Please enter a valid API key' 
        };
      }

      if (!key.startsWith('AIza')) {
        return { 
          isValid: false, 
          error: 'Invalid API key format. Key should start with "AIza"' 
        };
      }

      if (key.length < 30) {
        return { 
          isValid: false, 
          error: 'API key appears too short. Please check the key' 
        };
      }

      // Encode the API key to handle special characters
      const encodedKey = encodeURIComponent(key.trim());
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro/generateContent?key=${encodedKey}`;

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Test message to validate API key"
              }]
            }]
          }),
          signal: controller.signal,
          // Add cache control to prevent caching issues
          cache: 'no-cache',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error occurred' } }));
          const errorMessage = errorData.error?.message || 'Unknown error occurred';
          
          // Handle specific API error cases
          if (errorMessage.includes('API key not valid')) {
            return { 
              isValid: false, 
              error: 'Invalid API key. Please make sure you copied the entire key correctly' 
            };
          }
          if (errorMessage.includes('API has not been enabled')) {
            return { 
              isValid: false, 
              error: 'The Gemini API is not enabled for this API key. Please enable it in your Google Cloud Console' 
            };
          }
          if (errorMessage.includes('billing')) {
            return { 
              isValid: false, 
              error: 'Please ensure billing is enabled for your Google Cloud project' 
            };
          }
          if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            return { 
              isValid: false, 
              error: 'This API key does not have permission to access the Gemini API. Please check the API key permissions' 
            };
          }
          
          // If we get here and still have retries left, try again
          if (attempt < RETRY_ATTEMPTS) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
            await sleep(delay);
            return validateApiKey(key, attempt + 1);
          }

          return { 
            isValid: false, 
            error: `API Error: ${errorMessage}` 
          };
        }

        // Successful validation
        return { isValid: true };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          if (attempt < RETRY_ATTEMPTS) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
            await sleep(delay);
            return validateApiKey(key, attempt + 1);
          }
          return {
            isValid: false,
            error: 'Request timed out. Please check your network connection and try again'
          };
        }

        // Network or other fetch errors
        if (attempt < RETRY_ATTEMPTS) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await sleep(delay);
          return validateApiKey(key, attempt + 1);
        }

        return {
          isValid: false,
          error: 'Unable to connect to the Gemini API. Please check your network connection and try again'
        };
      }
    } catch (error) {
      console.error('API key validation error:', error);
      
      if (attempt < RETRY_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
        return validateApiKey(key, attempt + 1);
      }

      return { 
        isValid: false, 
        error: 'An error occurred while validating the API key. Please try again later.' 
      };
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

      const trimmedApiKey = apiKey.trim();
      if (!trimmedApiKey) {
        throw new Error('Please enter your Gemini API key');
      }

      // Validate the API key before saving
      const validation = await validateApiKey(trimmedApiKey);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid API key');
      }

      const { error: insertError } = await supabase
        .from('api_keys')
        .upsert({
          user_id: session.user.id,
          gemini_key: trimmedApiKey
        });

      if (insertError) throw insertError;
      
      // Set the API key in the window object
      window.__GEMINI_API_KEY = trimmedApiKey;
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