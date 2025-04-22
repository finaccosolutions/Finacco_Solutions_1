import React, { useState, useEffect } from 'react';
import { Key, Loader2, Info, Trash2, RefreshCw, Home, MessageSquare } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ApiKeySetupProps {
  onComplete: () => void;
  returnUrl?: string;
}

const RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_TIMEOUT = 15000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onComplete, returnUrl }) => {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [existingKey, setExistingKey] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    checkExistingApiKey();
  }, []);

  const checkExistingApiKey = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { state: { returnTo: window.location.pathname } });
        return;
      }

      const { data, error } = await supabase
        .from('api_keys')
        .select('gemini_key')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      setExistingKey(!!data);
    } catch (error) {
      console.error('Error checking existing API key:', error);
      setError('Failed to check for existing API key. Please try refreshing the page.');
    }
  };

  const validateApiKey = async (key: string, attempt = 1): Promise<{ isValid: boolean; error?: string }> => {
    try {
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

      const encodedKey = encodeURIComponent(key.trim());
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${encodedKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
          cache: 'no-cache',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error occurred' } }));
          const errorMessage = errorData.error?.message || 'Unknown error occurred';
          
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
          
          throw new Error(errorMessage);
        }

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
            error: 'Request timed out. Please try again'
          };
        }

        throw fetchError;
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
        error: 'Failed to validate API key. Please try again in a few moments'
      };
    }
  };

  const saveApiKey = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login', { state: { returnTo: window.location.pathname } });
        return;
      }

      const trimmedApiKey = apiKey.trim();
      if (!trimmedApiKey) {
        setError('Please enter your Gemini API key');
        return;
      }

      const validation = await validateApiKey(trimmedApiKey);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid API key');
        return;
      }

      const { error: insertError } = await supabase
        .from('api_keys')
        .upsert({
          user_id: session.user.id,
          gemini_key: trimmedApiKey
        });

      if (insertError) {
        throw insertError;
      }

      window.__GEMINI_API_KEY = trimmedApiKey;
      setSuccess('API key saved successfully!');
      
      setTimeout(() => {
        if (returnUrl) {
          window.location.href = returnUrl;
        } else {
          onComplete();
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving API key:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const deleteApiKey = async () => {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login', { state: { returnTo: window.location.pathname } });
        return;
      }

      const { error: deleteError } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', session.user.id);

      if (deleteError) throw deleteError;

      window.__GEMINI_API_KEY = undefined;
      setExistingKey(false);
      setApiKey('');
      setSuccess('API key deleted successfully!');
    } catch (error) {
      console.error('Error deleting API key:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setDeleting(false);
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
                {existingKey ? 'Update Your Gemini API Key' : 'Set Up Your Gemini API Key'}
              </h2>
              <p className="text-gray-600">
                {existingKey 
                  ? 'Update or remove your existing Gemini API key'
                  : 'Enter your Gemini API key to start using the AI assistant'}
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

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <Info className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 text-sm">{success}</p>
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

            <div className="space-y-4">
              <button
                onClick={() => saveApiKey()}
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
                    {existingKey ? (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Update API Key
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        Save API Key
                      </>
                    )}
                  </>
                )}
              </button>

              {existingKey && (
                <button
                  onClick={deleteApiKey}
                  disabled={deleting}
                  className="w-full bg-red-50 text-red-600 font-medium py-3 px-4 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-200"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Delete API Key
                    </>
                  )}
                </button>
              )}

              <div className="flex gap-4 mt-6">
                {existingKey ? (
                  <Link
                    to="/tax-assistant"
                    className="flex-1 bg-blue-50 text-blue-600 font-medium py-3 px-4 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 border border-blue-200"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Go to Chat
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="flex-1 bg-gray-50 text-gray-600 font-medium py-3 px-4 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center justify-center gap-2 border border-gray-200"
                  >
                    <Home className="w-5 h-5" />
                    Back to Home
                  </Link>
                )}
              </div>
            </div>

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