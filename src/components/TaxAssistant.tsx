import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Brain, Trash2, AlertCircle, LogOut, Menu, Plus, Home, MessageSquare, Key, Download, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import Auth from './Auth';
import ApiKeySetup from './ApiKeySetup';
import { supabase } from '../lib/supabase';

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
  type: 'text' | 'email' | 'tel' | 'date' | 'number';
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
    // First check if this is a document request using Gemini
    const isDocRequest = await checkIfDocumentRequest(input);
    
    if (isDocRequest) {
      setIsDocumentMode(true);
      await handleDocumentRequest(input);
      setIsLoading(false);
      return;
    }

    // Normal message handling
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
              text: `You are a helpful assistant. Respond to this query: ${input}`
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

const checkIfDocumentRequest = async (text: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Is this a request to create a document? Only respond with "true" or "false": "${text}"`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 5
          }
        })
      }
    );

    const data = await response.json();
    return data.candidates[0]?.content?.parts?.[0]?.text?.toLowerCase().trim() === 'true';
  } catch (error) {
    console.error('Error checking document request:', error);
    return false;
  }
};

const handleDocumentRequest = async (query: string) => {
  setIsDocumentMode(true);
  setError(null);

  try {
    // Extract document type from query
    const docType = query.replace(/(draft|create|generate|write)\s+(a|an)?\s*/i, '').trim();
    setDocumentType(docType);
    
    // Get required fields from Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `What fields are needed to create a ${docType}? 
              Respond in JSON format:
              {
                "fields": [
                  {
                    "id": "string",
                    "label": "string",
                    "type": "text|email|tel|date|number|textarea",
                    "required": boolean,
                    "placeholder": "string",
                    "description": "string"
                  }
                ]
              }`
            }]
          }]
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

// Fallback fields if AI fails
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
    // First try AI generation with strict instructions
    try {
      const aiContent = await generateWithAI(data, docType);
      if (aiContent) return aiContent;
    } catch (aiError) {
      console.warn("AI generation failed, using fallback", aiError);
    }

    // Fallback to robust template
    return generateFallbackDocument(data, docType);
  } catch (error) {
    console.error("Document generation error:", error);
    throw new Error("Failed to generate document. Please try again.");
  }
};

const generateWithAI = async (data: Record<string, string>, docType: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a professional ${docType} document in HTML format using EXACTLY this data:
            ${JSON.stringify(data)}
            
            Requirements:
            1. Use standard business document structure
            2. Include all user data in proper sections
            3. Add professional styling with inline CSS
            4. Include signature lines if appropriate
            5. Format dates and numbers properly
            
            Return ONLY the HTML with:
            - Proper headings
            - Organized sections
            - All user data incorporated
            - No placeholder text`
          }]
        }],
        generationConfig: {
          temperature: 0.3 // More deterministic output
        }
      })
    }
  );

  if (!response.ok) throw new Error("API request failed");
  
  const result = await response.json();
  const content = result.candidates[0]?.content?.parts?.[0]?.text;
  return content.replace(/^```html|```$/g, "").trim();
};

