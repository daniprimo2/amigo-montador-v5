import { MessageCircle } from "lucide-react";
import { useState } from "react";

interface WhatsAppSupportProps {
  className?: string;
}

export function WhatsAppSupport({ className = "" }: WhatsAppSupportProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const whatsappNumber = "5511993505241"; // +55 11 99350-5241
  const message = encodeURIComponent("Olá Leonardo! Preciso de ajuda com o Amigo Montador.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  const handleClick = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        title="Suporte via WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
        
        {/* Tooltip */}
        <div className={`absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="text-center">
            <div className="font-medium">Suporte via WhatsApp</div>
            <div className="text-xs text-gray-300">Leonardo - IA Assistente</div>
          </div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
      </button>
      
      {/* Pulse animation */}
      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
    </div>
  );
}