import { Link } from 'react-router';
import { ChevronLeft, User, Mail, Phone, Calendar } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function PersonalInfo() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-4">
          <Link to="/client/profile">
            <ChevronLeft size={24} style={{ color: '#8B4513' }} />
          </Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Persönliche Informationen</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Profile Photo */}
        <div className="text-center mb-8">
          <div className="w-30 h-30 rounded-full mx-auto mb-4 overflow-hidden border-2 border-[#C8860A]">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <button className="text-sm font-medium" style={{ color: '#1A8C85' }}>
            Foto ändern
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: '#555555' }}>
              <User size={16} className="inline mr-2" />
              Vorname
            </label>
            <input 
              type="text"
              defaultValue="Sarah"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F5] border border-[#EEEEEE]"
              style={{ color: '#1A1A1A' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: '#555555' }}>
              <User size={16} className="inline mr-2" />
              Nachname
            </label>
            <input 
              type="text"
              defaultValue="Müller"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F5] border border-[#EEEEEE]"
              style={{ color: '#1A1A1A' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: '#555555' }}>
              <Mail size={16} className="inline mr-2" />
              E-Mail
            </label>
            <input 
              type="email"
              defaultValue="sarah.mueller@email.com"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F5] border border-[#EEEEEE]"
              style={{ color: '#1A1A1A' }}
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E8F5E9', color: '#1A8C85' }}>
                ✓ Verifiziert
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: '#555555' }}>
              <Phone size={16} className="inline mr-2" />
              Telefonnummer
            </label>
            <input 
              type="tel"
              defaultValue="+49 170 1234567"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F5] border border-[#EEEEEE]"
              style={{ color: '#1A1A1A' }}
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E8F5E9', color: '#1A8C85' }}>
                ✓ Verifiziert
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: '#555555' }}>
              <Calendar size={16} className="inline mr-2" />
              Geburtsdatum
            </label>
            <input 
              type="date"
              defaultValue="1995-06-15"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F5] border border-[#EEEEEE]"
              style={{ color: '#1A1A1A' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: '#555555' }}>
              Geschlecht
            </label>
            <select 
              defaultValue="female"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F5] border border-[#EEEEEE]"
              style={{ color: '#1A1A1A' }}
            >
              <option value="female">Weiblich</option>
              <option value="male">Männlich</option>
              <option value="diverse">Divers</option>
              <option value="none">Keine Angabe</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 space-y-3">
          <button 
            className="w-full h-12 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#8B4513' }}
          >
            Änderungen speichern
          </button>
          <Link to="/client/profile">
            <button 
              className="w-full h-12 rounded-xl font-medium border-2"
              style={{ borderColor: '#EEEEEE', color: '#555555' }}
            >
              Abbrechen
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
