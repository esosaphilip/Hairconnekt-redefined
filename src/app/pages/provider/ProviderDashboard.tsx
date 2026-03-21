import { Link } from 'react-router';
import { Bell, Settings, Calendar, TrendingUp, Star, Euro } from 'lucide-react';
import { useState } from 'react';
import BottomNav from '../../components/BottomNav';

export default function ProviderDashboard() {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl text-[#8B4513]">
              Willkommen zurück, Amara!
            </h1>
            <p className="text-sm text-[#6B6B6B]">Sonntag, 15. März 2026</p>
          </div>
          <div className="flex gap-2">
            <Link to="/notifications" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5F5F5]">
              <Bell size={20} className="text-[#8B4513]" />
            </Link>
            <Link to="/provider/settings" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5F5F5]">
              <Settings size={20} className="text-[#8B4513]" />
            </Link>
          </div>
        </div>

        {/* Availability Toggle - Most prominent element */}
        <div 
          className={`p-4 rounded-xl flex items-center justify-between ${isAvailable ? 'bg-[#E8F5E9]' : 'bg-[#FAFAFA]'}`}
          style={{ borderLeft: `4px solid ${isAvailable ? '#2E7D32' : '#AAAAAA'}` }}
        >
          <div>
            <p className={`font-bold mb-1 ${isAvailable ? 'text-[#2E7D32]' : 'text-[#6B6B6B]'}`}>
              {isAvailable ? 'Verfügbar' : 'Nicht verfügbar'}
            </p>
            <p className="text-sm text-[#6B6B6B]">
              {isAvailable ? 'Kunden können dich jetzt buchen' : 'Kunden können dich nicht buchen'}
            </p>
          </div>
          <button 
            onClick={() => setIsAvailable(!isAvailable)}
            className={`w-14 h-7 rounded-full relative transition-colors ${isAvailable ? 'bg-[#2E7D32]' : 'bg-[#CCCCCC]'}`}
          >
            <div 
              className={`w-6 h-6 rounded-full bg-white absolute top-0.5 transition-all ${isAvailable ? 'right-0.5' : 'left-0.5'}`} 
            />
            {isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { icon: Calendar, label: "Heute's Termine", value: '3', color: '#E05A4E', link: '/provider/calendar' },
            { icon: Star, label: 'Bewertung', value: '4.8★', color: '#C8860A', link: '/provider/reviews' },
            { icon: TrendingUp, label: 'Diese Woche', value: '+12', color: '#1A8C85', link: '/provider/calendar' },
            { icon: Euro, label: 'Nächster Termin', value: '14:00', color: '#8B4513', link: '/provider/calendar' },
          ].map((stat, idx) => (
            <Link 
              key={idx} 
              to={stat.link}
              className="bg-white rounded-xl p-4 block" 
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#FAFAFA]">
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-[#6B6B6B]">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Today's Schedule */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl text-[#8B4513]">Heutiger Zeitplan</h2>
            <Link to="/provider/calendar" className="text-sm text-[#1A8C85]">
              Kalender öffnen
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { time: '10:00 - 15:00', client: 'Sarah Müller', service: 'Knotless Braids', status: 'confirmed' },
              { time: '16:00 - 18:00', client: 'Lisa Schmidt', service: 'Box Braids', status: 'confirmed' },
            ].map((apt, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4"
                   style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #2E7D32' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{apt.time}</p>
                    <p className="text-sm text-[#6B6B6B]">{apt.client}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs text-white bg-[#2E7D32]">
                    Bestätigt
                  </span>
                </div>
                <p className="text-sm mb-3 text-[#6B6B6B]">{apt.service}</p>
                <div className="flex gap-2">
                  <button className="flex-1 h-9 rounded-lg text-sm font-medium text-white bg-[#1A8C85]">
                    Starten
                  </button>
                  <button className="flex-1 h-9 rounded-lg border text-sm font-medium border-[#8B4513] text-[#8B4513]">
                    Nachricht
                  </button>
                </div>
              </div>
            ))}

            <div className="border-2 border-dashed rounded-xl p-4 text-center border-[#EEEEEE]">
              <p className="text-sm text-[#AAAAAA]">19:00 - 21:00</p>
              <p className="text-sm font-medium text-[#6B6B6B]">Frei</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/provider/services"
                className="p-4 bg-white rounded-xl text-center"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#FAFAFA]">
              <span className="text-2xl">💼</span>
            </div>
            <p className="font-medium text-sm text-[#8B4513]">Services</p>
          </Link>
          <Link to="/provider/calendar"
                className="p-4 bg-white rounded-xl text-center"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#FAFAFA]">
              <Calendar size={24} className="text-[#8B4513]" />
            </div>
            <p className="font-medium text-sm text-[#8B4513]">Kalender</p>
          </Link>
        </div>
      </div>

      <BottomNav active="home" mode="provider" />
    </div>
  );
}