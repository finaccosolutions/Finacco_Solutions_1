import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, ArrowLeft, CheckCircle, ChevronRight, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface TemplateField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
  isRepeatable?: boolean;
  repeatableGroup?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category_id: string;
  template_html: string;
  fields: TemplateField[];
  created_at: string;
}

interface FormData {
  [key: string]: string | FormData[];
}

const CreateDocument = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('document_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (error) throw error;
        setTemplate(data);
        
        // Initialize form data structure
        const initialData: FormData = {};
        data.fields.forEach(field => {
          if (field.isRepeatable) {
            initialData[field.id] = [{}];
          } else {
            initialData[field.id] = '';
          }
        });
        setFormData(initialData);
      } catch (error) {
        console.error('Error fetching template:', error);
        navigate('/documents');
      } finally {
        setIsLoading(false);
      }
    };

    if (templateId) fetchTemplate();
  }, [templateId, navigate]);

  const handleFieldChange = (fieldId: string, value: string, index?: number) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (typeof index === 'number') {
        const group = [...(newData[fieldId] as FormData[])];
        group[index] = { ...group[index], [fieldId]: value };
        newData[fieldId] = group;
      } else {
        newData[fieldId] = value;
      }
      return newData;
    });

    // Clear error if field is corrected
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const addRepeatableGroup = (fieldId: string) => {
    setFormData(prev => {
      const newData = { ...prev };
      const group = [...(newData[fieldId] as FormData[])];
      group.push({});
      newData[fieldId] = group;
      return newData;
    });
  };

  const removeRepeatableGroup = (fieldId: string, index: number) => {
    setFormData(prev => {
      const newData = { ...prev };
      const group = [...(newData[fieldId] as FormData[])];
      group.splice(index, 1);
      newData[fieldId] = group;
      return newData;
    });
  };

  const validateStep = (stepFields: TemplateField[]) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    stepFields.forEach(field => {
      if (field.required) {
        if (field.isRepeatable) {
          const groups = formData[field.id] as FormData[];
          if (!groups || groups.length === 0) {
            errors[field.id] = `At least one ${field.label} is required`;
            isValid = false;
          } else {
            groups.forEach((group, index) => {
              if (!group[field.id]) {
                errors[`${field.id}_${index}`] = `${field.label} is required`;
                isValid = false;
              }
            });
          }
        } else if (!formData[field.id]) {
          errors[field.id] = `${field.label} is required`;
          isValid = false;
        }
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  const handleNextStep = () => {
    if (!template) return;
    
    const currentStepFields = template.fields.filter(
      field => field.repeatableGroup === `step${activeStep + 1}` || 
              (!field.repeatableGroup && activeStep === 0)
    );

    if (validateStep(currentStepFields)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setActiveStep(prev => prev - 1);
  };

  const generateDocument = async () => {
    if (!template) return;
    
    setIsGenerating(true);
    try {
      // Replace placeholders in the template HTML
      let htmlContent = template.template_html;
      
      // Replace simple fields
      Object.keys(formData).forEach(key => {
        if (!Array.isArray(formData[key])) {
          const value = formData[key] as string;
          htmlContent = htmlContent.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
        }
      });
      
      // Replace repeatable sections
      const repeatableGroups = template.fields.filter(f => f.isRepeatable);
      repeatableGroups.forEach(group => {
        const groups = formData[group.id] as FormData[];
        if (groups && groups.length > 0) {
          const pattern = new RegExp(`<!-- START ${group.id} -->([\\s\\S]*?)<!-- END ${group.id} -->`, 'g');
          const matches = htmlContent.match(pattern);
          
          if (matches) {
            const templateBlock = matches[0].replace(`<!-- START ${group.id} -->`, '').replace(`<!-- END ${group.id} -->`, '').trim();
            let renderedBlocks = '';
            
            groups.forEach(groupData => {
              let block = templateBlock;
              Object.keys(groupData).forEach(key => {
                block = block.replace(new RegExp(`\\[${key}\\]`, 'g'), groupData[key] as string);
              });
              renderedBlocks += block;
            });
            
            htmlContent = htmlContent.replace(pattern, renderedBlocks);
          }
        }
      });
      
      // Replace today's date
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      htmlContent = htmlContent.replace(/\[current_date\]/g, formattedDate);
      
      setGeneratedDocument(htmlContent);
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = () => {
    if (!generatedDocument) return;
    
    const element = document.createElement('div');
    element.innerHTML = generatedDocument;
    
    const opt = {
      margin: 15,
      filename: `${template?.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Template not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The requested document template could not be loaded.
        </p>
        <button
          onClick={() => navigate('/documents')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  if (generatedDocument) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
                <p className="mt-1 text-sm text-gray-500">Your document is ready!</p>
              </div>
              <button
                onClick={downloadDocument}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="-ml-1 mr-2 h-5 w-5" />
                Download PDF
              </button>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="document-preview border border-gray-200 rounded-lg p-6" dangerouslySetInnerHTML={{ __html: generatedDocument }} />
          </div>
          <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => navigate('/documents')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Another Document
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Group fields by step
  const stepFields = template.fields.filter(
    field => field.repeatableGroup === `step${activeStep + 1}` || 
            (!field.repeatableGroup && activeStep === 0)
  );

  const totalSteps = Math.max(
    ...template.fields
      .map(f => f.repeatableGroup ? parseInt(f.repeatableGroup.replace('step', '')) : 1)
      .filter(step => !isNaN(step))
  ) || 1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/documents')}
        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Templates
      </button>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{template.description}</p>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-4 border-b border-gray-200">
          <nav className="flex items-center justify-center" aria-label="Progress">
            <ol className="flex items-center space-x-8">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <li key={index} className="flex items-center">
                  {index < activeStep ? (
                    <button
                      onClick={() => setActiveStep(index)}
                      className="group flex items-center"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 group-hover:bg-indigo-800">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </span>
                      <span className="ml-3 text-sm font-medium text-indigo-600 group-hover:text-indigo-800">
                        Step {index + 1}
                      </span>
                    </button>
                  ) : index === activeStep ? (
                    <div className="flex items-center" aria-current="step">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-indigo-600">
                        <span className="text-indigo-600">{index + 1}</span>
                      </span>
                      <span className="ml-3 text-sm font-medium text-indigo-600">Step {index + 1}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-300">
                        <span className="text-gray-500">{index + 1}</span>
                      </span>
                      <span className="ml-3 text-sm font-medium text-gray-500">Step {index + 1}</span>
                    </div>
                  )}
                  {index < totalSteps - 1 && (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <form className="space-y-8">
            {stepFields.map((field) => (
              <div key={field.id} className="space-y-2">
                {!field.isRepeatable ? (
                  <div>
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                    )}
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.id}
                        name={field.id}
                        value={formData[field.id] as string || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        rows={4}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                          formErrors[field.id] ? 'border-red-300' : 'border'
                        }`}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        id={field.id}
                        name={field.id}
                        value={formData[field.id] as string || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                          formErrors[field.id] ? 'border-red-300' : 'border'
                        }`}
                      >
                        <option value="">Select an option</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        id={field.id}
                        name={field.id}
                        value={formData[field.id] as string || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                          formErrors[field.id] ? 'border-red-300' : 'border'
                        }`}
                      />
                    )}
                    {formErrors[field.id] && (
                      <p className="mt-1 text-sm text-red-600">{formErrors[field.id]}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                    )}
                    {(formData[field.id] as FormData[] || []).map((group, index) => (
                      <div key={index} className="mt-4 p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            {field.label} #{index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeRepeatableGroup(field.id, index)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        {template.fields
                          .filter(f => f.repeatableGroup === field.repeatableGroup)
                          .map(subField => (
                            <div key={subField.id} className="mt-2">
                              <label htmlFor={`${subField.id}_${index}`} className="block text-sm font-medium text-gray-700">
                                {subField.label}
                                {subField.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <input
                                type={subField.type}
                                id={`${subField.id}_${index}`}
                                name={`${subField.id}_${index}`}
                                value={group[subField.id] as string || ''}
                                onChange={(e) => handleFieldChange(subField.id, e.target.value, index)}
                                placeholder={subField.placeholder}
                                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                                  formErrors[`${subField.id}_${index}`] ? 'border-red-300' : 'border'
                                }`}
                              />
                              {formErrors[`${subField.id}_${index}`] && (
                                <p className="mt-1 text-sm text-red-600">{formErrors[`${subField.id}_${index}`]}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRepeatableGroup(field.id)}
                      className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add {field.label}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </form>
        </div>

        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          {activeStep > 0 ? (
            <button
              onClick={handlePrevStep}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Previous
            </button>
          ) : (
            <div></div>
          )}
          {activeStep < totalSteps - 1 ? (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Next
            </button>
          ) : (
            <button
              onClick={generateDocument}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Document'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateDocument;