import React, { useState } from 'react';
import { Auth } from './Auth';

const TaxAssistant = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} returnUrl="/tax-assistant" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Tax Assistant content will go here */}
        <h1 className="text-3xl font-bold text-gray-900">Tax Assistant</h1>
      </div>
    </div>
  );
};

export default TaxAssistant;