const generateFallbackDocument = (data: Record<string, string>, docType: string) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .document { max-width: 800px; margin: 0 auto; padding: 30px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        h1 { color: #2c3e50; margin-bottom: 10px; }
        .section { margin-bottom: 25px; }
        .section-title { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; color: #2c3e50; }
        .field { margin-bottom: 15px; }
        .field-label { font-weight: bold; display: block; margin-bottom: 5px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; }
        .signature-box { width: 45%; }
        .signature-line { border-top: 1px solid #ccc; margin-top: 30px; padding-top: 5px; }
      </style>
    </head>
    <body>
      <div class="document">
        <div class="header">
          <h1>${docType.toUpperCase()}</h1>
          <p>Date: ${currentDate}</p>
        </div>
        
        ${Object.entries(data)
          .filter(([_, value]) => value)
          .map(([key, value]) => `
            <div class="section">
              <h3 class="section-title">${formatFieldLabel(key)}</h3>
              <div class="field-content">
                ${value.split("\n").map(para => `<p>${para}</p>`).join("")}
              </div>
            </div>
          `).join("")}
        
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Authorized Signature</div>
            <p>Date: _______________</p>
          </div>
          <div class="signature-box">
            <div class="signature-line">Recipient Signature</div>
            <p>Date: _______________</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const formatFieldLabel = (key: string) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, str => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, "$1 $2");
};

  const handleFormSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  console.log('Form submitted'); // Add this line
  
  if (!validateForm(formData, formFields)) {
    console.log('Form validation failed', formErrors); // Add this
    setError('Please correct the errors in the form');
    return;
  }

  console.log('Form data:', formData); // Add this to verify collected data
  
  setIsGeneratingDocument(true);
  setError(null);

  try {
    console.log('Generating document...'); // Add this
    const documentContent = await generateDocument(formData, documentType);
    console.log('Generated content:', documentContent); // Add this
    
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `
        <div class="space-y-6">
          ${documentContent}
          <div class="flex justify-end">
            <button
              onclick="window.downloadDocument(\`${documentContent.replace(/`/g, '\\`')}\`, '${documentType}')"
              class="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>Download PDF</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
      `,
      timestamp: new Date().toISOString(),
      isDocument: true
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsDocumentMode(false);
    setShowForm(false);
    setFormFields([]);
    setFormData({});
    setFormStep(0);
    setFormErrors({});
  } catch (error) {
    console.error('Error generating document:', error);
    setError(error.message);
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
            window.__GEMINI_API_KEY = apiKeyData.gemini_key;
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

// Add this useEffect with your other hooks
useEffect(() => {
  const handleDownload = (htmlContent: string, fileName: string) => {
    try {
      // Create a hidden iframe for printing
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.srcdoc = htmlContent;
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          const opt = {
            margin: 10,
            filename: `${fileName.replace(/[^a-z0-9]/gi, "_")}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { 
              scale: 2,
              logging: true,
              useCORS: true,
              allowTaint: true
            },
            jsPDF: { 
              unit: "mm",
              format: "a4",
              orientation: "portrait" 
            }
          };
          
          html2pdf()
            .set(opt)
            .from(iframe.contentDocument?.body || document.body)
            .save()
            .finally(() => {
              document.body.removeChild(iframe);
            });
        }, 500);
      };
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  window.downloadDocument = handleDownload;

  return () => {
    delete window.downloadDocument;
  };
}, []);

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

  const downloadDocument = async (content: string) => {
    const element = document.createElement('div');
    element.innerHTML = content;
    
    const opt = {
      margin: 1,
      filename: `${documentType.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
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
                <div
                  className={`rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-auto'
                      : 'bg-white shadow-sm border border-gray-100 mr-auto'
                  } max-w-[85%] break-words`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {message.name || (message.role === 'user' ? 'You' : 'Assistant')}
                    </span>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div
                    className={message.role === 'assistant' ? 'prose max-w-none' : ''}
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium">
                      {message.name?.[0]?.toUpperCase() || 'U'}
                    </span>
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
            
            {showForm && (
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {documentType} Information
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Fill in the details below to generate your document. Required fields are marked with an asterisk (*).
                  </p>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {formFields.map((field, index) => (
                      <div key={field.id} className={formStep === Math.floor(index / 3) ? 'block' : 'hidden'}>
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {field.description && (
                          <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                        )}
                        
                        <div className="mt-1">
                          <input
                            type={field.type}
                            id={field.id}
                            name={field.id}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className={`block w-full rounded-md shadow-sm ${
                              formErrors[field.id]
                                ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                            required={field.required}
                          />
                          
                          {formErrors[field.id] && (
                            <p className="mt-2 text-sm text-red-600">{formErrors[field.id]}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-8">
                    {formStep > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormStep(prev => prev - 1)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Previous
                      </button>
                    )}
                    
                    {formStep < Math.ceil(formFields.length / 3) - 1 ? (
                      <button
                        type="button"
                        onClick={() => setFormStep(prev => prev + 1)}
                        className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isGeneratingDocument}
                        className="ml-auto inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingDocument ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Generating...
                          </>
                        ) : (
                          'Generate Document'
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white safe-bottom">
          <div className="max-w-7xl mx-auto flex items-start gap-4">
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
                placeholder="Ask me about taxes... (Press Enter to send, Shift + Enter for new line)"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-300"
                style={{ minHeight: '56px', maxHeight: '200px' }}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`px-4 sm:px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105 flex-shrink-0 ${
                isLoading || !input.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaxAssistant;