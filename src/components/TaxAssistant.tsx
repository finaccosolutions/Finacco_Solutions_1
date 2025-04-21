import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Brain, Trash2, AlertCircle, LogOut, Menu, Plus, Home, MessageSquare } from 'lucide-react';
import OpenAI from 'openai';
import Auth from './Auth';
import ApiKeySetup from './ApiKeySetup';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  name?: string;
  isTyping?: boolean;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  user_id: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    new URL(SUPABASE_URL);
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 3;

const formatResponse = (text: string) => {
  // Convert headings: **Heading** becomes <h3>
  text = text.replace(/\*\*(.*?)\*\*/g, '<h3 class="text-xl font-bold text-gray-800 mt-4 mb-2">$1</h3>');

  // Safe italic formatting: *italic* only when surrounded by space or punctuation
  text = text.replace(/(^|\s)\*(\S[^*]*\S)\*(?=\s|\.|,|$)/g, '$1<em class="text-gray-600 italic">$2</em>');

  // Highlight Important/Key Notes
  text = text.replace(
    /(Important Points|Key Points|Note):/g,
    '<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r-lg"><h4 class="font-bold text-blue-800 mb-2">$1:</h4>'
  );

  // Section headers like Overview:, Details:, etc.
  text = text.replace(
    /^(Overview|Summary|Details|References):/gm,
    '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h3>'
  );

  // Bullet list formatting
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

  // Table formatting
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

  // Code block formatting
  text = text.replace(
    /```([^`]+)```/g,
    '<pre class="bg-gray-800 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto"><code>$1</code></pre>'
  );

  // Paragraph formatting
  text = text.replace(/\n\n/g, '</div>\n\n<div class="mb-4">');
  text = '<div class="mb-4">' + text + '</div>';

  // Cleanup stray "*"
  text = text.replace(/(^|\s)\*(?=\s|$)/g, '');

  return text;
};

const getFinaccoResponse = (query: string) => {
  const lowerQuery = query.toLowerCase();
  
  // Company overview
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

  // Contact information
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

  return null;
};

const TaxAssistant: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [isHistoryHovered, setIsHistoryHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useGemini, setUseGemini] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [typingMessage, setTypingMessage] = useState<Message | null>(null);
  const [textareaHeight, setTextareaHeight] = useState('56px');
  const [needsApiKey, setNeedsApiKey] = useState(false);
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
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadChatHistory(session.user.id);
        checkApiKey(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadChatHistory(session.user.id);
        checkApiKey(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkApiKey = async (userId: string) => {
    try {
      const { data: apiKey, error } = await supabase
        .from('api_keys')
        .select('gemini_key')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) throw error;

      if (apiKey?.gemini_key) {
        setUseGemini(true);
        window.__GEMINI_API_KEY = apiKey.gemini_key;
        setNeedsApiKey(false);
      } else {
        setUseGemini(false);
        setNeedsApiKey(true);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setUseGemini(false);
      setNeedsApiKey(true);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!supabase) {
      setError('Cannot save chat history: Supabase is not properly configured.');
      return;
    }

    if (!checkRateLimit()) return;

    setError(null);
    const userName = user?.email?.split('@')[0] || 'User';
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      name: userName
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    const typingIndicator: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      name: 'Finacco Solutions',
      isTyping: true
    };
    setTypingMessage(typingIndicator);

    try {
      const finaccoResponse = getFinaccoResponse(input);
      
      if (finaccoResponse) {
        let displayedContent = '';
        const words = finaccoResponse.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
          displayedContent += words[i] + ' ';
          setTypingMessage(prev => ({
            ...prev!,
            content: formatResponse(displayedContent)
          }));
        }

        const assistantResponse: Message = {
          id: typingIndicator.id,
          role: 'assistant',
          content: formatResponse(finaccoResponse),
          timestamp: new Date().toISOString(),
          name: 'Finacco Solutions'
        };
        
        setTypingMessage(null);
        const updatedMessages = [...messages, newMessage, assistantResponse];
        setMessages(updatedMessages);
        
        await saveToHistory(updatedMessages, input);
        return;
      }

      if (useGemini && window.__GEMINI_API_KEY) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${window.__GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a helpful and knowledgeable tax assistant in India. Reply to the following query with clear, concise, and accurate information focused only on the user's question. 
                      Avoid introductions or general explanations unless directly related. 
                      Use bullet points, tables, and section headings if helpful for clarity. 
                      Keep the language simple and easy to understand, especially for non-experts.
                      
                      User's query: ${input}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid response format from Gemini API');
        }

        let displayedContent = '';
        const words = data.candidates[0].content.parts[0].text.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
          displayedContent += words[i] + ' ';
          setTypingMessage(prev => ({
            ...prev!,
            content: formatResponse(displayedContent)
          }));
        }

        const text = formatResponse(data.candidates[0].content.parts[0].text);
        
        const assistantResponse: Message = {
          id: typingIndicator.id,
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
          name: 'Finacco Solutions'
        };

        setTypingMessage(null);
        const updatedMessages = [...messages, newMessage, assistantResponse];
        setMessages(updatedMessages);
        await saveToHistory(updatedMessages, input);
      } else {
        throw new Error('No API key available');
      }
    } catch (error) {
      console.error('Error:', error);
      setTypingMessage(null);
      let errorMessage = 'An unexpected error occurred. Please try again later.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm currently experiencing technical difficulties. Please try again in a few minutes.",
        timestamp: new Date().toISOString(),
        name: 'Finacco Solutions'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatHistory = async (userId: string) => {
    if (!supabase) return;
    
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
    if (!supabase) return;
    
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
    if (!supabase) return;
    
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
    if (!supabase) return;
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

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  if (needsApiKey) {
    return <ApiKeySetup onComplete={() => {
      setNeedsApiKey(false);
      if (user) {
        checkApiKey(user.id);
      }
    }} />;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-x-hidden">
      {/* History Panel - Hidden on mobile, collapsible on desktop */}
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

      {/* Mobile History Panel - Full screen overlay */}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen max-w-full">
        {/* Header */}
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

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Messages Container */}
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
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Form */}
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