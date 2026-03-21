import { motion } from "motion/react";
import { Pizza, Clock, Heart } from "lucide-react";

export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-brand-cream border-y border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative h-[500px] rounded-lg overflow-hidden shadow-md"
          >
            <img 
              src="https://images.unsplash.com/photo-1596641069082-b1d5ac2b6fc1?q=80&w=1200&auto=format&fit=crop" 
              alt="Warm restaurant interior"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="font-display font-bold text-4xl text-brand-charcoal mb-6">
              Handwerk seit Jahren in Barmen
            </h2>
            <div className="font-sans text-brand-charcoal/80 text-lg leading-relaxed space-y-6 mb-10">
              <p>
                <strong className="text-brand-charcoal font-semibold">Honarmand</strong> bedeutet auf Persisch: Handwerker, Künstler. Und genau das leben wir hier jeden Tag.
              </p>
              <p>
                Seit Jahren kochen wir in Barmen für Barmen. Kein Schnickschnack — echtes Essen, faire Preise, und ein herzliches Willkommen für jeden, der hereinkommt. Egal ob auf einen schnellen Döner in der Mittagspause oder eine gemütliche Pizza am Abend.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-brand-charcoal/10">
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center">
                  <Pizza className="w-6 h-6" />
                </div>
                <span className="font-sans font-semibold text-brand-charcoal">Frisch zubereitet</span>
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="font-sans font-semibold text-brand-charcoal">Schnell & gut</span>
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
                <span className="font-sans font-semibold text-brand-charcoal">Seit Jahren im Viertel</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
