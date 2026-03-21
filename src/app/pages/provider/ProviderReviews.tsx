import { Link } from 'react-router';
import { ChevronLeft, Star, TrendingUp } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import BottomNav from '../../components/BottomNav';

const reviews = [
  {
    id: 1,
    client: 'Sarah Müller',
    clientAvatar: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8',
    service: 'Knotless Braids',
    rating: 5,
    date: '12. März 2026',
    comment: 'Absolut fantastisch! Die Braids sehen wunderschön aus und Amara war super professionell. Kann ich nur empfehlen!',
    helpful: 12,
    response: null
  },
  {
    id: 2,
    client: 'Lisa Schmidt',
    clientAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
    service: 'Box Braids',
    rating: 5,
    date: '5. März 2026',
    comment: 'Sehr zufrieden mit dem Ergebnis. Amara nimmt sich Zeit und arbeitet sehr sorgfältig.',
    helpful: 8,
    response: 'Vielen Dank Lisa! Es war mir eine Freude 💕'
  },
  {
    id: 3,
    client: 'Anna Weber',
    clientAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04',
    service: 'Cornrows',
    rating: 5,
    date: '28. Februar 2026',
    comment: 'Perfekt! Genau so wie ich es wollte.',
    helpful: 5,
    response: null
  },
  {
    id: 4,
    client: 'Julia Becker',
    clientAvatar: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a',
    service: 'Senegalese Twists',
    rating: 4,
    date: '20. Februar 2026',
    comment: 'Sehr gut, nur etwas länger gedauert als geplant.',
    helpful: 3,
    response: null
  }
];

const stats = [
  { label: 'Durchschnitt', value: '4.8', icon: '⭐', color: '#C8860A' },
  { label: 'Gesamt', value: reviews.length.toString(), icon: '📝', color: '#8B4513' },
  { label: 'Dieser Monat', value: '+4', icon: '📈', color: '#1A8C85' },
];

export default function ProviderReviews() {
  return (
    <div className="min-h-screen pb-24 bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-4">
          <Link to="/provider/dashboard">
            <ChevronLeft size={24} style={{ color: '#8B4513' }} />
          </Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Bewertungen</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-xl p-4 text-center" 
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <p className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs" style={{ color: '#555555' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Rating Breakdown */}
        <div className="bg-white rounded-xl p-4 mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="font-bold mb-3" style={{ color: '#1A1A1A' }}>Bewertungsverteilung</h3>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter(r => r.rating === stars).length;
            const percentage = (count / reviews.length) * 100;
            return (
              <div key={stars} className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm" style={{ color: '#555555' }}>{stars}</span>
                  <Star size={14} fill="#C8860A" style={{ color: '#C8860A' }} />
                </div>
                <div className="flex-1 h-2 rounded-full bg-[#F5F5F5] overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: `${percentage}%`, backgroundColor: '#C8860A' }}
                  />
                </div>
                <span className="text-sm w-8 text-right" style={{ color: '#555555' }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {['Alle', 'Neueste', 'Höchste', 'Unbeantwortete'].map((tab, idx) => (
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

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="bg-white rounded-xl p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              {/* Client Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <ImageWithFallback 
                    src={review.clientAvatar} 
                    alt={review.client}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{review.client}</h3>
                  <p className="text-sm" style={{ color: '#555555' }}>{review.service}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="#C8860A" style={{ color: '#C8860A' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: '#AAAAAA' }}>{review.date}</p>
                </div>
              </div>

              {/* Review Text */}
              <p className="text-sm mb-3" style={{ color: '#555555' }}>
                {review.comment}
              </p>

              {/* Provider Response */}
              {review.response ? (
                <div className="p-3 rounded-lg mb-3 bg-[#F5F5F5]">
                  <p className="text-xs font-bold mb-1" style={{ color: '#8B4513' }}>Deine Antwort:</p>
                  <p className="text-sm" style={{ color: '#555555' }}>{review.response}</p>
                </div>
              ) : (
                <button 
                  className="w-full h-9 rounded-lg text-sm font-medium border-2 mb-3"
                  style={{ borderColor: '#8B4513', color: '#8B4513' }}
                >
                  Antworten
                </button>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between pt-3 border-t border-[#EEEEEE]">
                <span className="text-xs" style={{ color: '#AAAAAA' }}>
                  {review.helpful} fanden das hilfreich
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="home" mode="provider" />
    </div>
  );
}
