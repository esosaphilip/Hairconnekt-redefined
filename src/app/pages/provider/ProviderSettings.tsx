import { Link } from 'react-router';
import { ArrowLeft, User, Calendar, FileText, Bell, LogOut, Pause } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

export default function ProviderSettings() {
  return (
    <div className="min-h-screen pb-24 bg-white">
      <div className="sticky top-0 bg-white border-b px-4 py-4 border-[#EEEEEE]">
        <div className="flex items-center gap-3">
          <Link to="/provider/dashboard"><ArrowLeft size={24} style={{ color: '#8B4513' }} /></Link>
          <h1 className="font-heading text-xl" style={{ color: '#8B4513' }}>Einstellungen</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Business Section */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#555555' }}>Business</h2>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            {[
              { icon: User, label: 'Mein Profil bearbeiten', path: '#' },
              { icon: FileText, label: 'Services & Preise', path: '/provider/services' },
              { icon: Calendar, label: 'Verfügbarkeit', path: '#' },
            ].map((item, idx) => (
              <Link key={idx} to={item.path}
                    className="flex items-center justify-between p-4 border-b last:border-0 border-[#EEEEEE]">
                <div className="flex items-center gap-3">
                  <item.icon size={20} style={{ color: '#8B4513' }} />
                  <span style={{ color: '#1A1A1A' }}>{item.label}</span>
                </div>
                <span style={{ color: '#AAAAAA' }}>›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* App Section */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#555555' }}>App-Einstellungen</h2>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Link to="#"
                  className="flex items-center justify-between p-4 border-[#EEEEEE]">
              <div className="flex items-center gap-3">
                <Bell size={20} style={{ color: '#8B4513' }} />
                <span style={{ color: '#1A1A1A' }}>Benachrichtigungen</span>
              </div>
              <span style={{ color: '#AAAAAA' }}>›</span>
            </Link>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-3 pt-4">
          <button className="w-full p-4 rounded-xl bg-white flex items-center gap-3 justify-center"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Pause size={20} style={{ color: '#BF6000' }} />
            <span className="font-medium" style={{ color: '#BF6000' }}>Account pausieren</span>
          </button>
          
          <Link to="/client/profile"
                className="block w-full p-4 rounded-xl bg-white border-2 flex items-center gap-3 justify-center"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderColor: '#1A8C85' }}>
            <span className="text-xl">👤</span>
            <span className="font-medium" style={{ color: '#1A8C85' }}>Zum Kunden-Modus wechseln</span>
          </Link>

          <button className="w-full p-4 rounded-xl bg-white flex items-center gap-3 justify-center"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <LogOut size={20} style={{ color: '#C62828' }} />
            <span className="font-medium" style={{ color: '#C62828' }}>Abmelden</span>
          </button>
        </div>

        <p className="text-center text-sm pt-4" style={{ color: '#AAAAAA' }}>
          HairConnekt v1.0.0
        </p>
      </div>

      <BottomNav active="profile" mode="provider" />
    </div>
  );
}