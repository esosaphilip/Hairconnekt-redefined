import { Link } from 'react-router';
import { ArrowLeft, SlidersHorizontal, Heart, Star } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import BottomNav from '../../components/BottomNav';

const providers = [
  { id: 1, name: 'Amara Okafor', image: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8', rating: 4.8, reviews: 124, distance: '2.3 km', specialties: ['Box Braids', 'Knotless'], price: 45, available: true, verified: true },
  { id: 2, name: 'Zuri Styles Salon', image: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a', rating: 4.9, reviews: 218, distance: '3.5 km', specialties: ['Locs', 'Twists'], price: 55, available: true, verified: true },
  { id: 3, name: 'Kofi Hair Artistry', image: 'https://images.unsplash.com/photo-1702236240794-58dc4c6895e5', rating: 4.7, reviews: 89, distance: '4.1 km', specialties: ['Senegalese', 'Passion'], price: 40, available: false, verified: true },
];

export default function SearchResults() {
  return (
    <div className="min-h-screen pb-20 bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-3 border-[#EEEEEE]" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Link to="/client/home"><ArrowLeft size={24} className="text-[#8B4513]" /></Link>
          <input
            type="text"
            placeholder="Suche nach Styles, Braiders..."
            className="flex-1 px-4 py-2 rounded-xl border-0 bg-[#F5F5F5] focus:ring-2 focus:ring-[#8B4513] outline-none"
          />
          <button><SlidersHorizontal size={24} className="text-[#8B4513]" /></button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Alle', 'Flechten', 'Locs', 'Salon', 'Mobil', 'Heute verfügbar'].map((filter) => (
            <button
              key={filter}
              className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap"
              style={{ backgroundColor: filter === 'Alle' ? '#8B4513' : '#F5F5F5', color: filter === 'Alle' ? 'white' : '#6B6B6B' }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm mb-4 text-[#6B6B6B]">24 Braider gefunden</p>
        
        <div className="space-y-3">
          {providers.map((provider) => (
            <Link key={provider.id} to={`/client/provider/${provider.id}`}
                  className="block bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <div className="flex gap-4">
                <div className={`w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ${provider.verified ? 'ring-2 ring-[#C8860A]' : ''}`}>
                  <ImageWithFallback src={provider.image} alt={provider.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <h3 className="font-bold text-[#1A1A1A]">{provider.name}</h3>
                    <Heart size={20} className="text-[#AAAAAA]" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={14} fill="#C8860A" className="text-[#C8860A]" />
                    <span className="text-sm font-medium">{provider.rating}</span>
                    <span className="text-sm text-[#6B6B6B]">({provider.reviews}) • {provider.distance}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {provider.specialties.map((s) => (
                      <span key={s} className="px-2 py-1 rounded-full text-xs bg-[#F5F5F5] text-[#8B4513]">{s}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#8B4513]">ab €{provider.price}</span>
                    {provider.available && <span className="px-2 py-1 rounded-full text-xs text-white bg-[#2E7D32]">Heute verfügbar</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav active="search" mode="client" />
    </div>
  );
}