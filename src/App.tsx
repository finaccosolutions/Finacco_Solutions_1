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
    // Remove 'no preview available' message if it exists
    const noPreviewMessage = document.querySelector('div[data-vite-dev-id="no-preview"]');
    if (noPreviewMessage) {
      noPreviewMessage.remove();
    }
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
    document.title = 'Finacco Solutions | Financial & Tech Services';
    
    const defaultTitleElement = document.querySelector('[data-default]');
    if (defaultTitleElement) {
      defaultTitleElement.textContent = 'Finacco Solutions | Financial & Tech Services';
    }
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;