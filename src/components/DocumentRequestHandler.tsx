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
      // Ask Gemini to determine if this is a document request and what fields are needed
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze this request and determine:
                1. Is this a request to create a document? (true/false)
                2. If true, what document type is being requested?
                3. What fields are needed? Provide as JSON array:
                  [{"id":"field1","label":"Field 1","type":"text","required":true}]
                
                Respond in this exact JSON format:
                {
                  "isDocumentRequest": boolean,
                  "documentType": string|null,
                  "fields": array|null
                }
                
                Request: "${userMessage}"`
              }]
            }]
          })
        }
      );
  
      const data = await response.json();
      const resultText = data.candidates[0]?.content?.parts?.[0]?.text;
      const result = JSON.parse(resultText);
  
      if (result.isDocumentRequest && result.fields) {
        setDocumentType(result.documentType || 'custom');
        setDocumentFields(result.fields);
      } else {
        setError('Please specify what document you want to create.');
      }
    } catch (error) {
      console.error('Error analyzing request:', error);
      setError('Failed to analyze your request. Please try being more specific.');
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