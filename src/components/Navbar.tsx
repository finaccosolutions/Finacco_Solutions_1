import React, { useState, useEffect } from 'react';
import { Menu, X, Brain, LogIn, UserPlus, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Logo from './Logo';

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

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }

      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  return (
    <>
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-gradient-to-r from-blue-900 to-indigo-900 shadow-md py-2' 
            : 'bg-gradient-to-r from-blue-800 to-indigo-800 py-4'
        }`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="text-white">
            <Logo />
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            {['home', 'services', 'about', 'contact'].map((item) => (
              <button 
                key={item}
                onClick={() => scrollToSection(item)} 
                className="text-gray-100 hover:text-white font-medium transition-all duration-300 relative group px-4 py-2 rounded-lg hover:bg-white/10"
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-white transform -translate-x-1/2 group-hover:w-full transition-all duration-300"></span>
              </button>
            ))}
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link 
                  to="/tax-assistant"
                  className="flex items-center space-x-2 text-gray-100 hover:text-white font-medium transition-all duration-300 relative group px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  <Brain size={20} />
                  <span>Tax AI Assistant</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-100 hover:text-white font-medium transition-all duration-300 relative group px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setShowAuthModal(true);
                  }}
                  className="flex items-center space-x-2 text-gray-100 hover:text-white font-medium transition-all duration-300 relative group px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  <LogIn size={20} />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setShowAuthModal(true);
                  }}
                  className="flex items-center space-x-2 bg-white text-blue-600 font-medium transition-all duration-300 px-4 py-2 rounded-lg hover:bg-blue-50"
                >
                  <UserPlus size={20} />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </nav>
          
          <button
            className="md:hidden text-white focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      
      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-gradient-to-r from-blue-900 to-indigo-900 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300 ease-in-out md:hidden`}
      >
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div className="text-white">
            <Logo />
          </div>
          <button
            className="text-white focus:outline-none"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col space-y-6 px-8 py-8">
          {['home', 'services', 'about', 'contact'].map((item) => (
            <button 
              key={item}
              onClick={() => scrollToSection(item)} 
              className="text-xl text-gray-100 hover:text-white font-medium transition-all duration-300 transform hover:translate-x-2 hover:bg-white/10 px-4 py-2 rounded-lg"
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
          
          {user ? (
            <>
              <Link 
                to="/tax-assistant"
                className="flex items-center space-x-2 text-xl text-gray-100 hover:text-white font-medium transition-all duration-300 transform hover:translate-x-2 hover:bg-white/10 px-4 py-2 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <Brain size={24} />
                <span>Tax AI Assistant</span>
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsOpen(false);
                }}
                className="flex items-center space-x-2 text-xl text-gray-100 hover:text-white font-medium transition-all duration-300 transform hover:translate-x-2 hover:bg-white/10 px-4 py-2 rounded-lg"
              >
                <LogOut size={24} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsLogin(true);
                  setShowAuthModal(true);
                  setIsOpen(false);
                }}
                className="flex items-center space-x-2 text-xl text-gray-100 hover:text-white font-medium transition-all duration-300 transform hover:translate-x-2 hover:bg-white/10 px-4 py-2 rounded-lg"
              >
                <LogIn size={24} />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setShowAuthModal(true);
                  setIsOpen(false);
                }}
                className="flex items-center space-x-2 text-xl text-gray-100 hover:text-white font-medium transition-all duration-300 transform hover:translate-x-2 hover:bg-white/10 px-4 py-2 rounded-lg"
              >
                <UserPlus size={24} />
                <span>Sign Up</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Sign Up'
                )}
              </button>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {isLogin
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-20 hover:bg-blue-700 transform hover:scale-110 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
        </svg>
      </button>
    </>
  );
};

export default Navbar;