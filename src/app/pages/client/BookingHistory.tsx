import { Link } from 'react-router';
import { ChevronLeft, Calendar, Download, Star } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

const pastBookings = [
  {
    id: 1,
    provider: 'Amara Okafor',
    providerAvatar: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8',
    service: 'Knotless Braids',
    date: '12. März 2026',
    time: '14:00',
    duration: '5 Stunden',
    price: 65,
    status: 'completed',
    hasReview: true,
    rating: 5
  },
  {
    id: 2,
    provider: 'Zuri Styles',
    providerAvatar: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a',
    service: 'Box Braids',
    date: '5. März 2026',
    time: '10:00',
    duration: '4 Stunden',
    price: 55,
    status: 'completed',
    hasReview: true,
    rating: 5
  },
  {
    id: 3,
    provider: 'Naomi Hair Studio',
    providerAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
    service: 'Cornrows',
    date: '28. Februar 2026',
    time: '15:30',
    duration: '3 Stunden',
    price: 45,
    status: 'completed',
    hasReview: true,
    rating: 4
  },
  {
    id: 4,
    provider: 'Bella Braids',
    providerAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04',
    service: 'Senegalese Twists',
    date: '15. Februar 2026',
    time: '11:00',
    duration: '6 Stunden',
    price: 70,
    status: 'completed',
    hasReview: false,
    rating: 0
  }
];

export default function BookingHistory() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/client/profile">
              <ChevronLeft size={24} style={{ color: '#8B4513' }} />
            </Link>
            <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Buchungshistorie</h1>
          </div>
          <button className="p-2">
            <Download size={20} style={{ color: '#8B4513' }} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <p className="text-sm mb-1" style={{ color: '#555555' }}>Gesamt Termine</p>
            <p className="text-3xl font-bold" style={{ color: '#8B4513' }}>{pastBookings.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <p className="text-sm mb-1" style={{ color: '#555555' }}>Gesamt Ausgaben</p>
            <p className="text-3xl font-bold" style={{ color: '#1A8C85' }}>
              €{pastBookings.reduce((sum, b) => sum + b.price, 0)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {['Alle', '2026', '2025', '2024'].map((tab, idx) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                idx === 0 ? 'text-white' : 'text-[#555555]'
              }`}
              style={{ backgroundColor: idx === 0 ? '#8B4513' : '#F5F5F5' }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {pastBookings.map((booking) => (
            <div 
              key={booking.id} 
              className="bg-white rounded-xl p-4"
              style={{ 
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                borderLeft: '4px solid #2E7D32'
              }}
            >
              {/* Provider Info */}
              <div className="flex justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <ImageWithFallback 
                      src={booking.providerAvatar} 
                      alt={booking.provider}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{booking.provider}</h3>
                    <p className="text-sm" style={{ color: '#555555' }}>{booking.date}, {booking.time}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs text-white h-fit bg-[#2E7D32]">
                  Abgeschlossen
                </span>
              </div>

              {/* Service Details */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 rounded-full text-xs bg-[#F5F5F5] text-[#555555]">
                    {booking.service}
                  </span>
                  <span className="font-bold" style={{ color: '#8B4513' }}>€{booking.price}</span>
                </div>
                <p className="text-xs" style={{ color: '#AAAAAA' }}>
                  <Calendar size={12} className="inline mr-1" />
                  Dauer: {booking.duration}
                </p>
              </div>

              {/* Review Section */}
              {booking.hasReview ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F5]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: '#555555' }}>Deine Bewertung:</span>
                    <div className="flex items-center gap-1">
                      {[...Array(booking.rating)].map((_, i) => (
                        <Star key={i} size={14} fill="#C8860A" style={{ color: '#C8860A' }} />
                      ))}
                    </div>
                  </div>
                  <Link to="/client/reviews">
                    <button className="text-xs font-medium" style={{ color: '#8B4513' }}>
                      Anzeigen
                    </button>
                  </Link>
                </div>
              ) : (
                <button 
                  className="w-full h-9 rounded-lg text-sm font-medium border-2"
                  style={{ borderColor: '#C8860A', color: '#C8860A' }}
                >
                  <Star size={14} className="inline mr-2" />
                  Bewertung abgeben
                </button>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                <button 
                  className="flex-1 h-9 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: '#1A8C85' }}
                >
                  Erneut buchen
                </button>
                <button 
                  className="flex-1 h-9 rounded-lg border text-sm font-medium"
                  style={{ borderColor: '#8B4513', color: '#8B4513' }}
                >
                  Rechnung
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
