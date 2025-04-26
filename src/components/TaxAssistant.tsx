import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Brain, Trash2, AlertCircle, LogOut, Menu, Plus, Home, MessageSquare, Key, Download, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js'; // Ensure this is imported
import Auth from './Auth';
import ApiKeySetup from './ApiKeySetup';
import { supabase } from '../lib/supabase';


const documentStyles = `
  .document-container {
    font-family: 'Noto Sans', Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
  }
  .document-header {
    text-align: center;
    margin-bottom: 30px;
    border-bottom: 2px solid #1a365d;
    padding-bottom: 15px;
  }
  .document-title {
    font-size: 24px;
    font-weight: 700;
    color: #1a365d;
    margin-bottom: 5px;
  }
  .document-subtitle {
    font-size: 16px;
    color: #4a5568;
  }
  .document-section {
    margin: 25px 0;
  }
  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: #1a365d;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 5px;
    margin-bottom: 15px;
  }
  .document-content {
    font-size: 14px;
    line-height: 1.6;
    color: #2d3748;
  }
  .signature-section {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
  }
  .signature-box {
    width: 45%;
  }
  .signature-line {
    border-top: 1px solid #000;
    margin-top: 50px;
    padding-top: 5px;
  }
  .stamp-placeholder {
    height: 80px;
    border: 1px dashed #ccc;
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #718096;
  }
  .important-clause {
    background-color: #f8f4e5;
    border-left: 4px solid #d69e2e;
    padding: 15px;
    margin: 20px 0;
    font-style: italic;
  }
`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  name?: string;
  isTyping?: boolean;
  isDocument?: boolean;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  user_id: string;
}

