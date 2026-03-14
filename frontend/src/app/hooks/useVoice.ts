import { useCallback, useRef, useState } from 'react';
import { getSecureContextInfo } from '@/app/utils/secureContext';

export function useVoice(onResult: (result: string) => void, language: string = 'en') {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const { host, isLocalHost, isSecureContextOk, secureOriginUrl, message: secureMessage } = getSecureContextInfo();

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      return;
    }

    if (isListening) {
      return;
    }

    if (!window.isSecureContext && !isLocalHost) {
      setError(secureMessage || `Voice input needs HTTPS on ${host}. Open the app on localhost or use HTTPS.`);
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
        setError(secureMessage || `Voice input is blocked on ${host} over HTTP. Use HTTPS or localhost.`);
        setIsListening(false);
        recognitionRef.current = null;
        return;
      }

      setError(
        code === 'not-allowed' || code === 'service-not-allowed'
          ? `Please allow microphone access for ${host} in your browser site settings.`
          : code
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
