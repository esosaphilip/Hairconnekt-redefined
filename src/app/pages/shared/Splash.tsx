import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/account-type');
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
      
      {/* Background hair-strand animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg width="300" height="400" viewBox="0 0 300 400" fill="none" className="opacity-10">
          <path 
            d="M150 50 Q 120 150 150 250 T 150 350" 
            stroke="#8B4513" 
            strokeWidth="3" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M170 60 Q 140 160 170 260 T 170 360" 
            stroke="#8B4513" 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M130 60 Q 100 160 130 260 T 130 360" 
            stroke="#8B4513" 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center z-10"
      >
        <div className="mb-4 flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-[#C8860A] flex items-center justify-center bg-white shadow-lg">
              <span className="font-heading text-3xl text-[#8B4513]">HC</span>
            </div>
          </div>
        </div>
        <h1 className="font-heading text-4xl mb-2 text-[#8B4513]">
          HairConnekt
        </h1>
        <p className="text-[#6B6B6B]">
          Verbinde dich mit deinem perfekten Style
        </p>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-12 flex gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[#8B4513]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}