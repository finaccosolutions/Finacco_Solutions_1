import React, { useState } from 'react';
import DocumentForm from './DocumentForm';

interface DocumentField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  description?: string;
}

interface DocumentGeneratorProps {
  documentType: string;
  documentFields: DocumentField[]; // Now passed from parent
  onDocumentGenerated: (content: string) => void;
  onError: (error: string) => void;
}

const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  documentType,
  documentFields,
  onDocumentGenerated,
  onError,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDocument = async (data: Record<string, string>) => {
    if (!validateForm(data, documentFields)) {
      onError('Please correct the errors in the form');
      return;
    }

    setIsGenerating(true);

    try {
      // Use Gemini to generate the document content based on collected data
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Create a professional ${documentType} document using this data:
                ${JSON.stringify(data)}
                
                Respond with the HTML content for the document wrapped in <document></document> tags`
              }]
            }]
          })
        }
      );

      const result = await response.json();
      const content = result.candidates[0]?.content?.parts?.[0]?.text;
      
      // Extract document content between tags
      const docContent = content.match(/<document>(.*?)<\/document>/s)?.[1] || content;
      
      onDocumentGenerated(docContent);
    } catch (error) {
      console.error('Error generating document:', error);
      onError('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateDocument(formData);
  };

  return (
    <DocumentForm
      documentType={documentType}
      fields={getDocumentFields()}
      formData={formData}
      formErrors={formErrors}
      isGenerating={isGenerating}
      onSubmit={handleSubmit}
      onChange={handleFieldChange}
    />
  );
};

export default DocumentGenerator;