import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Settings, Send, Loader2, Brain, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import DocumentRequestHandler from './DocumentRequestHandler';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

const TaxAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkApiKey = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { state: { returnTo: window.location.pathname } });
        return;
      }

      const { data, error } = await supabase
        .from('api_keys')
        .select('gemini_key')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      
      if (!data?.gemini_key) {
        navigate('/api-key-setup', { state: { returnTo: window.location.pathname } });
        return;
      }

      setApiKey(data.gemini_key);
      window.__GEMINI_API_KEY = data.gemini_key;
    } catch (error) {
      console.error('Error checking API key:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from('chat_histories')
        .insert([
          {
            title: 'New Chat',
            messages: [],
            user_id: session.user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating new chat:', error);
      return null;
    }
  };

  const updateChatHistory = async (chatId: string, newMessages: Message[]) => {
    try {
      const { error } = await supabase
        .from('chat_histories')
        .update({
          messages: newMessages,
          title: newMessages[0]?.content.slice(0, 50) || 'New Chat'
        })
        .eq('id', chatId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating chat history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setCurrentUserMessage(userMessage);

    try {
      if (!currentChatId) {
        const newChatId = await createNewChat();
        setCurrentChatId(newChatId);
      }

      const updatedMessages = [...messages, { role: 'user', content: userMessage }];
      setMessages(updatedMessages);

      if (currentChatId) {
        await updateChatHistory(currentChatId, updatedMessages);
      }

      // Check if the message is about creating a document
      const documentResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze if this request is about creating a document. Only respond with "yes" or "no": "${userMessage}"`
              }]
            }]
          })
        }
      );

      const documentData = await documentResponse.json();
      const isDocumentRequest = documentData.candidates[0]?.content?.parts?.[0]?.text?.toLowerCase().trim() === 'yes';

      if (isDocumentRequest) {
        setShowDocumentForm(true);
      } else {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: userMessage
                }]
              }]
            })
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to get response');
        }

        const assistantMessage = data.candidates[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
        const newMessages = [...updatedMessages, { role: 'assistant', content: assistantMessage }];
        setMessages(newMessages);

        if (currentChatId) {
          await updateChatHistory(currentChatId, newMessages);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = 'Sorry, there was an error processing your request. Please try again.';
      const newMessages = [...messages, { role: 'assistant', content: errorMessage }];
      setMessages(newMessages);

      if (currentChatId) {
        await updateChatHistory(currentChatId, newMessages);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentGenerated = async (documentContent: string) => {
    const newMessages = [...messages, { role: 'assistant', content: documentContent }];
    setMessages(newMessages);
    setShowDocumentForm(false);

    if (currentChatId) {
      await updateChatHistory(currentChatId, newMessages);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex flex-col">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Link to="/" className="flex items-center text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  <span>Back to Home</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/api-key-setup"
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
                >
                  <Settings className="w-5 h-5" />
                  <span>API Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="h-full flex flex-col bg-white shadow-xl rounded-lg my-8">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <ReactMarkdown className="prose prose-sm max-w-none">
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    </div>
                  </div>
                )}
                {showDocumentForm && apiKey && (
                  <DocumentRequestHandler
                    userMessage={currentUserMessage}
                    onDocumentGenerated={handleDocumentGenerated}
                    apiKey={apiKey}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSubmit} className="flex space-x-4">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxAssistant;