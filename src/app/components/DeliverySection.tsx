import { motion } from "motion/react";
import { PhoneCall } from "lucide-react";
import { contactInfo } from "../../config/data";

export function DeliverySection() {
  return (
    <section id="delivery" className="py-24 bg-brand-red relative overflow-hidden text-center">
      <div className="absolute inset-0 checkered-pattern opacity-10 pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="font-display font-bold text-4xl md:text-5xl text-brand-white mb-6">
            Wir liefern — ab 17:00 Uhr
          </h2>
          <p className="font-serif italic text-xl md:text-2xl text-brand-cream mb-12">
            Rufen Sie uns einfach an. Lieferung ins Barmen-Gebiet.
          </p>

          <a 
            href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
            className="group inline-flex items-center justify-center bg-brand-white text-brand-red font-sans font-bold text-lg md:text-2xl px-8 md:px-12 py-5 rounded-full shadow-xl hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mr-4"
            >
              <PhoneCall className="w-6 h-6 md:w-8 md:h-8" />
            </motion.div>
            {contactInfo.phone} — Jetzt bestellen
          </a>

          <p className="font-sans text-brand-cream/80 text-sm mt-8 mt-12">
            Liefergebiet: Wuppertal-Barmen und Umgebung
          </p>
        </motion.div>
      </div>
    </section>
  );
}
