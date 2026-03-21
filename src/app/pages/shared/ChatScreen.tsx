import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function ChatScreen() {
  const { id } = useParams();
  const [message, setMessage] = useState('');
  const messages = [
    { id: 1, text: 'Hallo! Ich habe eine Frage zu meinem Termin', sender: 'me', time: '10:30' },
    { id: 2, text: 'Hallo Sarah! Natürlich, wie kann ich helfen?', sender: 'them', time: '10:32' },
    { id: 3, text: 'Kann ich die Zeit von 14:00 auf 15:00 ändern?', sender: 'me', time: '10:33' },
  ];

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 border-[#EEEEEE]">
        <Link to="/chat"><ArrowLeft size={24} style={{ color: '#8B4513' }} /></Link>
        <div className="w-10 h-10 rounded-full overflow-hidden">
          <ImageWithFallback src="https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8" alt="Provider" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold" style={{ color: '#1A1A1A' }}>Amara Okafor</h2>
          <p className="text-xs" style={{ color: '#2E7D32' }}>● Online</p>
        </div>
      </div>

      {/* Booking Banner */}
      <div className="px-4 py-2 bg-white border-b border-[#EEEEEE]">
        <div className="text-sm p-3 rounded-lg bg-[#FAFAFA]">
          <span className="font-medium" style={{ color: '#8B4513' }}>Termin: 28. Okt. 2025, 14:00 Uhr</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: '#2E7D32' }}>Bestätigt</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
              msg.sender === 'me' 
                ? 'rounded-br-sm' 
                : 'rounded-bl-sm'
            }`} style={{ backgroundColor: msg.sender === 'me' ? '#E05A4E' : '#FAFAFA' }}>
              <p className={msg.sender === 'me' ? 'text-white' : ''} style={{ color: msg.sender === 'me' ? 'white' : '#1A1A1A' }}>
                {msg.text}
              </p>
              <p className="text-xs mt-1" style={{ color: msg.sender === 'me' ? 'rgba(255,255,255,0.8)' : '#555555' }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4 border-[#EEEEEE]">
        <div className="flex items-center gap-2">
          <button className="p-2"><Paperclip size={20} style={{ color: '#555555' }} /></button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="flex-1 px-4 py-3 rounded-full border bg-[#F5F5F5] border-[#EEEEEE]"
          />
          <button className="p-3 rounded-full" style={{ backgroundColor: message ? '#E05A4E' : '#CCCCCC' }}>
            <Send size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}