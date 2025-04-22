import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Settings, ArrowLeft, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DocumentRequestHandler from './DocumentRequestHandler';

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

const TaxAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
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
        .single();

      if (error) throw error;
      
      if (!data?.gemini_key) {
        navigate('/api-key-setup', { state: { returnTo: window.location.pathname } });
        return;
      }

      setApiKey(data.gemini_key);
      window.__GEMINI_API_KEY = data.gemini_key;
    } catch (error) {
      console.error('Error checking API key:', error);
    }
  };

  const handleDocumentGenerated = (documentContent: string) => {
    // Here you can handle the generated document content
    // For example, display it in a modal or new section
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = documentContent;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Generated Document</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          </head>
          <body class="p-8">
            ${documentContent}
            <script>
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const documentTypes = [
    { id: 'invoice', title: 'Invoice', description: 'Create a professional invoice for your services or products' },
    { id: 'receipt', title: 'Receipt', description: 'Generate a receipt for payments received' },
    { id: 'quotation', title: 'Quotation', description: 'Prepare a detailed quotation for your clients' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="flex items-center text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Back to Home</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/api-key-setup"
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
              >
                <Settings className="w-5 h-5" />
                <span>API Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!documentType ? (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">Document Generator</h1>
                <p className="mt-4 text-lg text-gray-600">
                  Select the type of document you want to create
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {documentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setDocumentType(type.id)}
                    className="relative bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-left group"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-25 transition-all duration-300"></div>
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{type.title}</h3>
                      <p className="text-gray-600">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            apiKey && (
              <DocumentRequestHandler
                userMessage={`Create a ${documentType}`}
                onDocumentGenerated={handleDocumentGenerated}
                apiKey={apiKey}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default TaxAssistant;