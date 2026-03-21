import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Calendar, MessageCircle, Bell as BellIcon } from 'lucide-react';

const notifications = [
  {
    id: 1,
    type: 'booking',
    title: 'Buchung bestätigt',
    message: 'Dein Termin mit Amara Okafor wurde bestätigt',
    time: 'Vor 2 Stunden',
    read: false,
  },
  {
    id: 2,
    type: 'message',
    title: 'Neue Nachricht',
    message: 'Zuri Styles: "Hallo! Ich freue mich auf deinen Termin"',
    time: 'Vor 5 Stunden',
    read: false,
  },
  {
    id: 3,
    type: 'system',
    title: 'Erinnerung',
    message: 'Dein Termin beginnt morgen um 10:00 Uhr',
    time: 'Gestern',
    read: true,
  },
];

export default function Notifications() {
  const [activeFilter, setActiveFilter] = useState('Alle');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between border-[#EEEEEE]">
        <div className="flex items-center gap-3">
          <Link to="/client/home">
            <ArrowLeft size={24} style={{ color: '#8B4513' }} />
          </Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>
            Benachrichtigungen
          </h1>
        </div>
        <button className="text-sm" style={{ color: '#1A8C85' }}>
          Alle lesen
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-4 flex gap-2 overflow-x-auto">
        {['Alle', 'Buchungen', 'Nachrichten', 'System'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              filter === activeFilter ? 'text-white' : 'text-[#555555]'
            }`}
            style={{ 
              backgroundColor: filter === activeFilter ? '#8B4513' : '#F5F5F5' 
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="px-6 space-y-2">
        <h2 className="text-sm font-bold mb-2" style={{ color: '#555555' }}>Heute</h2>
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-xl ${notif.read ? 'bg-white' : 'bg-[#FAFAFA]'}`}
            style={{ 
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              borderLeft: notif.read ? 'none' : '4px solid #E05A4E'
            }}
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#F5F5F5]">
                {notif.type === 'booking' && <Calendar size={20} style={{ color: '#8B4513' }} />}
                {notif.type === 'message' && <MessageCircle size={20} style={{ color: '#8B4513' }} />}
                {notif.type === 'system' && <BellIcon size={20} style={{ color: '#8B4513' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`font-bold ${notif.read ? '' : 'font-bold'}`} style={{ color: '#1A1A1A' }}>
                    {notif.title}
                  </h3>
                  <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#555555' }}>
                    {notif.time}
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#555555' }}>
                  {notif.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}