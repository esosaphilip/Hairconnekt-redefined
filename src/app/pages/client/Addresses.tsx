import { Link } from 'react-router';
import { ChevronLeft, MapPin, Home, Briefcase, Plus, MoreVertical } from 'lucide-react';

const addresses = [
  {
    id: 1,
    label: 'Zuhause',
    icon: Home,
    street: 'Hauptstraße 123',
    city: '10115 Berlin',
    isDefault: true
  },
  {
    id: 2,
    label: 'Arbeit',
    icon: Briefcase,
    street: 'Alexanderplatz 1',
    city: '10178 Berlin',
    isDefault: false
  }
];

export default function Addresses() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-4">
          <Link to="/client/profile">
            <ChevronLeft size={24} style={{ color: '#8B4513' }} />
          </Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Meine Adressen</h1>
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm mb-6" style={{ color: '#555555' }}>
          Speichere häufig verwendete Adressen für schnellere Buchungen
        </p>

        {/* Address List */}
        <div className="space-y-4 mb-6">
          {addresses.map((address) => (
            <div 
              key={address.id} 
              className="bg-white rounded-xl p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5F5F5]">
                    <address.icon size={20} style={{ color: '#8B4513' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{address.label}</h3>
                      {address.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#E8F5E9', color: '#1A8C85' }}>
                          Standard
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#555555' }}>{address.street}</p>
                    <p className="text-sm" style={{ color: '#555555' }}>{address.city}</p>
                  </div>
                </div>
                <button className="p-2">
                  <MoreVertical size={20} style={{ color: '#AAAAAA' }} />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  className="flex-1 h-9 rounded-lg border text-sm font-medium"
                  style={{ borderColor: '#8B4513', color: '#8B4513' }}
                >
                  Bearbeiten
                </button>
                {!address.isDefault && (
                  <button 
                    className="flex-1 h-9 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: '#1A8C85' }}
                  >
                    Als Standard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Address */}
        <button 
          className="w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2"
          style={{ borderColor: '#EEEEEE', color: '#8B4513' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5F5F5]">
            <Plus size={20} style={{ color: '#8B4513' }} />
          </div>
          <span className="font-medium">Neue Adresse hinzufügen</span>
        </button>
      </div>
    </div>
  );
}
