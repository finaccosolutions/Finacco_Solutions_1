import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Settings, Send, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>('');

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('api_keys')
        .select('gemini_key')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setApiKey(data.gemini_key);
        window.__GEMINI_API_KEY = data.gemini_key;
      }
    } catch (error) {
      console.error('Error checking API key:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setCurrentUserMessage(userMessage);
    setShowDocumentForm(true);

    try {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      // Only proceed with Gemini API call if not handling a document request
      if (!showDocumentForm) {
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
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentGenerated = (documentContent: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content: documentContent }]);
    setShowDocumentForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg min-h-[calc(100vh-2rem)]">
          <div className="border-b border-gray-200 p-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">Tax AI Assistant</h1>
            <Link
              to="/api-key-setup"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>API Settings</span>
            </Link>
          </div>

          <div className="h-[calc(100vh-12rem)] overflow-y-auto p-4 space-y-4">
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
          </div>

          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
  );
};

export default ChatPage;