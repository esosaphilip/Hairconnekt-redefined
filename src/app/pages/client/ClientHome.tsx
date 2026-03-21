import { Link } from 'react-router';
import { Bell, MapPin, Search, SlidersHorizontal, Heart, Star, Calendar } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import BottomNav from '../../components/BottomNav';

const mockProviders = [
  {
    id: 1,
    name: 'Amara Okafor',
    image: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBicmFpZHMlMjBoYWlyc3R5bGV8ZW58MXx8fHwxNzczNjA1MDYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.8,
    reviews: 124,
    distance: '2.3 km',
    specialties: ['Box Braids', 'Knotless', 'Cornrows'],
    price: 45,
    available: true,
    verified: true,
  },
  {
    id: 2,
    name: 'Zuri Styles Salon',
    image: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHdvbWFuJTIwYm94JTIwYnJhaWRzJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3MzYwNTA2M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.9,
    reviews: 218,
    distance: '3.5 km',
    specialties: ['Locs', 'Twists', 'Styling'],
    price: 55,
    available: true,
    verified: true,
  },
  {
    id: 3,
    name: 'Kofi Hair Artistry',
    image: 'https://images.unsplash.com/photo-1702236240794-58dc4c6895e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwaGFpciUyMHNhbG9ufGVufDF8fHx8MTc3MzYwNTA2M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.7,
    reviews: 89,
    distance: '4.1 km',
    specialties: ['Senegalese', 'Passion', 'Goddess'],
    price: 40,
    available: false,
    verified: true,
  },
];

const popularStyles = [
  { name: 'Knotless Braids', price: 65, image: 'https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBicmFpZHMlMjBoYWlyc3R5bGV8ZW58MXx8fHwxNzczNjA1MDYzfDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { name: 'Box Braids', price: 55, image: 'https://images.unsplash.com/photo-1769694609721-98f8bab9735a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHdvbWFuJTIwYm94JTIwYnJhaWRzJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3MzYwNTA2M3ww&ixlib=rb-4.1.0&q=80&w=1080' },
  { name: 'Cornrows', price: 45, image: 'https://images.unsplash.com/photo-1481385694031-f2b14f8621d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jucm93cyUyMGhhaXJzdHlsZSUyMHdvbWFufGVufDF8fHx8MTc3MzYwNTA2NHww&ixlib=rb-4.1.0&q=80&w=1080' },
];

export default function ClientHome() {
  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Top Bar */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#C8860A]">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBicmFpZHMlMjBoYWlyc3R5bGV8ZW58MXx8fHwxNzczNjA1MDYzfDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-heading text-xl text-[#8B4513]">
                Hallo, Sarah!
              </h1>
            </div>
          </div>
          <Link to="/notifications" className="relative">
            <Bell size={24} className="text-[#8B4513]" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold bg-[#E05A4E]">
              3
            </div>
          </Link>
        </div>

        {/* Location */}
        <button className="flex items-center gap-2 px-3 py-2 rounded-full border border-[#EEEEEE] mb-4">
          <MapPin size={16} className="text-[#6B6B6B]" />
          <span className="text-sm font-medium text-[#1A1A1A]">Wuppertal, NRW</span>
        </button>

        {/* Search Bar */}
        <Link to="/client/search">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F5F5F5]">
            <Search size={20} className="text-[#6B6B6B]" />
            <span className="flex-1 text-[#AAAAAA]">
              Suche nach Styles, Braiders, Salons...
            </span>
            <SlidersHorizontal size={20} className="text-[#6B6B6B]" />
          </div>
        </Link>
      </div>

      {/* Braiders in Your Area */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-[#8B4513]">
            Braiders in deiner Nähe
          </h2>
          <Link to="/client/search" className="text-sm text-[#1A8C85]">
            Alle anzeigen
          </Link>
        </div>

        <div className="space-y-4">
          {mockProviders.map((provider) => (
            <Link 
              key={provider.id} 
              to={`/client/provider/${provider.id}`}
              className="block"
            >
              <div className="bg-white rounded-xl p-4 relative" 
                   style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <div className="flex gap-4">
                  {/* Provider Image */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-16 h-16 rounded-full overflow-hidden ${
                      provider.verified ? 'ring-2 ring-[#C8860A]' : ''
                    }`}>
                      <ImageWithFallback 
                        src={provider.image}
                        alt={provider.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Provider Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-[#1A1A1A]">
                        {provider.name}
                      </h3>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="flex-shrink-0"
                      >
                        <Heart size={20} className="text-[#AAAAAA]" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star size={14} fill="#C8860A" className="text-[#C8860A]" />
                        <span className="text-sm font-medium text-[#1A1A1A]">
                          {provider.rating}
                        </span>
                      </div>
                      <span className="text-sm text-[#6B6B6B]">
                        ({provider.reviews})
                      </span>
                      <span className="text-sm text-[#6B6B6B]">
                        • {provider.distance}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {provider.specialties.slice(0, 3).map((specialty, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 rounded-full text-xs bg-[#F5F5F5] text-[#8B4513]"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#8B4513]">
                        ab €{provider.price}
                      </span>
                      {provider.available && (
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium text-white bg-[#2E7D32]"
                        >
                          Heute verfügbar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Styles */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-[#8B4513]">
            Beliebte Styles
          </h2>
          <Link to="/client/search" className="text-sm text-[#1A8C85]">
            Alle anzeigen
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mr-6 pr-6">
          {popularStyles.map((style, idx) => (
            <Link 
              key={idx}
              to="/client/search"
              className="flex-shrink-0 w-40"
            >
              <div className="relative rounded-xl overflow-hidden h-52" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <ImageWithFallback 
                  src={style.image}
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-bold mb-1">{style.name}</h3>
                  <p className="text-white/90 text-sm">ab €{style.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAB */}
      <Link to="/client/search">
        <button 
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center z-10 bg-[#E05A4E]"
          style={{ boxShadow: '0 4px 16px rgba(224,90,78,0.25)' }}
        >
          <Calendar size={24} className="text-white" />
        </button>
      </Link>

      {/* Bottom Navigation */}
      <BottomNav active="home" mode="client" />
    </div>
  );
}