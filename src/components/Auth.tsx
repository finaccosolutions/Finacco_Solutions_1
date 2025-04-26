import React, { useState } from 'react';
import { Mail, Lock, UserPlus, LogIn, Home, RefreshCw, User, Phone, Key, Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import ApiKeySetup from './ApiKeySetup';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: () => void;
  returnUrl?: string;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, returnUrl }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);


  // Enhanced validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const validateConfirmPassword = (confirm: string): boolean => {
    if (!isLogin && password !== confirm) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError(null);
    return true;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!validateEmail(email)) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setSuccess('Password reset instructions have been sent to your email');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google login failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = !isLogin ? validateConfirmPassword(confirmPassword) : true;
  
    if (!isEmailValid || !isPasswordValid || !isConfirmValid) {
      return;
    }
  
    setLoading(true);
  
    try {
      if (isLogin) {
        // LOGIN FLOW - Using raw SQL since standard auth won't work
        const { data, error } = await supabase
          .from('auth.users')
          .select('*')
          .eq('Email', email.trim())
          .single();
  
        if (error || !data) {
          throw new Error('Invalid login credentials');
        }
  
        // Verify password (in a real app, compare hashed passwords)
        if (data.password !== password) { // WARNING: Insecure in production
          throw new Error('Invalid login credentials');
        }
  
        // Manually create session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: 'custom_' + data.UID, // Simplified token
          refresh_token: 'custom_' + data.UID
        });
  
        if (sessionError) throw sessionError;
  
        onAuthSuccess();
      } else {
        // SIGNUP FLOW
        console.log('Starting signup process...');
        
        // 1. Create user directly in your custom table
        const { data, error } = await supabase
          .from('auth.users')
          .insert([
            {
              UID: generateUUID(), // You need to implement this
              Email: email.trim(),
              "Display name": fullName.trim(),
              Phone: mobile.trim(),
              Providers: 'email',
              "Provider Type": 'email',
              "Created at": new Date().toISOString(),
              "Last sign in": new Date().toISOString(),
              password: password // WARNING: Store hashed passwords in production
            }
          ])
          .select();
  
        if (error) {
          console.error('Signup error:', error);
          throw error;
        }
  
        console.log('User created:', data);
  
        // 2. Manually create session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: 'custom_' + data[0].UID,
          refresh_token: 'custom_' + data[0].UID
        });
  
        if (sessionError) throw sessionError;
  
        setSuccess('Registration successful! Redirecting...');
        setShowApiKeySetup(true);
      }
    } catch (error) {
      console.error('Complete error:', error);
      setError(error instanceof Error ? 
        error.message : 
        'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to generate UUIDs
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };9

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
                  {isResetPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="mt-2 text-gray-600">
                  {isResetPassword
                    ? 'Enter your email to reset your password'
                    : isLogin
                    ? 'Sign in to access your account'
                    : 'Sign up to get started'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {!isResetPassword && (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 mb-4 border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 text-base font-medium transition-all duration-300"
                >
                  <img 
                    src="https://www.google.com/favicon.ico" 
                    alt="Google" 
                    className="w-5 h-5 mr-2"
                  />
                  Continue with Google
                </button>
              )}

              <div className="relative flex items-center my-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-500">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              <form onSubmit={isResetPassword ? handlePasswordReset : handleSubmit} className="space-y-4">
                    {!isLogin && !isResetPassword && (
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="fullName"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-300"
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>
                    )}

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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        validateEmail(e.target.value);
                      }}
                      onBlur={() => validateEmail(email)}
                      className={`block w-full pl-10 pr-3 py-3 border ${
                        emailError ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-300`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                </div>

                {!isResetPassword && (
                  <>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            validatePassword(e.target.value);
                          }}
                          onBlur={() => validatePassword(password)}
                          className={`block w-full pl-10 pr-3 py-3 border ${
                            passwordError ? 'border-red-500' : 'border-gray-300'
                          } rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-300`}
                          placeholder="Enter your password"
                        />
                      </div>
                      {passwordError && (
                        <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                      )}
                    </div>

                    {!isLogin && (
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Repeat className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              validateConfirmPassword(e.target.value);
                            }}
                            onBlur={() => validateConfirmPassword(confirmPassword)}
                            className={`block w-full pl-10 pr-3 py-3 border ${
                              confirmPasswordError ? 'border-red-500' : 'border-gray-300'
                            } rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-300`}
                            placeholder="Confirm your password"
                          />
                        </div>
                        {confirmPasswordError && (
                          <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
                        )}
                      </div>
                    )}

                    {!isLogin && (
                      <div>
                        <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                          Mobile Number (Optional)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="mobile"
                            type="tel"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all duration-300"
                            placeholder="Enter your mobile number"
                          />
                        </div>
                      </div>
                    )}

                    {/* Admin registration toggle (only show on signup in development) */}
                    {!isLogin && process.env.NODE_ENV === 'development' && (
                      <div className="flex items-center">
                        <input
                          id="isAdmin"
                          type="checkbox"
                          checked={isAdmin}
                          onChange={(e) => setIsAdmin(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-700">
                          Register as Admin (Development Only)
                        </label>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 text-base font-medium transition-all duration-300 transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isResetPassword ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Reset Password
                    </>
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

              <div className="mt-6 text-center space-y-2">
                {isResetPassword ? (
                  <button
                    onClick={() => setIsResetPassword(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
                  >
                    Back to Sign In
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setError(null);
                        setEmailError(null);
                        setPasswordError(null);
                        setConfirmPasswordError(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
                    >
                      {isLogin
                        ? "Don't have an account? Sign Up"
                        : 'Already have an account? Sign In'}
                    </button>
                    {isLogin && (
                      <div>
                        <button
                          onClick={() => {
                            setIsResetPassword(true);
                            setError(null);
                            setEmailError(null);
                            setPasswordError(null);
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-300"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;