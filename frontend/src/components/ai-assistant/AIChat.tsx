import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Send, Bot, User, Database, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  data?: any[];
  sql?: string;
  suggestions?: string[];
}

interface AIResponse {
  type: 'suggestion' | 'result' | 'error';
  data?: any[];
  tables?: string[];
  message?: string;
  sql?: string;
  count?: number;
  explanation?: string;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hi! I can help you query your database. Try asking: "Show me top 10 employees" or "Count total products"',
      timestamp: new Date()
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Show me top 10 employees by salary",
    "Count total products in inventory", 
    "Show recent orders",
    "List all departments",
    "Show customers from Mumbai"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuery = async (question?: string) => {
    const queryText = question || query;
    if (!queryText.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/ai/query/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText })
      });

      const data: AIResponse = await response.json();

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.message || data.explanation || 'Here are your results:',
        timestamp: new Date(),
        data: data.data,
        sql: data.sql,
        suggestions: data.tables
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const renderMessage = (message: AIMessage) => (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.type === 'user' ? 'bg-blue-500 ml-2' : 'bg-gray-500 mr-2'
        }`}>
          {message.type === 'user' ? 
            <User className="w-4 h-4 text-white" /> : 
            <Bot className="w-4 h-4 text-white" />
          }
        </div>
        
        <div className={`rounded-lg p-3 ${
          message.type === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}>
          <p className="text-sm">{message.content}</p>
          
          {message.sql && (
            <div className="mt-2 p-2 bg-gray-800 rounded text-green-400 text-xs font-mono">
              <div className="flex items-center mb-1">
                <Database className="w-3 h-3 mr-1" />
                SQL Query:
              </div>
              <pre className="whitespace-pre-wrap">{message.sql}</pre>
            </div>
          )}
          
          {message.suggestions && (
            <div className="mt-2">
              <p className="text-xs mb-2 opacity-75">Select a table to explore:</p>
              <div className="flex flex-wrap gap-1">
                {message.suggestions.map((table, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleQuery(`Show me data from ${table}`)}
                  >
                    {table}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {message.data && message.data.length > 0 && (
            <div className="mt-2 max-w-full overflow-x-auto">
              <div className="bg-white dark:bg-gray-900 rounded border">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {Object.keys(message.data[0]).map((key) => (
                        <th key={key} className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {message.data.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((cell: any, j) => (
                          <td key={j} className="px-2 py-1 text-gray-900 dark:text-gray-100">
                            {String(cell).length > 50 ? String(cell).substring(0, 50) + '...' : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {message.data.length > 5 && (
                  <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800">
                    Showing 5 of {message.data.length} results
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="text-xs opacity-50 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <span>AI Database Assistant</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          <AnimatePresence>
            {messages.map(renderMessage)}
          </AnimatePresence>
          
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Try asking:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleQuery(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex space-x-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your data..."
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleQuery()}
            disabled={loading}
            className="flex-1"
          />
          <Button 
            onClick={() => handleQuery()} 
            disabled={loading || !query.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChat;