import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { User, Building, MapPin, Scissors } from 'lucide-react';

export default function ProviderTypeSelection() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);

  const types = [
    { id: 'freelancer', icon: User, title: 'Einzelperson / Freelancer', desc: 'Ich arbeite selbstständig' },
    { id: 'salon', icon: Building, title: 'Salon / Barbershop', desc: 'Ich habe ein Geschäft' },
    { id: 'mobile', icon: MapPin, title: 'Mobiler Service', desc: 'Ich komme zu meinen Kunden' },
    { id: 'barber', icon: Scissors, title: 'Barber', desc: 'Haar- und Bartpflege' },
  ];

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="font-heading text-3xl mb-2" style={{ color: '#8B4513' }}>
          Welchen Service bietest du an?
        </h1>
        <p className="mb-8" style={{ color: '#555555' }}>
          Du kannst mehrere Optionen auswählen
        </p>

        <div className="grid gap-4 mb-8">
          {types.map((type) => {
            const Icon = type.icon;
            const isSelected = selected.includes(type.id);
            
            return (
              <button
                key={type.id}
                onClick={() => toggle(type.id)}
                className={`p-6 rounded-xl text-left transition-all ${
                  isSelected ? 'border-l-4' : 'border-2'
                }`}
                style={{
                  backgroundColor: isSelected ? '#FAFAFA' : 'white',
                  borderColor: isSelected ? '#E05A4E' : '#EEEEEE',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[#E05A4E]' : 'bg-[#F5F5F5]'
                  }`}>
                    <Icon size={24} className={isSelected ? 'text-white' : ''} style={{ color: isSelected ? 'white' : '#8B4513' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1" style={{ color: '#1A1A1A' }}>{type.title}</h3>
                    <p className="text-sm" style={{ color: '#555555' }}>{type.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded bg-[#E05A4E] flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M11 4L5.5 9.5L3 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/provider/register/step1')}
          disabled={selected.length === 0}
          className={`w-full h-14 rounded-xl font-bold transition-all ${
            selected.length === 0 ? 'bg-[#CCCCCC] text-[#888888]' : 'bg-[#E05A4E] text-white'
          }`}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}