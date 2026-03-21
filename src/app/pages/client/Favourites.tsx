import { Link } from 'react-router';
import { ArrowLeft, Heart, Star } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

const favourites = [
  { id: 1, name: 'Amara Okafor', image: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8', rating: 4.8, reviews: 124, specialties: ['Box Braids', 'Knotless'], price: 45 },
  { id: 2, name: 'Zuri Styles', image: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a', rating: 4.9, reviews: 218, specialties: ['Locs', 'Twists'], price: 55 },
];

export default function Favourites() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-3">
          <Link to="/client/profile"><ArrowLeft size={24} style={{ color: '#8B4513' }} /></Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Meine Favoriten</h1>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4">
        {favourites.map((fav) => (
          <Link key={fav.id} to={`/client/provider/${fav.id}`}
                className="bg-white rounded-xl overflow-hidden"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="relative">
              <div className="aspect-square">
                <ImageWithFallback src={fav.image} alt={fav.name} className="w-full h-full object-cover" />
              </div>
              <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                <Heart size={16} fill="#E05A4E" style={{ color: '#E05A4E' }} />
              </button>
            </div>
            <div className="p-3">
              <h3 className="font-bold mb-1 truncate" style={{ color: '#1A1A1A' }}>{fav.name}</h3>
              <div className="flex items-center gap-1 mb-2">
                <Star size={12} fill="#C8860A" style={{ color: '#C8860A' }} />
                <span className="text-xs font-medium">{fav.rating}</span>
                <span className="text-xs" style={{ color: '#555555' }}>({fav.reviews})</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#8B4513' }}>ab €{fav.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}