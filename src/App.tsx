import React from 'react';
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

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      {!isTaxAssistant && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col">
              <Hero />
              <Services />
              <About />
              <Contact />
            </div>
          } />
          <Route path="/tax-assistant" element={<TaxAssistant />} />
        </Routes>
      </main>
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
  React.useEffect(() => {
    document.title = 'Finacco Solutions | Financial & Tech Services';
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;