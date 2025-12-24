import { useState, useRef, useEffect } from 'react';
import { TranscriptionItem } from '../types';

export const useWebSpeech = (isListening: boolean) => {
  const [transcripts, setTranscripts] = useState<TranscriptionItem[]>([]);
  const recognitionRef = useRef<any>(null);
  // Use a ref to keep track of the intended state inside the onend callback
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Default to English

    recognition.onresult = (event: any) => {
      const newItems: TranscriptionItem[] = [];
      const now = Date.now();

      // Map the SpeechRecognitionResultList directly to our state.
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;
        const isFinal = result.isFinal;
        
        newItems.push({ 
            id: `line-${i}`, 
            text: text, 
            timestamp: now,
            isFinal: isFinal
        });
      }
      
      setTranscripts(newItems);
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' happens frequently when listening to music without vocals. 
      // We suppress the error log to keep console clean.
      if (event.error === 'no-speech') {
        return; 
      }
      console.error("Speech recognition error", event.error);
    };

    // Auto-restart logic
    recognition.onend = () => {
        if (isListeningRef.current) {
            try {
                recognition.start();
            } catch (e) {
                // Ignore errors if start is called while already starting
            }
        }
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        // Recognition might already be active or restarting via onend
      }
    } else {
      recognition.stop();
      // onend will fire, but isListeningRef.current will be false, so it won't restart
    }
  }, [isListening]);

  return { transcripts };
};