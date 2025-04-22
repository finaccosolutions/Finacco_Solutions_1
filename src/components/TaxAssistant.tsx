import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Brain, Trash2, AlertCircle, LogOut, Menu, Plus, Home, MessageSquare, Key, Download } from 'lucide-react';
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
  type: string;
  required: boolean;
  value?: string;
  options?: string[];
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
  const [documentFields, setDocumentFields] = useState<DocumentField[]>([]);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [collectedData, setCollectedData] = useState<Record<string, string>>({});
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestTimestamps = useRef<number[]>([]);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleDocumentRequest = async (query: string) => {
    setIsDocumentMode(true);
    setShowDocumentForm(true);
    setDocumentType(query.replace(/^(draft|create|generate|write)\s+an?\s+/i, '').trim());
    
    try {
      const fieldsPrompt = `For a ${documentType}, list the required fields as a JSON array in this exact format, with no additional text before or after:
      {
        "fields": [
          {
            "id": "field_1",
            "label": "Field Label",
            "type": "text|date|number|select",
            "required": true,
            "placeholder": "Enter value...",
            "description": "Help text for the field",
            "options": ["Option 1", "Option 2"]
          }
        ]
      }`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fieldsPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 1,
              maxOutputTokens: 1000,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_DANGEROUS",
                threshold: "BLOCK_NONE"
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text.trim();
      
      console.log('Raw API response:', responseText); // For debugging

      // Try to parse the entire response first
      try {
        const fieldsData = JSON.parse(responseText);
        if (fieldsData.fields && Array.isArray(fieldsData.fields)) {
          setDocumentFields(fieldsData.fields);
          setCollectedData({});
          return;
        }
      } catch (e) {
        console.log('Failed to parse complete response, trying to extract JSON');
      }

      // If direct parsing fails, try to extract JSON using regex
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON object found in the response');
      }

      try {
        const fieldsData = JSON.parse(jsonMatch[0]);
        if (!fieldsData.fields || !Array.isArray(fieldsData.fields)) {
          throw new Error('Invalid fields data structure');
        }
        setDocumentFields(fieldsData.fields);
        setCollectedData({});
      } catch (error) {
        console.error('JSON parsing error:', error);
        throw new Error('Failed to parse the fields data structure');
      }

    } catch (error) {
      console.error('Error getting document fields:', error);
      
      // Fallback fields for basic document creation
      const fallbackFields = [
        {
          id: "title",
          label: "Document Title",
          type: "text",
          required: true,
          placeholder: "Enter document title",
          description: "The main title of your document"
        },
        {
          id: "content",
          label: "Document Content",
          type: "text",
          required: true,
          placeholder: "Enter the main content",
          description: "The main body of your document"
        },
        {
          id: "date",
          label: "Date",
          type: "date",
          required: true,
          description: "The date of the document"
        }
      ];

      setError('Failed to get custom fields. Using basic document template instead.');
      setDocumentFields(fallbackFields);
      setCollectedData({});
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-x-hidden">
      {/* ... [Rest of the component JSX remains unchanged] ... */}
    </div>
  );
};

export default TaxAssistant;