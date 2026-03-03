import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Mic, Send, Bell, Volume2, MessageCircle, Loader2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/app/utils/api';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { useVoice } from '@/app/hooks/useVoice';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface Insight {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

export function AIAssistantTab() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [healthInsights, setHealthInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.get('/ai/insights');
      setHealthInsights(res.insights || []);
    } catch (err: any) {
      console.error('Failed to fetch health insights', err);
      // Fallback or empty state
    } finally {
      setLoadingInsights(false);
    }
  };

  const { isListening, startListening } = useVoice((result) => {
    setInputMessage(result);
  }, language);

  const quickActions = [
    '📋 Explain my latest report',
    '💊 My medication schedule',
    '⚠️ Health risk analysis',
    '🏥 Nearby hospitals',
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');

    try {
      const history = messages.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
      
      const res = await api.post('/records/ai/chat', { 
        message: inputMessage,
        history: history
      });
      const aiResponse: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: res.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      const errorResponse: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I am having trouble connecting to the server. ' + (err.message || ''),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    }
  };

  const handleQuickAction = (action: string) => {
    setInputMessage(action.substring(2).trim());
  };

  return (
    <div className="space-y-6">
      {/* AI Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-center gap-3">
          <motion.div
            className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t('aiHealthAssistant')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('multilingualVoiceEnabled')}
            </p>
          </div>
        </div>
      </Card>

      {/* Health Insights */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          {t('aiHealthInsights')}
        </h3>
        
        {loadingInsights ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : healthInsights.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t('noInsightsYet')}</p>
        ) : (
          healthInsights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`
                ${insight.type === 'success' ? 'bg-green-50 border-green-200' : ''}
                ${insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : ''}
                ${insight.type === 'info' ? 'bg-blue-50 border-blue-200' : ''}
              `}>
                <div className="flex items-start gap-3">
                  <Bell className={`w-5 h-5 flex-shrink-0 ${
                    insight.type === 'success' ? 'text-green-600' : ''
                  } ${
                    insight.type === 'warning' ? 'text-yellow-600' : ''
                  } ${
                    insight.type === 'info' ? 'text-blue-600' : ''
                  }`} />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.message}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Chat Interface */}
      <Card>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {t('chatWithAI')}
        </h3>

        {/* Messages */}
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-[#0b6e4f] text-white'
                    : 'bg-muted text-foreground'
                }`}
              >
                {message.type === 'ai' && (
                  <Badge variant="ai" className="mb-2">
                    <Sparkles className="w-3 h-3" />
                    {t('aiAssistant')}
                  </Badge>
                )}
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-white/70' : 'text-muted-foreground'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString(language === 'en' ? 'en-IN' : language, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">{t('quickActions')}:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-xs hover:bg-[#0b6e4f] hover:text-white transition-all"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <button 
            onClick={startListening}
            disabled={isListening}
            className="p-3 bg-muted rounded-lg hover:bg-accent transition-all disabled:opacity-50"
          >
            {isListening ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <Mic className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <input
            type="text"
            placeholder={t('askAnything')}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            variant="primary"
            onClick={handleSendMessage}
            icon={<Send className="w-5 h-5" />}
          >
            {t('continue')}
          </Button>
        </div>
      </Card>

      {/* "Explain like I'm 10" Feature */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🧒</div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              {t('explainLike10')}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t('explainLike10Desc')}
            </p>
            <Button variant="outline" size="sm" icon={<Volume2 className="w-4 h-4" />}>
              {t('tryVoiceExplanation')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
