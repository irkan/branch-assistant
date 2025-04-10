import React, { useState, useEffect } from 'react';

interface SpeechRecognitionProps {
  onResult: (text: string) => void;
  onListeningChange: (isListening: boolean) => void;
  language?: string;
  autoStart?: boolean;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  onResult,
  onListeningChange,
  language = 'az-AZ', // Default to Azerbaijani
  autoStart = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    // Configure recognition
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = language;
    
    // Set up event handlers
    recognitionInstance.onstart = () => {
      setIsListening(true);
      onListeningChange(true);
      console.log('Speech recognition started');
    };
    
    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognized:', transcript);
      onResult(transcript);
    };
    
    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
      onListeningChange(false);
    };
    
    recognitionInstance.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      onListeningChange(false);
    };
    
    setRecognition(recognitionInstance);
    
    // Auto-start if enabled
    if (autoStart) {
      startListening();
    }
    
    // Cleanup
    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort();
      }
    };
  }, [language, onListeningChange, onResult, autoStart]);
  
  const startListening = () => {
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };
  
  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };
  
  return (
    <div className="speech-recognition">
      {error && <div className="error">{error}</div>}
      <div className="controls">
        <button 
          onClick={isListening ? stopListening : startListening}
          className={isListening ? 'listening' : ''}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
      {isListening && (
        <div className="status">
          Listening...
        </div>
      )}
    </div>
  );
};

export default SpeechRecognition;
