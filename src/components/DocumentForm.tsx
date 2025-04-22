import React from 'react';
import { Loader2 } from 'lucide-react';

interface DocumentField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  description?: string;
}

interface DocumentFormProps {
  documentType: string;
  fields: DocumentField[];
  formData: Record<string, string>;
  formErrors: Record<string, string>;
  isGenerating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (fieldId: string, value: string) => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({
  documentType,
  fields,
  formData,
  formErrors,
  isGenerating,
  onSubmit,
  onChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {documentType} Information
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details below to generate your document. Required fields are marked with an asterisk (*).
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.description && (
                <p className="mt-1 text-sm text-gray-500">{field.description}</p>
              )}
              
              <div className="mt-1">
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.id}
                    name={field.id}
                    value={formData[field.id] || ''}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className={`block w-full rounded-md shadow-sm ${
                      formErrors[field.id]
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id] || ''}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className={`block w-full rounded-md shadow-sm ${
                      formErrors[field.id]
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    required={field.required}
                  />
                )}
                
                {formErrors[field.id] && (
                  <p className="mt-2 text-sm text-red-600">{formErrors[field.id]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-8">
          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              'Generate Document'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentForm;