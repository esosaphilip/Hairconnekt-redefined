import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export default function DateTimeSelection() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(15);
  const [selectedTime, setSelectedTime] = useState('');

  return (
    <div className="min-h-screen pb-32 bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-3">
          <Link to="/client/provider/1/services"><ArrowLeft size={24} style={{ color: '#8B4513' }} /></Link>
          <div>
            <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Termin wählen</h1>
            <p className="text-sm" style={{ color: '#555555' }}>Schritt 2 von 4</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Calendar */}
        <div className="bg-white rounded-xl p-4 mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <button><ChevronLeft size={20} style={{ color: '#8B4513' }} /></button>
            <h2 className="font-bold" style={{ color: '#8B4513' }}>März 2026</h2>
            <button><ChevronRight size={20} style={{ color: '#8B4513' }} /></button>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="text-sm font-medium" style={{ color: '#555555' }}>{day}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square rounded-full flex items-center justify-center text-sm ${
                  selectedDate === day ? 'text-white' : day === 15 ? 'border-2' : ''
                }`}
                style={{ 
                  backgroundColor: selectedDate === day ? '#E05A4E' : 'transparent',
                  borderColor: day === 15 ? '#8B4513' : 'transparent',
                  color: selectedDate === day ? 'white' : '#1A1A1A'
                }}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <h3 className="font-bold mb-3" style={{ color: '#8B4513' }}>Verfügbare Zeiten</h3>
          <div className="grid grid-cols-3 gap-3">
            {timeSlots.map(time => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className="h-12 rounded-xl font-medium"
                style={{
                  backgroundColor: selectedTime === time ? '#E05A4E' : '#F5F5F5',
                  color: selectedTime === time ? 'white' : '#8B4513',
                  border: `2px solid ${selectedTime === time ? '#E05A4E' : '#EEEEEE'}`
                }}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      {selectedDate && selectedTime && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 border-[#EEEEEE]">
          <div className="mb-3">
            <p className="text-sm" style={{ color: '#555555' }}>Gewählter Termin</p>
            <p className="font-bold" style={{ color: '#8B4513' }}>{selectedDate}. März 2026, {selectedTime} Uhr</p>
          </div>
          <button 
            onClick={() => navigate('/client/booking/details')}
            className="w-full h-12 rounded-xl font-bold text-white"
            style={{ backgroundColor: '#E05A4E' }}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}