import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DocumentTextIcon, FolderIcon, TrashIcon, PencilIcon, PlusIcon, CogIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category_id: string;
  template_html: string;
  fields: TemplateField[];
  keywords: string[];
  created_at: string;
}

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

const DocumentTemplatesAdmin = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<DocumentTemplate | null>(null);
  const [htmlEditor, setHtmlEditor] = useState('');
  const [fieldEditor, setFieldEditor] = useState('');
  const [activeTab, setActiveTab] = useState('fields');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: templatesData, error: templatesError } = await supabase
          .from('document_templates')
          .select('*');

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('document_categories')
          .select('*');

        if (templatesError || categoriesError) throw templatesError || categoriesError;

        setTemplates(templatesData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEditTemplate = (template: DocumentTemplate) => {
    setCurrentTemplate(template);
    setHtmlEditor(template.template_html);
    setFieldEditor(JSON.stringify(template.fields, null, 2));
    setShowTemplateModal(true);
  };

  const handleCreateTemplate = () => {
    setCurrentTemplate(null);
    setHtmlEditor('');
    setFieldEditor('[]');
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        name: currentTemplate?.name || 'New Template',
        description: currentTemplate?.description || '',
        category_id: currentTemplate?.category_id || categories[0]?.id,
        template_html: htmlEditor,
        fields: JSON.parse(fieldEditor),
        keywords: currentTemplate?.keywords || []
      };

      if (currentTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('document_templates')
          .update(templateData)
          .eq('id', currentTemplate.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from('document_templates')
          .insert([templateData]);

        if (error) throw error;
      }

      // Refresh templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('document_templates')
        .select('*');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);
      setShowTemplateModal(false);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        const { error } = await supabase
          .from('document_templates')
          .delete()
          .eq('id', templateId);

        if (error) throw error;

        setTemplates(prev => prev.filter(t => t.id !== templateId));
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
        <button
          onClick={handleCreateTemplate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          New Template
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Manage Templates</h3>
          <p className="mt-1 text-sm text-gray-500">Create and edit document templates for your users.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fields
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-md flex items-center justify-center">
                        <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{template.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getCategoryName(template.category_id)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{template.fields.length} fields</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Editor Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {currentTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex">
              {/* Left sidebar - Template details */}
              <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={currentTemplate?.name || ''}
                      onChange={(e) => setCurrentTemplate(prev => ({
                        ...(prev || {} as DocumentTemplate),
                        name: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={currentTemplate?.description || ''}
                      onChange={(e) => setCurrentTemplate(prev => ({
                        ...(prev || {} as DocumentTemplate),
                        description: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={currentTemplate?.category_id || categories[0]?.id || ''}
                      onChange={(e) => setCurrentTemplate(prev => ({
                        ...(prev || {} as DocumentTemplate),
                        category_id: e.target.value
                      }))}
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Keywords (comma separated)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={currentTemplate?.keywords?.join(', ') || ''}
                      onChange={(e) => setCurrentTemplate(prev => ({
                        ...(prev || {} as DocumentTemplate),
                        keywords: e.target.value.split(',').map(k => k.trim())
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              {/* Main content - Template editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveTab('fields')}
                      className={`py-4 px-6 text-sm font-medium ${activeTab === 'fields' ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                      Fields Definition
                    </button>
                    <button
                      onClick={() => setActiveTab('html')}
                      className={`py-4 px-6 text-sm font-medium ${activeTab === 'html' ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                      HTML Template
                    </button>
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`py-4 px-6 text-sm font-medium ${activeTab === 'preview' ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                      Preview
                    </button>
                  </nav>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                  {activeTab === 'fields' && (
                    <div className="h-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fields Definition (JSON)
                      </label>
                      <textarea
                        className="w-full h-full font-mono text-sm p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={fieldEditor}
                        onChange={(e) => setFieldEditor(e.target.value)}
                        spellCheck={false}
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        Define the form fields for this template in JSON format.
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'html' && (
                    <div className="h-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HTML Template
                      </label>
                      <textarea
                        className="w-full h-full font-mono text-sm p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={htmlEditor}
                        onChange={(e) => setHtmlEditor(e.target.value)}
                        spellCheck={false}
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        Use [field_id] for placeholders. For repeatable sections, wrap in &lt;!-- START group_id --&gt; and &lt;!-- END group_id --&gt;.
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'preview' && (
                    <div className="h-full">
                      <div className="border border-gray-200 rounded-lg p-4 h-full overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: htmlEditor }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <CheckIcon className="-ml-1 mr-2 h-5 w-5" />
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTemplatesAdmin;