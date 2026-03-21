import { useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Check, MessageCircle } from 'lucide-react';

export default function BookingConfirmation() {
  useEffect(() => {
    // Confetti animation trigger
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-[#E8F5E9]"
      >
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Check size={48} className="text-[#2E7D32]" />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-heading text-3xl text-center mb-2 text-[#8B4513]"
      >
        Termin bestätigt! 🎉
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl p-6 mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-[#C8860A]">
              <img src="https://images.unsplash.com/photo-1688592969417-953dd3c2b9d8" alt="Provider" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A1A1A]">Amara Okafor</h2>
              <p className="text-sm text-[#6B6B6B]">15. März 2026, 14:00 Uhr</p>
            </div>
          </div>
          
          <div className="border-t pt-4 border-[#EEEEEE]">
            <p className="text-sm mb-1 text-[#6B6B6B]">Service:</p>
            <p className="font-medium mb-3 text-[#1A1A1A]">Knotless Braids</p>
            
            <p className="text-sm mb-1 text-[#6B6B6B]">Gesamt:</p>
            <p className="font-bold text-xl text-[#8B4513]">€65</p>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-[#E8F5E9]">
            <p className="text-sm font-medium text-[#2E7D32]">✓ Bestätigt</p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-[#FAFAFA]">
          <p className="font-mono text-sm text-center text-[#6B6B6B]">
            Buchungsnr.: #BK-20260315-0042
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <Link
            to="/chat/1"
            className="flex-1 h-12 rounded-xl border border-[#8B4513] font-medium flex items-center justify-center gap-2 text-[#8B4513]"
          >
            <MessageCircle size={18} />
            Nachricht
          </Link>
          <Link
            to="/client/appointments"
            className="flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center bg-[#E05A4E]"
            style={{ boxShadow: '0 4px 16px rgba(224,90,78,0.25)' }}
          >
            Fertig
          </Link>
        </div>

        <div className="space-y-2 text-center text-sm text-[#6B6B6B]">
          <h3 className="font-medium text-[#8B4513]">Was kommt als Nächstes?</h3>
          <p>✓ Buchung bestätigt</p>
          <p>→ Bestätigungs-E-Mail</p>
          <p>→ 24-Std. Erinnerung</p>
          <p>→ Termin</p>
        </div>
      </motion.div>
    </div>
  );
}