import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ApiIntegrationProps {
  text: string;
  onResponse: (response: string, audioUrl?: string) => void;
  onProcessingChange: (isProcessing: boolean) => void;
  customerHistory?: string[];
  isNewCustomer: boolean;
}

const ApiIntegration: React.FC<ApiIntegrationProps> = ({
  text,
  onResponse,
  onProcessingChange,
  customerHistory = [],
  isNewCustomer,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Process text through OpenAI and Sesame when text changes
  useEffect(() => {
    if (!text) return;
    
    const processText = async () => {
      setIsProcessing(true);
      onProcessingChange(true);
      setError(null);
      
      try {
        // Prepare context for OpenAI based on customer history
        const context = customerHistory.length > 0 
          ? `Müştəri ilə əvvəlki danışıqlar: ${customerHistory.join('. ')}. ` 
          : '';
        
        const greeting = isNewCustomer 
          ? "Bu yeni bir müştəridir. Onu salamla və necə kömək edə biləcəyini soruş." 
          : "Bu qayıdan müştəridir. Onu yenidən salamlama, birbaşa necə kömək edə biləcəyini soruş.";
        
        // Call OpenAI API for text response
        // Note: In a real implementation, this would be a server-side call
        const openaiResponse = await mockOpenAICall(text, context, greeting);
        
        // Call Sesame API for text-to-speech
        // Note: In a real implementation, this would be a server-side call
        const audioUrl = await mockSesameCall(openaiResponse);
        
        // Return the response and audio URL
        onResponse(openaiResponse, audioUrl);
      } catch (err) {
        console.error('API integration error:', err);
        setError('API çağırışı zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
        onResponse('Üzr istəyirəm, texniki problem yaşayıram. Bir az sonra yenidən cəhd edə bilərsinizmi?');
      } finally {
        setIsProcessing(false);
        onProcessingChange(false);
      }
    };
    
    processText();
  }, [text, onResponse, onProcessingChange, customerHistory, isNewCustomer]);

  // Mock OpenAI API call (replace with actual implementation)
  const mockOpenAICall = async (text: string, context: string, greeting: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple response logic based on input text
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('salam') || lowerText.includes('hello')) {
      return 'Salam! ABB Bankına xoş gəlmisiniz. Sizə necə kömək edə bilərəm?';
    } else if (lowerText.includes('kredit') || lowerText.includes('credit')) {
      return 'Kredit məhsullarımız haqqında məlumat vermək istəyirəm. Bizim istehlak krediti, ipoteka və biznes kreditlərimiz var. Hansı növ kredit ilə maraqlanırsınız?';
    } else if (lowerText.includes('kart') || lowerText.includes('card')) {
      return 'Bank kartlarımız haqqında məlumat vermək istəyirəm. Debet, kredit və premium kartlarımız mövcuddur. Hansı kart növü ilə maraqlanırsınız?';
    } else if (lowerText.includes('hesab') || lowerText.includes('account')) {
      return 'Bank hesablarımız haqqında məlumat vermək istəyirəm. Cari hesab, əmanət hesabı və digər hesab növlərimiz var. Hansı hesab növü ilə maraqlanırsınız?';
    } else if (lowerText.includes('filial') || lowerText.includes('branch')) {
      return 'Filiallarımız Bakının müxtəlif rayonlarında və Azərbaycanın bir çox şəhərlərində yerləşir. Sizə ən yaxın filialı tapmaq üçün kömək edə bilərəm.';
    } else {
      return 'Üzr istəyirəm, sualınızı tam başa düşmədim. Zəhmət olmasa, sualınızı daha aydın şəkildə təkrarlaya bilərsinizmi?';
    }
  };

  // Mock Sesame API call (replace with actual implementation)
  const mockSesameCall = async (text: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real implementation, this would return a URL to an audio file
    return 'audio_response.mp3';
  };

  return (
    <div className="api-integration">
      {error && <div className="error">{error}</div>}
      {isProcessing && <div className="processing">Cavab hazırlanır...</div>}
    </div>
  );
};

export default ApiIntegration;
