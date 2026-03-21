import { Link } from 'react-router';
import { ArrowLeft, ChevronRight, User, Lock, Bell, Globe, Shield, FileText, LogOut, Trash2 } from 'lucide-react';

export default function Settings() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b px-6 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-3">
          <Link to="/client/home">
            <ArrowLeft size={24} style={{ color: '#8B4513' }} />
          </Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>
            Einstellungen
          </h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Account Section */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#555555' }}>Account</h2>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            {[
              { icon: User, label: 'Persönliche Informationen', path: '#' },
              { icon: Lock, label: 'Passwort & Sicherheit', path: '#' },
            ].map((item, idx) => (
              <Link key={idx} to={item.path} className="flex items-center justify-between p-4 border-b last:border-0 border-[#EEEEEE]">
                <div className="flex items-center gap-3">
                  <item.icon size={20} style={{ color: '#8B4513' }} />
                  <span style={{ color: '#1A1A1A' }}>{item.label}</span>
                </div>
                <ChevronRight size={20} style={{ color: '#AAAAAA' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* App Settings */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#555555' }}>App-Einstellungen</h2>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            {[
              { icon: Globe, label: 'Sprache', value: 'Deutsch', path: '#' },
              { icon: Bell, label: 'Benachrichtigungen', path: '#' },
            ].map((item, idx) => (
              <Link key={idx} to={item.path} className="flex items-center justify-between p-4 border-b last:border-0 border-[#EEEEEE]">
                <div className="flex items-center gap-3">
                  <item.icon size={20} style={{ color: '#8B4513' }} />
                  <span style={{ color: '#1A1A1A' }}>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-sm" style={{ color: '#555555' }}>{item.value}</span>}
                  <ChevronRight size={20} style={{ color: '#AAAAAA' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#555555' }}>Rechtliches</h2>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            {[
              { icon: FileText, label: 'AGB', path: '#' },
              { icon: Shield, label: 'Datenschutzerklärung', path: '#' },
              { icon: FileText, label: 'Impressum', path: '#' },
            ].map((item, idx) => (
              <Link key={idx} to={item.path} className="flex items-center justify-between p-4 border-b last:border-0 border-[#EEEEEE]">
                <div className="flex items-center gap-3">
                  <item.icon size={20} style={{ color: '#8B4513' }} />
                  <span style={{ color: '#1A1A1A' }}>{item.label}</span>
                </div>
                <ChevronRight size={20} style={{ color: '#AAAAAA' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3 pt-4">
          <button className="w-full p-4 rounded-xl bg-white flex items-center gap-3 justify-center"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <LogOut size={20} style={{ color: '#C62828' }} />
            <span className="font-medium" style={{ color: '#C62828' }}>Abmelden</span>
          </button>
          <button className="w-full p-4 rounded-xl bg-white flex items-center gap-3 justify-center"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Trash2 size={20} style={{ color: '#C62828' }} />
            <span className="font-medium" style={{ color: '#C62828' }}>Account löschen</span>
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-sm pt-4" style={{ color: '#AAAAAA' }}>
          HairConnekt v1.0.0
        </p>
      </div>
    </div>
  );
}