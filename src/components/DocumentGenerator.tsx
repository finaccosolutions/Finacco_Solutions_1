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
  onDocumentGenerated: (content: string) => void;
  onError: (error: string) => void;
}

const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  documentType,
  onDocumentGenerated,
  onError,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const getDocumentFields = (): DocumentField[] => {
    switch (documentType.toLowerCase()) {
      case 'invoice':
        return [
          {
            id: 'invoiceNumber',
            label: 'Invoice Number',
            type: 'text',
            required: true,
            placeholder: 'e.g., INV-2025-001'
          },
          {
            id: 'clientName',
            label: 'Client Name',
            type: 'text',
            required: true,
            placeholder: 'Enter client name'
          },
          {
            id: 'clientEmail',
            label: 'Client Email',
            type: 'email',
            required: true,
            placeholder: 'Enter client email'
          },
          {
            id: 'clientAddress',
            label: 'Client Address',
            type: 'textarea',
            required: true,
            placeholder: 'Enter complete client address'
          },
          {
            id: 'invoiceDate',
            label: 'Invoice Date',
            type: 'date',
            required: true
          },
          {
            id: 'dueDate',
            label: 'Due Date',
            type: 'date',
            required: true
          },
          {
            id: 'items',
            label: 'Items and Prices',
            type: 'textarea',
            required: true,
            placeholder: 'Enter items (one per line)\nExample:\nWeb Design - $500\nHosting - $50',
            description: 'List each item with its price on a new line, separated by a hyphen'
          },
          {
            id: 'notes',
            label: 'Additional Notes',
            type: 'textarea',
            required: false,
            placeholder: 'Enter any additional notes or terms'
          }
        ];

      case 'receipt':
        return [
          {
            id: 'receiptNumber',
            label: 'Receipt Number',
            type: 'text',
            required: true,
            placeholder: 'e.g., RCP-2025-001'
          },
          {
            id: 'customerName',
            label: 'Customer Name',
            type: 'text',
            required: true,
            placeholder: 'Enter customer name'
          },
          {
            id: 'date',
            label: 'Date',
            type: 'date',
            required: true
          },
          {
            id: 'amount',
            label: 'Amount',
            type: 'number',
            required: true,
            placeholder: 'Enter amount'
          },
          {
            id: 'paymentMethod',
            label: 'Payment Method',
            type: 'text',
            required: true,
            placeholder: 'e.g., Cash, Card, Bank Transfer'
          },
          {
            id: 'description',
            label: 'Description',
            type: 'textarea',
            required: true,
            placeholder: 'Enter payment description'
          }
        ];

      case 'quotation':
        return [
          {
            id: 'quotationNumber',
            label: 'Quotation Number',
            type: 'text',
            required: true,
            placeholder: 'e.g., QT-2025-001'
          },
          {
            id: 'clientName',
            label: 'Client Name',
            type: 'text',
            required: true,
            placeholder: 'Enter client name'
          },
          {
            id: 'clientEmail',
            label: 'Client Email',
            type: 'email',
            required: true,
            placeholder: 'Enter client email'
          },
          {
            id: 'validUntil',
            label: 'Valid Until',
            type: 'date',
            required: true
          },
          {
            id: 'items',
            label: 'Items and Prices',
            type: 'textarea',
            required: true,
            placeholder: 'Enter items (one per line)\nExample:\nConsulting Services - $1000\nTraining - $500',
            description: 'List each item with its price on a new line, separated by a hyphen'
          },
          {
            id: 'terms',
            label: 'Terms and Conditions',
            type: 'textarea',
            required: false,
            placeholder: 'Enter terms and conditions'
          }
        ];

      default:
        return [
          {
            id: 'title',
            label: 'Document Title',
            type: 'text',
            required: true,
            placeholder: `Enter ${documentType} title`
          },
          {
            id: 'date',
            label: 'Date',
            type: 'date',
            required: true
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            placeholder: `Enter ${documentType} content`
          }
        ];
    }
  };

  const validateForm = (data: Record<string, string>, fields: DocumentField[]): boolean => {
    const errors: Record<string, string> = {};
    
    fields.forEach(field => {
      const value = data[field.id]?.trim() || '';
      
      if (field.required && !value) {
        errors[field.id] = `${field.label} is required`;
      } else if (value) {
        switch (field.type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors[field.id] = 'Please enter a valid email address';
            }
            break;
          case 'tel':
            if (!/^\+?[\d\s-()]+$/.test(value)) {
              errors[field.id] = 'Please enter a valid phone number';
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors[field.id] = 'Please enter a valid date';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors[field.id] = 'Please enter a valid number';
            }
            break;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateDocument = async (data: Record<string, string>) => {
    const fields = getDocumentFields();
    if (!validateForm(data, fields)) {
      onError('Please correct the errors in the form');
      return;
    }

    setIsGenerating(true);

    try {
      let documentContent = '';
      const currentDate = new Date().toLocaleDateString();
      
      switch (documentType.toLowerCase()) {
        case 'invoice':
          const items = data.items.split('\n').map(item => {
            const [description, price] = item.split('-').map(s => s.trim());
            return { description, price };
          });
          
          const total = items.reduce((sum, item) => {
            const price = parseFloat(item.price.replace(/[^0-9.-]+/g, ''));
            return sum + (isNaN(price) ? 0 : price);
          }, 0);
          
          documentContent = `
            <div class="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-lg">
              <div class="flex justify-between items-start mb-8">
                <div>
                  <h1 class="text-3xl font-bold text-gray-800">INVOICE</h1>
                  <p class="text-gray-600 mt-1">Invoice #: ${data.invoiceNumber}</p>
                </div>
                <div class="text-right">
                  <p class="font-medium">Date: ${data.invoiceDate}</p>
                  <p class="text-gray-600">Due Date: ${data.dueDate}</p>
                </div>
              </div>
              
              <div class="mb-8">
                <h2 class="text-lg font-semibold text-gray-700 mb-2">Bill To:</h2>
                <p class="text-gray-600">${data.clientName}</p>
                <p class="text-gray-600">${data.clientEmail}</p>
                <p class="text-gray-600 whitespace-pre-line">${data.clientAddress}</p>
              </div>
              
              <div class="mb-8">
                <table class="w-full">
                  <thead>
                    <tr class="border-b-2 border-gray-200">
                      <th class="text-left py-2">Description</th>
                      <th class="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map(item => `
                      <tr class="border-b border-gray-100">
                        <td class="py-2">${item.description}</td>
                        <td class="text-right py-2">${item.price}</td>
                      </tr>
                    `).join('')}
                    <tr class="font-bold">
                      <td class="py-2">Total</td>
                      <td class="text-right py-2">$${total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              ${data.notes ? `
                <div class="mb-8">
                  <h2 class="text-lg font-semibold text-gray-700 mb-2">Notes:</h2>
                  <p class="text-gray-600 whitespace-pre-line">${data.notes}</p>
                </div>
              ` : ''}
              
              <div class="text-gray-600 text-sm">
                <p>Thank you for your business!</p>
                <p>Please make payment by the due date.</p>
              </div>
            </div>
          `;
          break;
          
        case 'receipt':
          documentContent = `
            <div class="max-w-md mx-auto p-6 bg-white shadow-lg rounded-lg">
              <div class="text-center mb-6">
                <h1 class="text-2xl font-bold text-gray-800">RECEIPT</h1>
                <p class="text-gray-600">Receipt #: ${data.receiptNumber}</p>
              </div>
              
              <div class="space-y-4">
                <div class="flex justify-between">
                  <span class="text-gray-600">Date:</span>
                  <span class="font-medium">${data.date}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-gray-600">Received From:</span>
                  <span class="font-medium">${data.customerName}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-gray-600">Amount:</span>
                  <span class="font-medium">$${parseFloat(data.amount).toFixed(2)}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-gray-600">Payment Method:</span>
                  <span class="font-medium">${data.paymentMethod}</span>
                </div>
                
                <div class="border-t pt-4 mt-4">
                  <p class="text-gray-600">Description:</p>
                  <p class="font-medium whitespace-pre-line">${data.description}</p>
                </div>
              </div>
              
              <div class="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
                <p>Thank you for your payment!</p>
              </div>
            </div>
          `;
          break;
          
        case 'quotation':
          const quoteItems = data.items.split('\n').map(item => {
            const [description, price] = item.split('-').map(s => s.trim());
            return { description, price };
          });
          
          const quoteTotal = quoteItems.reduce((sum, item) => {
            const price = parseFloat(item.price.replace(/[^0-9.-]+/g, ''));
            return sum + (isNaN(price) ? 0 : price);
          }, 0);
          
          documentContent = `
            <div class="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-lg">
              <div class="flex justify-between items-start mb-8">
                <div>
                  <h1 class="text-3xl font-bold text-gray-800">QUOTATION</h1>
                  <p class="text-gray-600 mt-1">Quote #: ${data.quotationNumber}</p>
                </div>
                <div class="text-right">
                  <p class="font-medium">Date: ${currentDate}</p>
                  <p class="text-gray-600">Valid Until: ${data.validUntil}</p>
                </div>
              </div>
              
              <div class="mb-8">
                <h2 class="text-lg font-semibold text-gray-700 mb-2">Client Information:</h2>
                <p class="text-gray-600">${data.clientName}</p>
                <p class="text-gray-600">${data.clientEmail}</p>
              </div>
              
              <div class="mb-8">
                <table class="w-full">
                  <thead>
                    <tr class="border-b-2 border-gray-200">
                      <th class="text-left py-2">Description</th>
                      <th class="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${quoteItems.map(item => `
                      <tr class="border-b border-gray-100">
                        <td class="py-2">${item.description}</td>
                        <td class="text-right py-2">${item.price}</td>
                      </tr>
                    `).join('')}
                    <tr class="font-bold">
                      <td class="py-2">Total</td>
                      <td class="text-right py-2">$${quoteTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              ${data.terms ? `
                <div class="mb-8">
                  <h2 class="text-lg font-semibold text-gray-700 mb-2">Terms and Conditions:</h2>
                  <p class="text-gray-600 whitespace-pre-line">${data.terms}</p>
                </div>
              ` : ''}
              
              <div class="text-gray-600 text-sm">
                <p>This is a quotation on the goods/services named, subject to the conditions noted below:</p>
                <ul class="list-disc ml-5 mt-2">
                  <li>This quotation is valid until ${data.validUntil}</li>
                  <li>Prices are subject to change without notice</li>
                  <li>Terms of payment to be agreed upon confirmation</li>
                </ul>
              </div>
            </div>
          `;
          break;
          
        default:
          documentContent = `
            <div class="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-lg">
              <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">${data.title}</h1>
                <p class="text-gray-600 mt-2">Date: ${data.date}</p>
              </div>
              
              <div class="prose max-w-none whitespace-pre-line">
                ${data.content}
              </div>
            </div>
          `;
      }

      onDocumentGenerated(documentContent);
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