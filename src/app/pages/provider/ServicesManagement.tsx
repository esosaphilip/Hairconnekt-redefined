import { Link } from 'react-router';
import { ArrowLeft, Plus, MoreVertical } from 'lucide-react';

const services = [
  { id: 1, category: 'Flechten', name: 'Knotless Braids', duration: '4-5 Std.', price: 65, active: true },
  { id: 2, category: 'Flechten', name: 'Box Braids', duration: '5-6 Std.', price: 55, active: true },
  { id: 3, category: 'Flechten', name: 'Cornrows', duration: '2-3 Std.', price: 45, active: false },
];

export default function ServicesManagement() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 border-[#EEEEEE]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/provider/dashboard"><ArrowLeft size={24} style={{ color: '#8B4513' }} /></Link>
            <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Services & Preise</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="font-bold mb-3" style={{ color: '#8B4513' }}>Flechten</h2>
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className={`bg-white rounded-xl p-4 ${
                service.active ? '' : 'opacity-60'
              }`} style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold" style={{ color: '#1A1A1A' }}>{service.name}</h3>
                      {!service.active && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-[#F5F5F5] text-[#555555]">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-2" style={{ color: '#555555' }}>{service.duration}</p>
                    <p className="font-bold" style={{ color: '#8B4513' }}>€{service.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="w-12 h-6 rounded-full relative transition-colors"
                            style={{ backgroundColor: service.active ? '#2E7D32' : '#CCCCCC' }}>
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        service.active ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                    <button><MoreVertical size={20} style={{ color: '#555555' }} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2 border-2 border-dashed border-[#EEEEEE] text-[#8B4513]">
          <Plus size={20} />
          Service hinzufügen
        </button>
      </div>

      <Link to="/provider/dashboard">
        <button className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
                style={{ backgroundColor: '#E05A4E' }}>
          <Plus size={24} className="text-white" />
        </button>
      </Link>
    </div>
  );
}