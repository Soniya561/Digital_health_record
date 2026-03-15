import { useCallback, useRef, useState } from 'react';
import { getSecureContextInfo } from '@/app/utils/secureContext';

type VoiceStrings = {
  speechNotSupported?: string;
  voiceNeedsHttps?: string;
  voiceBlockedHttp?: string;
  voiceMicPermission?: string;
};

function formatMessage(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

export function useVoice(
  onResult: (result: string) => void,
  language: string = 'en',
  strings: VoiceStrings = {}
) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const { host, isLocalHost, isSecureContextOk, secureOriginUrl, message: secureMessage } = getSecureContextInfo();
  const messages = {
    speechNotSupported: 'Speech recognition not supported',
    voiceNeedsHttps: 'Voice input needs HTTPS on {{host}}. Open the app on localhost or use HTTPS.',
    voiceBlockedHttp: 'Voice input is blocked on {{host}} over HTTP. Use HTTPS or localhost.',
    voiceMicPermission: 'Please allow microphone access for {{host}} in your browser site settings.',
    ...strings
  };

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(messages.speechNotSupported);
      return;
    }

    if (isListening) {
      return;
    }

    if (!window.isSecureContext && !isLocalHost) {
      setError(secureMessage || formatMessage(messages.voiceNeedsHttps, { host }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Map application language to speech recognition language
    switch (language) {
      case 'ml':
        recognition.lang = 'ml-IN';
        break;
      case 'hi':
        recognition.lang = 'hi-IN';
        break;
      case 'bn':
        recognition.lang = 'bn-IN';
        break;
      case 'ta':
        recognition.lang = 'ta-IN';
        break;
      case 'kn':
        recognition.lang = 'kn-IN';
        break;
      default:
        recognition.lang = 'en-US';
    }

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      const code = event?.error || 'speech-error';

      if ((code === 'not-allowed' || code === 'service-not-allowed') && !window.isSecureContext && !isLocalHost) {
        setError(secureMessage || formatMessage(messages.voiceBlockedHttp, { host }));
        setIsListening(false);
        recognitionRef.current = null;
        return;
      }

      setError(
        code === 'not-allowed' || code === 'service-not-allowed'
          ? formatMessage(messages.voiceMicPermission, { host })
          : messages.speechNotSupported
      );
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      setIsListening(false);
    }
  }, [isListening, language, onResult, isLocalHost]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isListening, error, startListening, stopListening, secureOriginUrl, isSecureContextOk };
}
