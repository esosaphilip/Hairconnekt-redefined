import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

export default function ProviderCalendar() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState(15);

  return (
    <div className="min-h-screen pb-24 bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 border-[#EEEEEE]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Terminkalender</h1>
          <button className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#E05A4E' }}>
            <Plus size={20} className="text-white" />
          </button>
        </div>

        <div className="flex gap-2">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                view === v ? 'text-white' : 'text-[#555555]'
              }`}
              style={{ backgroundColor: view === v ? '#8B4513' : '#F5F5F5' }}
            >
              {v === 'month' ? 'Monat' : v === 'week' ? 'Woche' : 'Tag'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl p-4 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <button><ChevronLeft size={20} style={{ color: '#8B4513' }} /></button>
            <div className="flex items-center gap-2">
              <h2 className="font-bold" style={{ color: '#8B4513' }}>März 2026</h2>
              <button className="px-3 py-1 rounded-full text-xs font-medium bg-[#F5F5F5] text-[#8B4513]">
                Heute
              </button>
            </div>
            <button><ChevronRight size={20} style={{ color: '#8B4513' }} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="text-center text-xs font-medium py-2" style={{ color: '#555555' }}>
                {day}
              </div>
            ))}
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative ${
                  selectedDate === day ? 'text-white' : ''
                }`}
                style={{ 
                  backgroundColor: selectedDate === day ? '#E05A4E' : 'transparent',
                  color: selectedDate === day ? 'white' : '#1A1A1A'
                }}
              >
                <span>{day}</span>
                {/* Appointment dots */}
                {(day === 15 || day === 16 || day === 20) && (
                  <div className="flex gap-0.5 mt-1">
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: selectedDate === day ? 'white' : '#2E7D32' }} />
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: selectedDate === day ? 'white' : '#2E7D32' }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day's Appointments */}
        <div>
          <h3 className="font-bold mb-3" style={{ color: '#8B4513' }}>{selectedDate}. März 2026</h3>
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #2E7D32' }}>
              <div className="flex justify-between mb-2">
                <p className="font-bold" style={{ color: '#1A1A1A' }}>10:00 - 15:00</p>
                <span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: '#2E7D32' }}>
                  Bestätigt
                </span>
              </div>
              <p className="text-sm mb-1" style={{ color: '#555555' }}>Sarah Müller</p>
              <p className="text-sm" style={{ color: '#555555' }}>Knotless Braids • €65</p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl text-center bg-[#FAFAFA]">
            <p className="text-sm font-medium" style={{ color: '#8B4513' }}>Gewinnpotenzial heute: €130</p>
          </div>
        </div>
      </div>

      <BottomNav active="appointments" mode="provider" />
    </div>
  );
}