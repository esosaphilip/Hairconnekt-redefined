import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { User, Scissors } from 'lucide-react';

export default function AccountTypeSelection() {
  const navigate = useNavigate();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleContinue = () => {
    if (selectedTypes.length === 0) return;
    
    if (selectedTypes.includes('client')) {
      navigate('/register');
    } else {
      navigate('/provider/type-selection');
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col bg-white">
      {/* Logo */}
      <div className="text-center mb-8 pt-8">
        <div className="w-12 h-12 rounded-full border-2 border-[#C8860A] flex items-center justify-center bg-white shadow-md mx-auto mb-3">
          <span className="font-heading text-xl text-[#8B4513]">HC</span>
        </div>
        <h1 className="font-heading text-3xl text-[#8B4513]">
          Willkommen bei HairConnekt
        </h1>
      </div>

      {/* Selection Cards */}
      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Client Card */}
        <button
          onClick={() => toggleType('client')}
          className={`relative p-6 rounded-xl transition-all duration-200 hover:scale-[0.98] ${
            selectedTypes.includes('client')
              ? 'bg-white border-2 border-[#8B4513]'
              : 'bg-white border border-[#EEEEEE]'
          }`}
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
        >
          <div className="flex gap-4 items-start">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              selectedTypes.includes('client') ? 'bg-[#E05A4E]' : 'bg-[#F5F5F5]'
            }`}>
              <User className={selectedTypes.includes('client') ? 'text-white' : 'text-[#8B4513]'} size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-lg mb-1 text-[#1A1A1A]">
                Ich suche einen Friseur
              </div>
              <p className="text-sm text-[#6B6B6B]">
                Finde Braider, Salons & Stylisten in deiner Nähe
              </p>
            </div>
            {selectedTypes.includes('client') && (
              <div className="w-6 h-6 rounded bg-[#E05A4E] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13 4L6 11L3 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        </button>

        {/* Provider Card */}
        <button
          onClick={() => toggleType('provider')}
          className={`relative p-6 rounded-xl transition-all duration-200 hover:scale-[0.98] ${
            selectedTypes.includes('provider')
              ? 'bg-white border-2 border-[#8B4513]'
              : 'bg-white border border-[#EEEEEE]'
          }`}
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
        >
          <div className="flex gap-4 items-start">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              selectedTypes.includes('provider') ? 'bg-[#E05A4E]' : 'bg-[#F5F5F5]'
            }`}>
              <Scissors className={selectedTypes.includes('provider') ? 'text-white' : 'text-[#8B4513]'} size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-lg mb-1 text-[#1A1A1A]">
                Ich biete Friseur-Services an
              </div>
              <p className="text-sm text-[#6B6B6B]">
                Zeige deine Arbeit und gewinne neue Kunden
              </p>
            </div>
            {selectedTypes.includes('provider') && (
              <div className="w-6 h-6 rounded bg-[#E05A4E] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13 4L6 11L3 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Continue Button */}
      <div className="max-w-md mx-auto w-full mt-6">
        <button
          onClick={handleContinue}
          disabled={selectedTypes.length === 0}
          className={`w-full h-14 rounded-xl font-bold transition-all ${
            selectedTypes.length === 0
              ? 'bg-[#E0E0E0] text-[#AAAAAA] cursor-not-allowed'
              : 'bg-[#E05A4E] text-white active:scale-[0.98]'
          }`}
          style={selectedTypes.length > 0 ? { boxShadow: '0 4px 16px rgba(224,90,78,0.25)' } : {}}
        >
          Weiter
        </button>
        
        <div className="text-center mt-4">
          <Link to="/login" className="text-[#1A8C85] hover:underline">
            Bereits registriert? Anmelden
          </Link>
        </div>
      </div>
    </div>
  );
}