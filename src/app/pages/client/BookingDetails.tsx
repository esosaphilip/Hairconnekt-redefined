import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export default function BookingDetails() {
  const navigate = useNavigate();
  const [mobileService, setMobileService] = useState(false);
  const [notes, setNotes] = useState('');

  return (
    <div className="min-h-screen pb-32 bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-3">
          <Link to="/client/booking/datetime"><ArrowLeft size={24} style={{ color: '#8B4513' }} /></Link>
          <div>
            <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Buchungsdetails</h1>
            <p className="text-sm" style={{ color: '#555555' }}>Schritt 3 von 4</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium" style={{ color: '#1A1A1A' }}>Mobiler Service gewünscht</label>
            <button
              onClick={() => setMobileService(!mobileService)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                mobileService ? 'bg-[#1A8C85]' : 'bg-[#CCCCCC]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                mobileService ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {mobileService && (
            <p className="text-sm" style={{ color: '#555555' }}>+€15 Mobiler Service</p>
          )}
        </div>

        <div>
          <label className="block mb-2 font-medium" style={{ color: '#1A1A1A' }}>Notizen für den Braider</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Besondere Wünsche, Haartyp, Allergien..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl border resize-none bg-[#F5F5F5] border-[#EEEEEE]"
          />
          <p className="text-xs mt-1 text-right" style={{ color: '#AAAAAA' }}>{notes.length}/500</p>
        </div>

        <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="font-medium mb-2" style={{ color: '#1A1A1A' }}>Zahlung</h3>
          <p className="text-sm" style={{ color: '#555555' }}>Vor Ort bar zahlen</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 border-[#EEEEEE]">
        <button 
          onClick={() => navigate('/client/booking/confirmation')}
          className="w-full h-12 rounded-xl font-bold text-white"
          style={{ backgroundColor: '#E05A4E' }}
        >
          Jetzt buchen
        </button>
      </div>
    </div>
  );
}