import { Link, useParams } from 'react-router';
import { ArrowLeft, Share, Heart, Star, MapPin, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function ProviderProfile() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Image */}
      <div className="relative h-64">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1702236240794-58dc4c6895e5"
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <Link to="/client/search" className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <ArrowLeft size={20} style={{ color: '#8B4513' }} />
          </Link>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Share size={20} style={{ color: '#8B4513' }} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Heart size={20} style={{ color: '#E05A4E' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Picture */}
      <div className="px-6 -mt-12 relative z-10 mb-4">
        <div className="w-24 h-24 rounded-full border-4 border-white ring-2 ring-[#C8860A] overflow-hidden mx-auto">
          <ImageWithFallback 
            src="https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Info */}
      <div className="px-6 text-center mb-6">
        <h1 className="font-heading text-2xl mb-2" style={{ color: '#8B4513' }}>Amara Okafor</h1>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star size={18} fill="#C8860A" style={{ color: '#C8860A' }} />
          <span className="font-bold">4.8</span>
          <span style={{ color: '#555555' }}>(124 Bewertungen)</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#555555' }}>
          <MapPin size={16} />
          <span>Wuppertal, NRW • 2.3 km</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 bg-white border-b px-6 border-[#EEEEEE]">
        <div className="flex gap-6">
          {['Überblick', 'Services', 'Galerie', 'Bewertungen'].map((tab) => (
            <button
              key={tab}
              className={`py-3 font-medium ${tab === 'Services' ? 'border-b-2' : ''}`}
              style={{ 
                color: tab === 'Services' ? '#8B4513' : '#555555',
                borderColor: '#E05A4E'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Services Content */}
      <div className="p-6 space-y-4">
        {[
          { name: 'Knotless Braids', duration: '4-5 Std.', price: 65, desc: 'Schonend für Kopfhaut, natürlicher Look' },
          { name: 'Box Braids', duration: '5-6 Std.', price: 55, desc: 'Klassische Box Braids in verschiedenen Größen' },
          { name: 'Cornrows', duration: '2-3 Std.', price: 45, desc: 'Kreative Muster und Styles möglich' },
        ].map((service) => (
          <div key={service.name} className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="flex justify-between mb-2">
              <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{service.name}</h3>
              <span className="font-bold" style={{ color: '#8B4513' }}>€{service.price}</span>
            </div>
            <p className="text-sm mb-2" style={{ color: '#555555' }}>{service.duration} • {service.desc}</p>
            <Link
              to={`/client/provider/${id}/services`}
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-[#F5F5F5] text-[#8B4513]"
            >
              Auswählen
            </Link>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center gap-3 border-[#EEEEEE]" style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
        <span className="font-bold" style={{ color: '#8B4513' }}>ab €45</span>
        <button className="flex-1 h-12 rounded-xl border-2 font-medium flex items-center justify-center gap-2" style={{ borderColor: '#8B4513', color: '#8B4513' }}>
          <MessageCircle size={18} />
          Nachricht
        </button>
        <Link to={`/client/provider/${id}/services`} className="flex-[2] h-12 rounded-xl font-bold text-white flex items-center justify-center" style={{ backgroundColor: '#E05A4E' }}>
          Termin buchen
        </Link>
      </div>
    </div>
  );
}