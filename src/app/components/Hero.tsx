import { motion } from "motion/react";
import { contactInfo } from "../../config/data";

export function Hero() {
  const headlineWords = "Barmer Pizzeria".split(" ");

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-brand-charcoal">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1648411897425-7713de428509?q=80&w=2000&auto=format&fit=crop')` }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 z-10 bg-black/60" />

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-block px-4 py-1 mb-6 border border-brand-gold text-brand-gold font-sans font-semibold text-xs tracking-[0.2em] uppercase"
        >
          Ihr Imbiss in Wuppertal-Barmen
        </motion.span>

        <h1 className="font-display font-bold text-5xl md:text-7xl text-brand-white mb-6 leading-tight">
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: "easeOut" }}
              className="inline-block mr-4 last:mr-0"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-serif italic text-2xl md:text-3xl text-brand-cream mb-6"
        >
          Pizza &middot; Grill &middot; Döner &middot; Pasta
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="font-sans text-brand-white/80 text-lg mb-10"
        >
          Hausgemacht. Frisch. Seit Jahren in Barmen.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a 
            href="#menu" 
            className="px-8 py-3 bg-brand-gold text-brand-white font-sans font-semibold rounded hover:bg-yellow-600 transition-colors shadow-lg"
          >
            Speisekarte ansehen
          </a>
          <a 
            href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} 
            className="px-8 py-3 border-2 border-brand-white text-brand-white font-sans font-semibold rounded hover:bg-brand-white hover:text-brand-charcoal transition-colors"
          >
            Jetzt anrufen
          </a>
        </motion.div>
      </div>

      {/* Decorative Bottom Border */}
      <div className="absolute bottom-0 left-0 right-0 z-20 checkered-border" />
    </section>
  );
}
