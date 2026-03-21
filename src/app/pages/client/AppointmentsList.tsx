import { Link } from 'react-router';
import { MapPin, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import BottomNav from '../../components/BottomNav';

const appointments = [
  { id: 1, provider: 'Amara Okafor', date: '15. März 2026', time: '14:00', service: 'Knotless Braids', price: 65, status: 'confirmed', avatar: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8' },
  { id: 2, provider: 'Zuri Styles', date: '22. März 2026', time: '10:00', service: 'Box Braids', price: 55, status: 'pending', avatar: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a' },
];

export default function AppointmentsList() {
  return (
    <div className="min-h-screen pb-24 bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Meine Termine</h1>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {['Anstehend', 'Abgeschlossen', 'Abgesagt'].map((tab, idx) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                idx === 0 ? 'text-white' : 'text-[#555555]'
              }`}
              style={{ backgroundColor: idx === 0 ? '#8B4513' : '#F5F5F5' }}
            >
              {tab} {idx === 0 && <span className="ml-1">({appointments.length})</span>}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white rounded-xl p-4"
                 style={{ 
                   boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                   borderLeft: `4px solid ${apt.status === 'confirmed' ? '#2E7D32' : '#BF6000'}`
                 }}>
              <div className="flex justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <ImageWithFallback src={apt.avatar} alt={apt.provider} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{apt.provider}</h3>
                    <p className="text-sm" style={{ color: '#555555' }}>{apt.date}, {apt.time}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs text-white h-fit`}
                      style={{ backgroundColor: apt.status === 'confirmed' ? '#2E7D32' : '#BF6000' }}>
                  {apt.status === 'confirmed' ? 'Bestätigt' : 'Ausstehend'}
                </span>
              </div>

              <div className="mb-3">
                <span className="px-2 py-1 rounded-full text-xs bg-[#F5F5F5] text-[#555555]">
                  {apt.service}
                </span>
                <span className="ml-2 font-medium" style={{ color: '#8B4513' }}>€{apt.price}</span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=Hauptstraße+123+Berlin`, '_blank')}
                  className="flex-1 h-10 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ borderColor: '#8B4513', color: '#8B4513' }}>
                  <MapPin size={16} />
                  Route
                </button>
                <Link to={`/chat/${apt.id}`}
                      className="flex-1 h-10 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium"
                      style={{ borderColor: '#8B4513', color: '#8B4513' }}>
                  <MessageCircle size={16} />
                  Nachricht
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="appointments" mode="client" />
    </div>
  );
}