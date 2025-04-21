import React, { useState, useEffect } from 'react';
import { Menu, X, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
          
          <nav className="hidden md:flex space-x-8">
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
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-white transform -translate-x-1/2 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>
          
          <button
            className="md:hidden text-white focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      
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
        </nav>
      </div>

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