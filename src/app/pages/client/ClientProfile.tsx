import { Link } from 'react-router';
import { Settings, ChevronRight, User, MapPin, Star, Calendar, Heart, LogOut } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function ClientProfile() {
  return (
    <div className="min-h-screen pb-24 bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Profil</h1>
          <Link to="/settings"><Settings size={24} style={{ color: '#8B4513' }} /></Link>
        </div>
      </div>

      <div className="p-6">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="w-30 h-30 rounded-full mx-auto mb-4 overflow-hidden border-2 border-[#C8860A]">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="font-heading text-2xl mb-1" style={{ color: '#8B4513' }}>Sarah Müller</h2>
          <p className="text-sm" style={{ color: '#555555' }}>sarah.mueller@email.com</p>
          <p className="text-sm" style={{ color: '#555555' }}>+49 170 1234567</p>
          
          <div className="flex justify-center gap-4 mt-3">
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E8F5E9', color: '#1A8C85' }}>
              ✓ E-Mail verifiziert
            </span>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E8F5E9', color: '#1A8C85' }}>
              ✓ Telefon verifiziert
            </span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {[
            { icon: User, label: 'Persönliche Informationen', path: '/client/personal-info' },
            { icon: MapPin, label: 'Meine Adressen', badge: '2 gespeichert', path: '/client/addresses' },
            { icon: Star, label: 'Meine Bewertungen', path: '/client/reviews' },
            { icon: Calendar, label: 'Buchungshistorie', path: '/client/booking-history' },
            { icon: Heart, label: 'Meine Favoriten', badge: '5', path: '/client/favourites' },
          ].map((item) => (
            <Link key={item.label} to={item.path}
                  className="flex items-center justify-between p-4 bg-white rounded-xl"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-3">
                <item.icon size={20} style={{ color: '#8B4513' }} />
                <span style={{ color: '#1A1A1A' }}>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-sm" style={{ color: '#555555' }}>{item.badge}</span>
                )}
                <ChevronRight size={20} style={{ color: '#AAAAAA' }} />
              </div>
            </Link>
          ))}

          {/* Provider Mode Switch */}
          <Link to="/provider/dashboard"
                className="flex items-center justify-between p-4 bg-white rounded-xl border-2"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderColor: '#1A8C85' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
                <span className="text-xl">💇</span>
              </div>
              <span className="font-medium" style={{ color: '#1A8C85' }}>Zum Anbieter-Modus wechseln</span>
            </div>
            <ChevronRight size={20} style={{ color: '#1A8C85' }} />
          </Link>

          {/* Logout */}
          <button className="w-full p-4 bg-white rounded-xl flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <LogOut size={20} style={{ color: '#C62828' }} />
            <span className="font-medium" style={{ color: '#C62828' }}>Abmelden</span>
          </button>
        </div>
      </div>

      <BottomNav active="profile" mode="client" />
    </div>
  );
}