import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import TaxAssistant from './components/TaxAssistant';

const AppContent = () => {
  const location = useLocation();
  const isTaxAssistant = location.pathname === '/tax-assistant';

  useEffect(() => {
    // Remove any 'no preview available' messages
    const removeNoPreviewMessages = () => {
      const noPreviewMessages = document.querySelectorAll('[data-vite-dev-id="no-preview"]');
      noPreviewMessages.forEach(message => message.remove());
    };

    // Initial cleanup
    removeNoPreviewMessages();

    // Set up observer to remove any dynamically added messages
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        removeNoPreviewMessages();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {!isTaxAssistant && <Navbar />}
      <Routes>
        <Route path="/" element={
          <>
            <Hero />
            <Services />
            <About />
            <Contact />
          </>
        } />
        <Route path="/tax-assistant" element={<TaxAssistant />} />
      </Routes>
      {!isTaxAssistant && (
        <>
          <Footer />
          <WhatsAppButton />
        </>
      )}
    </div>
  );
};

function App() {
  useEffect(() => {
    // Set document title
    document.title = 'Finacco Solutions | Financial & Tech Services';
    
    // Remove any 'no preview available' messages
    const removeNoPreviewMessages = () => {
      const noPreviewMessages = document.querySelectorAll('[data-vite-dev-id="no-preview"]');
      noPreviewMessages.forEach(message => message.remove());
    };

    // Initial cleanup
    removeNoPreviewMessages();

    // Set up observer to remove any dynamically added messages
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        removeNoPreviewMessages();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Update title in any default title elements
    const defaultTitleElement = document.querySelector('[data-default]');
    if (defaultTitleElement) {
      defaultTitleElement.textContent = 'Finacco Solutions | Financial & Tech Services';
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;