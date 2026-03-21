import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

const services = [
  { id: 1, category: 'Flechten', name: 'Knotless Braids', duration: '4-5 Std.', price: 65, desc: 'Schonend für Kopfhaut' },
  { id: 2, category: 'Flechten', name: 'Box Braids', duration: '5-6 Std.', price: 55, desc: 'Klassische Box Braids' },
  { id: 3, category: 'Flechten', name: 'Cornrows', duration: '2-3 Std.', price: 45, desc: 'Kreative Muster möglich' },
  { id: 4, category: 'Locs', name: 'Starter Locs', duration: '3-4 Std.', price: 70, desc: 'Neue Locs anlegen' },
];

export default function ServiceSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number[]>([]);

  const toggleService = (serviceId: number) => {
    setSelected(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const selectedServices = services.filter(s => selected.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="min-h-screen pb-24 bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 border-[#EEEEEE]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/client/provider/${id}`}><ArrowLeft size={24} style={{ color: '#8B4513' }} /></Link>
            <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Services auswählen</h1>
          </div>
          <div className="relative">
            <ShoppingCart size={24} style={{ color: '#8B4513' }} />
            {selected.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: '#E05A4E' }}>
                {selected.length}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => toggleService(service.id)}
            className={`w-full text-left bg-white rounded-xl p-4 transition-all ${
              selected.includes(service.id) ? 'border-l-4' : ''
            }`}
            style={{ 
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              borderColor: selected.includes(service.id) ? '#E05A4E' : 'transparent',
              backgroundColor: selected.includes(service.id) ? '#FAFAFA' : 'white'
            }}
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0 pt-1">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  selected.includes(service.id) ? 'bg-[#E05A4E] border-[#E05A4E]' : 'border-[#EEEEEE]'
                }`}>
                  {selected.includes(service.id) && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M11 4L5.5 9.5L3 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{service.name}</h3>
                  <span className="font-bold" style={{ color: '#8B4513' }}>€{service.price}</span>
                </div>
                <p className="text-sm" style={{ color: '#555555' }}>{service.duration} • {service.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Summary Bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 border-[#EEEEEE]" style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm" style={{ color: '#555555' }}>{selected.length} Service{selected.length > 1 ? 's' : ''} ausgewählt</p>
              <p className="font-bold" style={{ color: '#8B4513' }}>Gesamt: €{totalPrice}</p>
            </div>
            <button 
              onClick={() => navigate('/client/booking/datetime')}
              className="px-8 h-12 rounded-xl font-bold text-white" 
              style={{ backgroundColor: '#E05A4E' }}
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}