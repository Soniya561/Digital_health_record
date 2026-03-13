import React, { useState, useEffect, useRef } from 'react';
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
  const [isELIMode, setIsELIMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [shouldSpeakNext, setShouldSpeakNext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchInsights();
  }, []);

  useEffect(() => {
    if (shouldSpeakNext && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'ai') {
        speak(lastMessage.content);
        setShouldSpeakNext(false);
      }
    }
  }, [messages, shouldSpeakNext]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Map application language to speech recognition language
      switch (language) {
        case 'ml':
          utterance.lang = 'ml-IN';
          break;
        case 'hi':
          utterance.lang = 'hi-IN';
          break;
        case 'bn':
          utterance.lang = 'bn-IN';
          break;
        case 'kn':
          utterance.lang = 'kn-IN';
          break;
        default:
          utterance.lang = 'en-US';
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

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

  const { isListening, startListening, error: voiceError, secureOriginUrl, isSecureContextOk } = useVoice((result) => {
    setInputMessage(result);
    // Automatically send if voice result received
    setTimeout(() => handleSendMessage(result), 500);
  }, language);

  const quickActions = [
    '📋 Explain my latest report',
    '💊 My medication schedule',
    '⚠️ Health risk analysis',
    '🏥 Nearby hospitals',
  ];

  const handleSendMessage = async (overrideMessage?: string) => {
    const messageText = overrideMessage || inputMessage;
    if (!messageText.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    if (!overrideMessage) setInputMessage('');
    if (isELIMode) setShouldSpeakNext(true);

    try {
      const history = messages.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
      
      const prompt = isELIMode && !overrideMessage
        ? `Explain the following query in very simple terms, as if you are talking to a 10-year-old child. Avoid medical jargon. Query: ${messageText}`
        : messageText;

      const res = await api.post('/records/ai/chat', { 
        message: prompt,
        history: history
      });
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: res.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
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
      <Card className="!bg-yellow-400 border-yellow-500 text-black">
        <div className="flex items-center gap-3">
          <motion.div
            className="p-3 bg-black rounded-xl"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-black">{t('aiHealthAssistant')}</h2>
            <p className="text-sm text-black font-medium">
              {t('multilingualVoiceEnabled')}
            </p>
          </div>
        </div>
      </Card>

      {/* Smart Reminders (Moved from Appointments) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="!bg-yellow-300 border-yellow-400 shadow-sm hover:shadow-md transition-all text-black">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-black/10 rounded-lg">
              <Bell className="w-6 h-6 text-black animate-bounce" />
            </div>
            <div>
              <h3 className="font-semibold text-black mb-1">{t('smartReminders')}</h3>
              <p className="text-sm text-black leading-relaxed font-medium">
                {t('smartRemindersDesc')}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

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
                onClick={() => message.type === 'ai' && speak(message.content)}
                className={`max-w-[80%] rounded-2xl px-4 py-3 cursor-pointer group transition-all ${
                  message.type === 'user'
                    ? 'bg-[#0b6e4f] text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {message.type === 'ai' && (
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="ai">
                      <Sparkles className="w-3 h-3" />
                      {t('aiAssistant')}
                    </Badge>
                    <Volume2 className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                  </div>
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
          <div ref={messagesEndRef} />
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
        {!isSecureContextOk && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center justify-between gap-3">
            <span>Voice input needs HTTPS on this device.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (secureOriginUrl) window.location.href = secureOriginUrl;
              }}
            >
              Open HTTPS
            </Button>
          </div>
        )}
        {voiceError && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Voice input: {voiceError}
          </div>
        )}
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
      <Card className={`transition-all duration-300 ${
        isELIMode 
          ? 'bg-gradient-to-br from-[#ffd54f] to-[#ffb300] border-amber-400 shadow-lg scale-[1.02]' 
          : '!bg-yellow-400 border-yellow-500 shadow-sm text-black'
      }`}>
        <div className="flex items-start gap-4">
          <motion.div 
            className="text-4xl"
            animate={isELIMode ? {
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🧒
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-bold text-lg ${isELIMode ? 'text-amber-900' : 'text-black'}`}>
                {t('explainLike10')}
              </h3>
              <div 
                onClick={() => setIsELIMode(!isELIMode)}
                className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${
                  isELIMode ? 'bg-amber-700' : 'bg-gray-300'
                }`}
              >
                <motion.div 
                  className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                  animate={{ x: isELIMode ? 24 : 0 }}
                />
              </div>
            </div>
            <p className={`text-sm mb-4 leading-relaxed ${isELIMode ? 'text-amber-800 font-medium' : 'text-black font-medium'}`}>
              {t('explainLike10Desc')}
            </p>
            <div className="flex gap-3">
              <Button 
                variant={isELIMode ? "secondary" : "outline"} 
                size="sm" 
                className={isELIMode ? "bg-amber-800 text-white border-none hover:bg-amber-900" : ""}
                icon={isSpeaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                onClick={() => {
                  const lastAIMessage = [...messages].reverse().find(m => m.type === 'ai');
                  if (lastAIMessage) {
                    setShouldSpeakNext(true);
                    handleSendMessage(`Please explain your previous response in very simple terms (Explain like I'm 10): "${lastAIMessage.content}"`);
                  } else {
                    speak(t('explainLike10Desc'));
                  }
                }}
              >
                {t('tryVoiceExplanation')}
              </Button>
              {isELIMode && (
                <Badge className="bg-amber-900 text-amber-50 border-none animate-pulse">
                  {t('active')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