interface DocumentField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  description?: string;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let openai = null;
try {
  if (OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 3;

const formatResponse = (text: string) => {
  text = text.replace(/\*\*(.*?)\*\*/g, '<h3 class="text-xl font-bold text-gray-800 mt-4 mb-2">$1</h3>');
  text = text.replace(/(^|\s)\*(\S[^*]*\S)\*(?=\s|\.|,|$)/g, '$1<em class="text-gray-600 italic">$2</em>');
  text = text.replace(
    /(Important Points|Key Points|Note):/g,
    '<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r-lg"><h4 class="font-bold text-blue-800 mb-2">$1:</h4>'
  );
  text = text.replace(
    /^(Overview|Summary|Details|References):/gm,
    '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h3>'
  );

  if (text.match(/^[\*\-•●○]\s+/m)) {
    const lines = text.split('\n');
    let insideList = false;
    let formattedText = '';

    for (let line of lines) {
      if (/^[\*\-•●○]\s+/.test(line)) {
        if (!insideList) {
          insideList = true;
          formattedText += '\n<ul class="list-disc pl-6 my-4 space-y-2 text-gray-700">\n';
        }
        formattedText += `<li class="mb-2">${line.replace(/^[\*\-•●○]\s+/, '')}</li>\n`;
      } else {
        if (insideList) {
          insideList = false;
          formattedText += '</ul>\n';
        }
        formattedText += line + '\n';
      }
    }

    if (insideList) formattedText += '</ul>\n';
    text = formattedText;
  }

  if (text.includes('|')) {
    const blocks = text.split('\n\n');
    const formattedBlocks = blocks.map(block => {
      if (block.includes('|')) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) return block;

        const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
        const rows = lines.slice(2).map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));

        let tableHtml = `
          <div class="overflow-x-auto my-6">
            <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm">
              <thead>
                <tr class="bg-gradient-to-r from-blue-50 to-indigo-50">
                  ${headers.map(header => `
                    <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">${header}</th>
                  `).join('')}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-100">
                ${rows.map((row, i) => `
                  <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150">
                    ${row.map(cell => `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-b border-gray-100">${cell}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        return tableHtml;
      }
      return block;
    });

    text = formattedBlocks.join('\n\n');
  }

  text = text.replace(
    /```([^`]+)```/g,
    '<pre class="bg-gray-800 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto"><code>$1</code></pre>'
  );

  text = text.replace(/\n\n/g, '</div>\n\n<div class="mb-4">');
  text = '<div class="mb-4">' + text + '</div>';

  text = text.replace(/(^|\s)\*(?=\s|$)/g, '');

  return text;
};

const getFinaccoResponse = (query: string) => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('about finacco') || lowerQuery.includes('company information') || lowerQuery.includes('finacco solutions')) {
    return `
**About Finacco Solutions**

Finacco Solutions is a comprehensive financial and technology services provider offering:

* Financial Services:
  - GST Registration and Returns
  - Income Tax Filing
  - Business Consultancy
  - Company & LLP Services
  - TDS/TCS Services
  - Bookkeeping Services

* Technology Solutions:
  - Tally Prime Solutions
  - Data Import Tools
  - Financial Statement Preparation
  - Bank Reconciliation Tools
  - Custom Software Development
  - Web Development Services

**Contact Information:**
* Phone: +91 8590000761
* Email: contact@finaccosolutions.com
* Location: Mecca Tower, 2nd Floor, Court Road, Near Sree Krishna Theatre, Manjeri, Kerala-676521

**Business Hours:**
* Monday - Saturday: 9:30 AM - 6:00 PM
* Sunday: Closed

Visit our service platforms:
* [Finacco Advisory](https://advisory.finaccosolutions.com) - For all financial advisory services
* [Finacco Connect](https://connect.finaccosolutions.com) - For business utility software and Tally solutions
`;
  }

  if (lowerQuery.includes('contact') || lowerQuery.includes('phone') || lowerQuery.includes('email') || lowerQuery.includes('address')) {
    return `
**Contact Information for Finacco Solutions:**

* Phone: +91 8590000761
* Email: contact@finaccosolutions.com
* Address: Mecca Tower, 2nd Floor, Court Road, Near Sree Krishna Theatre, Manjeri, Kerala-676521

**Office Hours:**
* Monday - Saturday: 9:30 AM - 6:00 PM
* Sunday: Closed

Feel free to reach out to us through WhatsApp or email for quick responses.
`;
  }

  if (lowerQuery.includes('tally') || lowerQuery.includes('import') || lowerQuery.includes('connect') || lowerQuery.includes('utility software')) {
    return `
**Finacco Connect Services:**

Visit [Finacco Connect](https://connect.finaccosolutions.com) for:
* Tally Prime Solutions
  - Sales and Implementation
  - Training and Support
  - Customization Services
* Data Import Tools
  - Bank Statement Import
  - Tally Data Migration
  - Excel to Tally Integration
* Financial Statement Preparation
* Bank Reconciliation Tools
* Business Utility Software

For detailed information or support:
* Phone: +91 8590000761
* Email: contact@finaccosolutions.com
`;
  }

  if (lowerQuery.includes('advisory') || lowerQuery.includes('financial services')) {
    return `
**Finacco Advisory Services:**

Visit [Finacco Advisory](https://advisory.finaccosolutions.com) for:

* GST Services:
  - Registration
  - Monthly/Quarterly Returns
  - Annual Returns
  - GST Audit Support
  - E-way Bill Services

* Income Tax Services:
  - Individual Tax Filing
  - Business Tax Returns
  - Tax Planning
  - TDS Returns
  - Form 16/16A Generation

* Business Services:
  - Company Registration
  - LLP Formation
  - Business Consultancy
  - Bookkeeping Services
  - Financial Advisory

Contact us for professional assistance:
* Phone: +91 8590000761
* Email: contact@finaccosolutions.com
`;
  }

  return null;
};

const DocumentPreview = ({ 
  content, 
  docType,
  onEdit 
}: { 
  content: string; 
  docType: string;
  onEdit: () => void;
}) => {
  const downloadDocument = async () => {
    try {
      const element = document.createElement('div');
      element.innerHTML = `
        <style>${documentStyles}</style>
        <div class="document-container">
          ${content}
        </div>
      `;
      
      const opt = {
        margin: 15,
        filename: `${docType.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          logging: true,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' 
        }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-6">
      <style>{documentStyles}</style>
      <div className="document-preview bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div 
          className="document-container"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-all hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Inputs
          </button>
          <button
            onClick={downloadDocument}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

const TaxAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const [user, setUser] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [isHistoryHovered, setIsHistoryHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useGemini, setUseGemini] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [typingMessage, setTypingMessage] = useState<Message | null>(null);
  const [textareaHeight, setTextareaHeight] = useState('56px');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isDocumentMode, setIsDocumentMode] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formFields, setFormFields] = useState<DocumentField[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formStep, setFormStep] = useState(0);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestTimestamps = useRef<number[]>([]);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!input.trim() || isLoading) return;
  
  setIsLoading(true);
  setError(null);

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: input,
    timestamp: new Date().toISOString()
  };

  setMessages(prev => [...prev, userMessage]);
  setInput('');

  try {
    // First check if this is a request for a predefined document
    const isPredefinedDocRequest = await checkForPredefinedDocument(input);
    
    if (isPredefinedDocRequest) {
      const { templateId, templateName } = isPredefinedDocRequest;
      navigate(`/create-document/${templateId}`);
      setIsLoading(false);
      return;
    }

    // Then check if it's a generic document request
    const isDocRequest = await checkIfDocumentRequest(input);
    
    if (isDocRequest) {
      setIsDocumentMode(true);
      await handleDocumentRequest(input);
      setIsLoading(false);
      return;
    }

      const typingMessageId = Date.now().toString();
      setTypingMessage({
        id: typingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        name: 'Assistant',
        isTyping: true
      });

      const finaccoResponse = getFinaccoResponse(input);
      if (finaccoResponse) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: formatResponse(finaccoResponse),
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
        await saveToHistory([...messages, userMessage, assistantMessage], input);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a helpful and knowledgeable GST and Income Tax assistant. Your Name is Finacco Sollutions. Reply to the following query with clear, concise, and accurate information focused only on the user's question. 
                      Avoid introductions or general explanations unless directly related. 
                      Use bullet points, tables, and section headings if helpful for clarity. 
                      Keep the language simple and easy to understand, especially for non-experts.
                      User's query: ${input}`
              }]
            }]
          })
        }
      );

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const responseText = data.candidates[0]?.content?.parts?.[0]?.text;

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: formatResponse(responseText),
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveToHistory([...messages, userMessage, assistantMessage], input);
      
    } catch (error) {
      console.error('Error processing request:', error);
      setError('Failed to process your request. Please try again.');
    } finally {
      setIsLoading(false);
      setTypingMessage(null);
    }
  };

  const checkForPredefinedDocument = async (query: string): Promise<{ templateId: string, templateName: string } | null> => {
    try {
      const { data: templates, error } = await supabase
        .from('document_templates')
        .select('id, name, keywords');
        
      if (error) throw error;
      
      if (!templates) return null;
      
      const lowerQuery = query.toLowerCase();
      const matchingTemplate = templates.find(template => 
        template.keywords?.some((keyword: string) => 
          lowerQuery.includes(keyword.toLowerCase())
        ) || 
        lowerQuery.includes(template.name.toLowerCase())
      );
      
      return matchingTemplate ? { 
        templateId: matchingTemplate.id, 
        templateName: matchingTemplate.name 
      } : null;
    } catch (error) {
      console.error('Error checking predefined documents:', error);
      return null;
    }
  };

  const checkIfDocumentRequest = async (text: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Is this a request to create a document? Only respond with "true" or "false": "${text}"`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 5
            }
          })
        }
      );
  
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase().trim() === 'true';
    } catch (error) {
      console.error('Error checking document request:', error);
      return false;
    }
  };
  
  const handleDocumentRequest = async (query: string) => {
    setIsDocumentMode(true);
    setError(null);
  
    try {
      const docType = query.replace(/(draft|create|generate|write)\s+(a|an)?\s*/i, '').trim();
      setDocumentType(docType);
  
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate field list for Indian ${docType} document.
            
                    Requirements:
                    1. Include all parties, dates, amounts with ₹
                    2. Use Indian formats (DD/MM/YYYY)
                    3. Mark required fields
                    4. Include description/placeholder where helpful
                    
                    Return PURE JSON format ONLY:
                    {
                      "fields": [
                        {
                          "id": "party1_name",
                          "label": "First Party Name",
                          "type": "text",
                          "required": true,
                          "placeholder": "Full legal name",
                          "description": "As per legal documents"
                        }
                      ]
                    }
                    `.trim()
                  }
                ]
              }
            ]
          })
        }
      );

      const data = await response.json();
      const resultText = data.candidates[0]?.content?.parts?.[0]?.text;
      const jsonMatch = resultText.match(/{[\s\S]*}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { fields: [] };

      setFormFields(result.fields.length > 0 ? result.fields : getDefaultFields(docType));
      setShowForm(true);
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Let's create a ${docType}. Please provide the following information:`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error setting up document form:', error);
      setError('Failed to set up document form. Please try again.');
      setIsDocumentMode(false);
      setFormFields([]);
      setShowForm(false);
    }
  };

  const getDefaultFields = (docType: string): DocumentField[] => [
    {
      id: 'title',
      label: 'Document Title',
      type: 'text',
      required: true,
      placeholder: `Enter ${docType} title`
    },
    {
      id: 'parties',
      label: 'Parties Involved',
      type: 'textarea',
      required: true,
      placeholder: 'List all parties involved'
    },
    {
      id: 'details',
      label: 'Document Details',
      type: 'textarea',
      required: true,
      placeholder: 'Enter all relevant details'
    },
    {
      id: 'date',
      label: 'Effective Date',
      type: 'date',
      required: true
    }
  ];

  const generateDocument = async (data: Record<string, string>, docType: string) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate a professional ${docType} document in Indian format with perfect structure and formatting.
              
              User Data: ${JSON.stringify(data)}
              
              STRICT REQUIREMENTS:
              1. Use proper semantic HTML tags (h1, h2, p, strong)
              2. All dates in DD/MM/YYYY format (bold)
              3. Monetary values with ₹ symbol (bold)
              4. Parties clearly identified
              5. Use a formal, natural paragraph-based tone
              6. Use semantic HTML tags for formatting:
                - <h1> for the main title — ensure it's visually larger and bold.
                - <h2> for section headings — also bold and distinct.
                - <p> for paragraph text.
                - <strong> to highlight important elements such as names, dates, currency values, and keywords.
              7. Complete paragraphs (no bullet points unless specified)
              8. Return a **complete** HTML document:
              - Include <!DOCTYPE html>, <html>, <head>, <meta charset="UTF-8">, <body>
              - Add inline CSS for visual clarity:
                - font-family: 'Segoe UI', sans-serif;
                - margin: 20px;
                - h1: font-size: 24px; font-weight: bold;
                - h2: font-size: 18px; font-weight: bold;
                - p: font-size: 14px; line-height: 1.6;
              9. Ensure the layout is readable, clean, and consistently formatted.
              10. Standard clauses for ${docType}
              11. Ensure the generated HTML document uses a standard, readable font size and does not compress or shrink content to fit within a single page. 
                  Do not reduce font sizes or tighten line spacing unnaturally. Maintain consistent formatting and readability.
                  If the document content exceeds one page, allow it to continue naturally across multiple pages. Do not attempt to force-fit all text into one page.
                  Use standard paragraph spacing, normal font sizing, and proper margins for all content.
                  The document should look clean and professional whether printed or viewed digitally, without distortion or squishing.
                  Do not add page breaks manually unless instructed.
              12. Signature section at end
              
              FORMAT STRUCTURE EXAMPLE:
              <h1>[DOCUMENT TITLE]</h1>
              <p>This document is entered into on <strong>[Date]</strong> between [Party A] and [Party B]...</p>

              <h2>[SECTION HEADING]</h2>
              <p>[Section content as paragraph]</p>

              <h2>[SECTION HEADING]</h2>
              <p>[More details in paragraph form]</p>

              <h2>Signatures</h2>
              <table style="width: 100%; margin-top: 40px;">
                <tr>
                  <td style="width: 45%; text-align: center;">
                    ___________________________<br>
                    <strong>[First Party Name]</strong><br>
                    Signature
                  </td>
                  <td style="width: 10%;"></td>
                  <td style="width: 45%; text-align: center;">
                    ___________________________<br>
                    <strong>[Second Party Name]</strong><br>
                    Signature
                  </td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: center; padding-top: 40px;">
                    <strong>[Official Stamp if applicable]</strong>
                  </td>
                </tr>
              </table>


              
              Return COMPLETE HTML DOCUMENT with all formatting.`
                
              }]
            }],
            generationConfig: {
              temperature: 0.3 // More consistent legal output
            }
          })
        }
      );
  
      if (!response.ok) throw new Error("API request failed");
      
      const result = await response.json();
      const content = result.candidates[0]?.content?.parts?.[0]?.text;
      return content.replace(/^```html|```$/g, "").trim();
    } catch (error) {
      console.error("Document generation error:", error);
      throw new Error("Failed to generate document. Please try again.");
    }
  };
  

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData, formFields)) {
      setError("Please correct the form errors");
      return;
    }

    setIsGeneratingDocument(true);
    setError(null);

    try {
      const documentContent = await generateDocument(formData, documentType);
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `I've generated a ${documentType} document for you:`,
        timestamp: new Date().toISOString()
      };

      const documentMessage: Message = {
        id: `doc-${Date.now()}`,
        role: "assistant",
        content: documentContent,
        timestamp: new Date().toISOString(),
        isDocument: true
      };

      const updatedMessages = [...messages, assistantMessage, documentMessage];
      setMessages(updatedMessages);
      
      await saveToHistory(updatedMessages, `Generated ${documentType}`);
      
      setShowForm(false);
      setIsDocumentMode(false);
    } catch (error) {
      console.error("Document generation error:", error);
      setError("Failed to generate document. Please try again.");
    } finally {
      setIsGeneratingDocument(false);
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

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    if (!input) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = '56px';
      }
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const checkAuthAndApiKey = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data: apiKeyData, error: apiKeyError } = await supabase
            .from('api_keys')
            .select('gemini_key')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (!apiKeyError && apiKeyData?.gemini_key) {
            setHasApiKey(true);
            setApiKey(apiKeyData.gemini_key);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsCheckingAuth(false);
        setIsCheckingApiKey(false);
      }
    };

    checkAuthAndApiKey();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadChatHistory(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadChatHistory(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW
    );
    
    if (requestTimestamps.current.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestTimestamp = requestTimestamps.current[0];
      const timeUntilReset = RATE_LIMIT_WINDOW - (now - oldestTimestamp);
      const minutesUntilReset = Math.ceil(timeUntilReset / 60000);
      
      setError(`Rate limit exceeded. Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`);
      return false;
    }
    
    requestTimestamps.current.push(now);
    return true;
  };

  const createNewChat = async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTypingMessage(null);
    setCurrentChatId(null);
    setMessages([]);
    setError(null);
  };

  const loadChat = (chat: ChatHistory) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTypingMessage(null);
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setShowHistory(false);
  };

  const saveToHistory = async (messages: Message[], input: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (currentChatId) {
        await supabase
          .from('chat_histories')
          .update({
            messages: messages,
          })
          .eq('id', currentChatId);
      } else {
        const { data: newChat } = await supabase
          .from('chat_histories')
          .insert([{
            messages: messages,
            title: input.length > 100 ? input.slice(0, 100) + '...' : input,
            user_id: user.id
          }])
          .select()
          .single();
          
        if (newChat) setCurrentChatId(newChat.id);
      }
      
      loadChatHistory(user.id);
    }
  };

  const loadChatHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setChatHistories(data);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setError('Failed to load chat history. Please try again later.');
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('chat_histories')
        .delete()
        .eq('id', chatId);
        
      if (error) throw error;
      
      setChatHistories(prev => prev.filter(chat => chat.id !== chatId));
      if (chatId === currentChatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError('Failed to delete chat. Please try again later.');
    }
  };

  const clearChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('chat_histories')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError) throw deleteError;

      setMessages([]);
      setChatHistories([]);
      setCurrentChatId(null);
      setError(null);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      setError('Failed to clear chat history. Please try again later.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMessages([]);
    setChatHistories([]);
    setCurrentChatId(null);
  };

  const handleHistoryMouseEnter = () => {
    setIsHistoryHovered(true);
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
  };

  const handleHistoryMouseLeave = () => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
    historyTimeoutRef.current = setTimeout(() => {
      setIsHistoryHovered(false);
    }, 300);
  };

  const handleApiKeySetup = () => {
    navigate('/api-key-setup', { state: { returnUrl: '/tax-assistant' } });
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
      <div className="flex items-center justify-between p-4 max-w-full overflow-x-auto">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowHistory(true)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Brain className="text-white" size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">Tax Assistant AI</h1>
            <p className="text-sm text-white/80 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={handleApiKeySetup}
            className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Key size={20} />
            <span className="hidden sm:inline">API Settings</span>
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Home size={20} />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <button
            onClick={clearChat}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
            title="Clear all chats"
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {documentType}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Please fill in all required fields</p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setIsDocumentMode(false);
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formFields.map((field) => (
              <div
                key={field.id}
                className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}
              >
                <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.description && (
                  <p className="text-xs text-gray-500 mb-1">{field.description}</p>
                )}
                
                {field.type === "textarea" ? (
                  <textarea
                    id={field.id}
                    name={field.id}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className={`block w-full rounded-lg border bg-white ${
                      formErrors[field.id]
                        ? "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    } shadow-sm transition-all duration-200 p-3`}
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className={`block w-full rounded-lg border bg-white ${
                      formErrors[field.id]
                        ? "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    } shadow-sm px-4 py-2.5 transition-all duration-200`}
                    required={field.required}
                  />
                )}
                
                {formErrors[field.id] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors[field.id]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent p-4 border-t border-gray-200 rounded-b-xl">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setIsDocumentMode(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleFormSubmit}
              disabled={isGeneratingDocument}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingDocument ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generate Document
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isCheckingAuth || isCheckingApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  if (!hasApiKey) {
    return <ApiKeySetup onComplete={() => setHasApiKey(true)} returnUrl="/tax-assistant" />;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-x-hidden">
      {/* Sidebar */}
      <div 
        className={`hidden md:flex fixed md:relative inset-y-0 left-0 transform ${
          showHistory ? 'w-[280px]' : 'w-[50px]'
        } transition-all duration-300 ease-in-out z-40 bg-gradient-to-br from-gray-800 to-gray-900 h-full flex-col`}
        onMouseEnter={handleHistoryMouseEnter}
        onMouseLeave={handleHistoryMouseLeave}
      >
        <div className="flex-1 overflow-hidden">
          <div className={`flex items-center justify-end p-4 ${showHistory ? 'justify-between' : 'justify-center'}`}>
            {showHistory && (
              <div className="flex items-center gap-2 text-white">
                <Brain size={20} />
                <h2 className="text-lg font-semibold">Chat History</h2>
              </div>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              <Menu size={20} />
            </button>
          </div>

          {showHistory && (
            <>
              <div className="flex gap-2 px-4 py-2">
                <button
                  onClick={() => {
                    createNewChat();
                    setShowHistory(false);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white py-2 px-4 rounded-lg hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  <span>New Chat</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
                {chatHistories.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    className={`group relative hover:bg-white/5 p-4 rounded-lg cursor-pointer transition-all duration-300 mb-2 ${
                      currentChatId === chat.id ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare size={20} className="text-white/70" />
                      <div className="flex-grow min-w-0 pr-8">
                        <p className="text-sm font-medium text-white line-clamp-4">{chat.title}</p>
                        <p className="text-xs text-white/70 mt-1">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
                      >
                        <Trash2 size={16} className="text-white/70" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile History Panel */}
      {showHistory && (
        <div className="md:hidden fixed inset-0 bg-gradient-to-br from-gray-800 to-gray-900 z-50 flex flex-col">
          <div className="safe-top flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white">
              <Brain size={20} />
              <h2 className="text-lg font-semibold">Chat History</h2>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex gap-2 px-4 py-2">
            <button
              onClick={() => {
                createNewChat();
                setShowHistory(false);
              }}
              className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white py-2 px-4 rounded-lg hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
            {chatHistories.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  loadChat(chat);
                  setShowHistory(false);
                }}
                className={`group relative hover:bg-white/5 p-4 rounded-lg cursor-pointer transition-all duration-300 mb-2 ${
                  currentChatId === chat.id ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare size={20} className="text-white/70" />
                  <div className="flex-grow min-w-0 pr-8">
                    <p className="text-sm font-medium text-white line-clamp-4">{chat.title}</p>
                    <p className="text-xs text-white/70 mt-1">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
                  >
                    <Trash2 size={16} className="text-white/70" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen max-w-full">
        {renderHeader()}

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Brain className="text-white" size={18} />
                  </div>
                )}
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium">
                      {message.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              {message.isDocument ? (
                    <DocumentPreview 
                      content={message.content} 
                      docType={documentType}
                      onEdit={() => {
                        setShowForm(true);
                        setIsDocumentMode(true);
                      }}
                    />
                  ) : (
                    <div className={`rounded-xl p-5 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                        : 'bg-white shadow-sm border border-gray-100'
                    } max-w-[90%] break-words`}>
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: message.content }} />
                    </div>
                  )}
                </div>
              ))}
            
            {typingMessage && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                  <Brain className="text-white" size={18} />
                </div>
                <div className="rounded-lg p-4 bg-white shadow-sm border border-gray-100 mr-auto max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{typingMessage.name}</span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                  {typingMessage.content && (
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: typingMessage.content }}
                    />
                  )}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Form */}
<form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 safe-bottom">
  <div className="max-w-5xl mx-auto">
    <div className="relative flex items-center gap-4">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                handleSubmit(e);
              }
            }
          }}
          placeholder="Ask about GST, Income Tax, or request a document draft..."
          className="w-full px-5 py-4 rounded-xl border-2 border-indigo-100 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none transition-all duration-300 bg-white shadow-sm hover:shadow-md"
          style={{ minHeight: '64px', maxHeight: '200px' }}
          disabled={isLoading}
        />
        <div className="absolute right-3 bottom-3 text-xs text-gray-400">
          {input.length}/1000
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className={`p-4 rounded-xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 flex-shrink-0 ${
          isLoading || !input.trim()
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:from-indigo-700 hover:to-blue-700'
        }`}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={24} />
        ) : (
          <Send size={24} />
        )}
      </button>
    </div>
    <div className="mt-2 flex justify-center gap-2">
      <span className="text-xs text-gray-500">Try: "Draft a rental agreement" or "Explain GST rates in India"</span>
    </div>
  </div>
</form>
      </div>

      {/* Document Form */}
      {showForm && renderForm()}
    </div>
  );
};

export default TaxAssistant;