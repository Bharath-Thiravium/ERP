import React, { useState, useRef, useEffect } from 'react';

import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Send, Bot, User, Database, Lightbulb, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../lib/api';

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
  type: 'success' | 'error' | 'help';
  message?: string;
  data?: any[];
  total_count?: number;
  sql?: string;
  table?: string;
  suggestion?: string;
  examples?: any;
  error_details?: string;
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

  const downloadReport = async (sql: string, filename: string) => {
    try {
      // Get full data from backend
      const response = await apiClient.post('/api/ai/export/', { sql });
      const fullData = response.data.data;
      
      if (!fullData || fullData.length === 0) {
        alert('No data to export');
        return;
      }
      
      // Convert to CSV
      const headers = Object.keys(fullData[0]);
      const csvContent = [
        headers.join(','),
        ...fullData.map((row: any) => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

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
      const response = await apiClient.post('/api/ai/query/', {
        question: queryText
      });

      const data: AIResponse = response.data;
      let aiMessage: AIMessage;

      if (data.type === 'success') {
        aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.message || 'Here are your results:',
          timestamp: new Date(),
          data: data.data,
          sql: data.sql
        };
      } else if (data.type === 'help') {
        let helpContent = data.message || 'I can help you with your data queries.';
        if (data.examples) {
          helpContent += '\n\nExamples by category:';
          Object.entries(data.examples).forEach(([category, examples]: [string, any]) => {
            helpContent += `\n\n${category}:`;
            examples.forEach((example: string) => {
              helpContent += `\n• ${example}`;
            });
          });
        }
        aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: helpContent,
          timestamp: new Date()
        };
      } else {
        // Error response
        aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.message || 'Sorry, I encountered an error processing your request.',
          timestamp: new Date(),
          suggestions: data.examples || ['Show me employees', 'List departments', 'Count customers']
        };
      }

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('AI Query Error:', error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Connection error. Please check your network and try again.',
        timestamp: new Date(),
        suggestions: ['Show me employees', 'List departments', 'Count customers', 'Show products', 'Recent invoices']
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
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4 w-full`}
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
        
        <div className={`rounded-lg p-4 shadow-sm max-w-full break-words ${
          message.type === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
        }`}>
          <p className="text-sm">{message.content}</p>
          
          {message.sql && (
            <div className="mt-3 p-3 bg-gray-900 dark:bg-gray-950 rounded-lg border border-gray-700">
              <div className="flex items-center mb-2 text-green-400">
                <Database className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Generated SQL:</span>
              </div>
              <pre className="text-green-300 text-xs font-mono whitespace-pre-wrap overflow-x-auto">{message.sql}</pre>
            </div>
          )}
          
          {message.suggestions && (
            <div className="mt-3">
              <p className="text-sm mb-2 text-gray-600 dark:text-gray-400 font-medium">Select a table to explore:</p>
              <div className="flex flex-wrap gap-2">
                {message.suggestions.map((table, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    className="text-xs bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    onClick={() => handleQuery(`Show me data from ${table}`)}
                  >
                    {table}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {message.data && message.data.length > 0 && (
            <div className="mt-3 w-full">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
                <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {message.data.length} records • First 4 columns shown
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-6 px-2"
                    onClick={() => downloadReport(message.sql!, 'query_results')}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Extract
                  </Button>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        {Object.keys(message.data[0]).slice(0, 4).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                            <div className="truncate max-w-[120px]" title={key}>
                              {key.length > 12 ? key.substring(0, 12) + '...' : key}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {message.data.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          {Object.values(row).slice(0, 4).map((cell: any, j) => (
                            <td key={j} className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              <div className="truncate max-w-[120px]" title={String(cell)}>
                                {cell === null || cell === undefined ? '-' : String(cell).substring(0, 20)}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[600px] flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <span>AI Database Assistant</span>
        </h3>
      </div>
      
      <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden mb-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 min-h-0">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map(renderMessage)}
            </AnimatePresence>
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 flex-shrink-0"
          >
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Try asking:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="outline"
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"
                  onClick={() => handleQuery(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex space-x-2 flex-shrink-0">
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
            className="bg-blue-500 hover:bg-blue-600 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;