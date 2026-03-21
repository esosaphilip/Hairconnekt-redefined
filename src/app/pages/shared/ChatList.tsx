import { Link } from 'react-router';
import { ArrowLeft, Search } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import BottomNav from '../../components/BottomNav';

const chats = [
  { id: 1, name: 'Amara Okafor', lastMessage: 'Bis morgen! 😊', time: 'Vor 10 Min.', unread: 2, online: true, booking: '#BK-2025...', avatar: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8' },
  { id: 2, name: 'Zuri Styles Salon', lastMessage: 'Danke für deine Buchung!', time: 'Vor 2 Std.', unread: 0, online: false, booking: null, avatar: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a' },
];

export default function ChatList() {
  return (
    <div className="min-h-screen pb-20 bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Nachrichten</h1>
          <button><Search size={24} style={{ color: '#8B4513' }} /></button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {chats.map((chat) => (
          <Link key={chat.id} to={`/chat/${chat.id}`} 
                className="flex items-center gap-4 p-3 bg-white rounded-xl" 
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden">
                <ImageWithFallback src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
              </div>
              {chat.online && <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: '#2E7D32' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <h3 className="font-bold truncate" style={{ color: '#1A1A1A' }}>{chat.name}</h3>
                <span className="text-xs flex-shrink-0" style={{ color: '#555555' }}>{chat.time}</span>
              </div>
              {chat.booking && <span className="text-xs px-2 py-0.5 rounded bg-[#F5F5F5] text-[#555555]">{chat.booking}</span>}
              <p className="text-sm truncate mt-1" style={{ color: '#555555' }}>{chat.lastMessage}</p>
            </div>
            {chat.unread > 0 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: '#E05A4E' }}>
                {chat.unread}
              </div>
            )}
          </Link>
        ))}
      </div>

      <BottomNav active="messages" mode="client" />
    </div>
  );
}