import React, { useState } from 'react';
import DocumentGenerator from './DocumentGenerator';
import { Loader2 } from 'lucide-react';

interface DocumentRequestHandlerProps {
  userMessage: string;
  onDocumentGenerated: (document: string) => void;
  apiKey: string;
}

const DocumentRequestHandler: React.FC<DocumentRequestHandlerProps> = ({
  userMessage,
  onDocumentGenerated,
  apiKey,
}) => {
  const [loading, setLoading] = useState(true);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analyze the user's message to determine document type
  React.useEffect(() => {
    const analyzeRequest = async () => {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Analyze this request and determine what type of document the user wants to create. Only respond with one of these exact words: "invoice", "receipt", "quotation", or "other". If the request is not about creating a document, respond with "none". Request: "${userMessage}"`
                }]
              }]
            })
          }
        );

        if (!response.ok) {
          throw new Error('Failed to analyze request');
        }

        const data = await response.json();
        const documentType = data.candidates[0]?.content?.parts?.[0]?.text?.toLowerCase().trim();

        if (documentType && documentType !== 'none') {
          setDocumentType(documentType);
        } else {
          setError('This request does not appear to be for document creation.');
        }
      } catch (error) {
        console.error('Error analyzing request:', error);
        setError('Failed to analyze your request. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    analyzeRequest();
  }, [userMessage, apiKey]);

  const handleError = (error: string) => {
    setError(error);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Analyzing your request...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!documentType) {
    return null;
  }

  return (
    <DocumentGenerator
      documentType={documentType}
      onDocumentGenerated={onDocumentGenerated}
      onError={handleError}
    />
  );
};

export default DocumentRequestHandler;