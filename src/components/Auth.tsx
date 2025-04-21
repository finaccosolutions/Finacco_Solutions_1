import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, Lock, UserPlus, LogIn, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import ApiKeySetup from './ApiKeySetup';

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

interface AuthProps {
  onAuthSuccess: () => void;
  returnUrl?: string;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, returnUrl }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let authResponse;
      
      if (isLogin) {
        authResponse = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        authResponse = await supabase.auth.signUp({
          email,
          password,
        });
      }

      if (authResponse.error) {
        throw authResponse.error;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error('No valid session after authentication');
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          onAuthSuccess();
        }
      });

      setShowApiKeySetup(true);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  if (showApiKeySetup) {
    return <ApiKeySetup onComplete={onAuthSuccess} returnUrl={returnUrl} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white">
      <div className="absolute top-4 left-4">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-white rounded-lg shadow-sm hover:shadow transition-all duration-300"
        >
          <Home size={20} />
          <span>Back to Home</span>
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-25"></div>
            <div className="relative bg-white p-8 rounded-xl shadow-xl border border-gray-100">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="mt-2 text-gray-600">
                  {isLogin
                    ? 'Sign in to access your account'
                    : 'Sign up to get started'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-300"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-300"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 text-base font-medium transition-all duration-300 transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isLogin ? (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Sign Up
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
                >
                  {isLogin
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Sign In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;