import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Brain, LogIn, UserPlus, LogOut, User, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Logo from './Logo';
import Auth from './Auth';

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

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const accountMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setShowAccountMenu(false);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setShowAccountMenu(false);
  };

  const AccountMenu = () => (
    <div 
      ref={accountMenuRef}
      className="relative"
    >
      <button
        onClick={() => setShowAccountMenu(!showAccountMenu)}
        className="flex items-center gap-2 text-gray-100 hover:text-white font-medium transition-all duration-300 relative group px-4 py-2 rounded-lg hover:bg-white/10"
      >
        <User size={20} />
        <span>Account</span>
        <ChevronDown size={16} className={`transition-transform duration-300 ${showAccountMenu ? 'rotate-180' : ''}`} />
      </button>

      {showAccountMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
          {user ? (
            <>
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                <p className="text-xs text-gray-500">Signed in</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsLogin(true);
                  navigate('/tax-assistant');
                  setShowAccountMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  navigate('/tax-assistant');
                  setShowAccountMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <UserPlus size={16} />
                <span>Sign Up</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

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
            
            <Link 
              to="/tax-assistant"
              className="flex items-center space-x-2 text-gray-100 hover:text-white font-medium transition-all duration-300 relative group px-4 py-2 rounded-lg hover:bg-white/10"
            >
              <Brain size={20} />
              <span>Tax AI Assistant</span>
            </Link>

            <AccountMenu />
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
          
          <Link 
            to="/tax-assistant"
            className="flex items-center space-x-2 text-xl text-gray-100 hover:text-white font-medium transition-all duration-300 transform hover:translate-x-2 hover:bg-white/10 px-4 py-2 rounded-lg"
            onClick={() => setIsOpen(false)}
          >
            <Brain size={24} />
            <span>Tax AI Assistant</span>
          </Link>

          {user ? (
            <>
              <div className="px-4 py-2 border-t border-white/10">
                <p className="text-sm font-medium text-white truncate">{user.email}</p>
                <p className="text-xs text-white/70">Signed in</p>
              </div>
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
                  navigate('/tax-assistant');
                  setIsOpen(false);
                }}
                className="flex items-center space-x-2 text-xl text-gray-100 hover:text-white font-medium transition-all duration-300 transform hover:translate-x-2 hover:bg-white/10 px-4 py-2 rounded-lg"
              >
                <LogIn size={24} />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => {
                  navigate('/tax-assistant');
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

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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