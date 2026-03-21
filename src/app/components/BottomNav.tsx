import { Link } from 'react-router';
import { Home, Search, Calendar, MessageCircle, User } from 'lucide-react';

interface BottomNavProps {
  active: 'home' | 'search' | 'appointments' | 'messages' | 'profile';
  mode: 'client' | 'provider';
}

export default function BottomNav({ active, mode }: BottomNavProps) {
  const isClient = mode === 'client';
  
  const navItems = [
    {
      id: 'home',
      label: 'Startseite',
      icon: Home,
      path: isClient ? '/client/home' : '/provider/dashboard',
    },
    {
      id: 'search',
      label: 'Suchen',
      icon: Search,
      path: isClient ? '/client/search' : '/provider/calendar',
      hideForProvider: true,
    },
    {
      id: 'appointments',
      label: 'Termine',
      icon: Calendar,
      path: isClient ? '/client/appointments' : '/provider/calendar',
    },
    {
      id: 'messages',
      label: 'Nachrichten',
      icon: MessageCircle,
      path: '/chat',
      badge: 2,
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: User,
      path: isClient ? '/client/profile' : '/provider/settings',
    },
  ];

  const filteredItems = navItems.filter(
    item => !(item.hideForProvider && !isClient)
  );

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t z-50"
      style={{ 
        borderColor: '#EEEEEE',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-center justify-around h-18 px-2 pb-safe">
        {filteredItems.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1"
            >
              <div className="relative">
                <Icon 
                  size={24}
                  fill={isActive ? '#8B4513' : 'none'}
                  style={{ 
                    color: isActive ? '#8B4513' : '#AAAAAA',
                    strokeWidth: isActive ? 2 : 2,
                  }} 
                />
                {item.badge && (
                  <div 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold bg-[#E05A4E]"
                  >
                    {item.badge}
                  </div>
                )}
              </div>
              <span 
                className={`text-xs mt-1 ${isActive ? 'font-bold' : ''}`}
                style={{ color: isActive ? '#8B4513' : '#AAAAAA' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}