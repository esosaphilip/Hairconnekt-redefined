import { Link } from 'react-router';
import { ChevronLeft, Star } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

const reviews = [
  {
    id: 1,
    provider: 'Amara Okafor',
    providerAvatar: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8',
    service: 'Knotless Braids',
    rating: 5,
    date: '12. März 2026',
    comment: 'Absolut fantastisch! Die Braids sehen wunderschön aus und Amara war super professionell. Kann ich nur empfehlen!',
    helpful: 12
  },
  {
    id: 2,
    provider: 'Zuri Styles',
    providerAvatar: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a',
    service: 'Box Braids',
    rating: 5,
    date: '5. März 2026',
    comment: 'Sehr zufrieden mit dem Ergebnis. Zuri nimmt sich Zeit und arbeitet sehr sorgfältig.',
    helpful: 8
  },
  {
    id: 3,
    provider: 'Naomi Hair Studio',
    providerAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
    service: 'Cornrows',
    rating: 4,
    date: '28. Februar 2026',
    comment: 'Gute Arbeit, aber die Wartezeit war etwas länger als erwartet.',
    helpful: 5
  }
];

export default function Reviews() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-4">
          <Link to="/client/profile">
            <ChevronLeft size={24} style={{ color: '#8B4513' }} />
          </Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Meine Bewertungen</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <p className="text-3xl font-bold mb-1" style={{ color: '#8B4513' }}>{reviews.length}</p>
            <p className="text-xs" style={{ color: '#555555' }}>Bewertungen</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <p className="text-3xl font-bold mb-1" style={{ color: '#C8860A' }}>4.7</p>
            <p className="text-xs" style={{ color: '#555555' }}>⭐ Durchschnitt</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <p className="text-3xl font-bold mb-1" style={{ color: '#1A8C85' }}>25</p>
            <p className="text-xs" style={{ color: '#555555' }}>Hilfreich</p>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="bg-white rounded-xl p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              {/* Provider Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <ImageWithFallback 
                    src={review.providerAvatar} 
                    alt={review.provider}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{review.provider}</h3>
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

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#EEEEEE]">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#AAAAAA' }}>
                    {review.helpful} fanden das hilfreich
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1 rounded-lg text-xs font-medium border"
                    style={{ borderColor: '#EEEEEE', color: '#8B4513' }}
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State for no reviews */}
        {reviews.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#F5F5F5]">
              <Star size={32} style={{ color: '#AAAAAA' }} />
            </div>
            <h3 className="font-bold mb-2" style={{ color: '#1A1A1A' }}>Noch keine Bewertungen</h3>
            <p className="text-sm" style={{ color: '#555555' }}>
              Deine Bewertungen erscheinen hier nach abgeschlossenen Terminen
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
