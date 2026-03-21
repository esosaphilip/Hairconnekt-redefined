import { motion } from "motion/react";
import { openingHours } from "../../config/data";
import { clsx } from "clsx";

export function HoursSection() {
  return (
    <section id="hours" className="py-24 bg-brand-cream relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <h2 className="font-display font-bold text-4xl text-brand-charcoal mb-4">Öffnungszeiten</h2>
          <p className="font-serif italic text-xl text-brand-charcoal/70 mb-12">
            Wir freuen uns auf Ihren Besuch.
          </p>

          <div className="bg-brand-white p-8 md:p-12 rounded-lg shadow-sm border border-gray-100">
            <div className="space-y-4 font-sans text-lg">
              {openingHours.map((oh) => (
                <div 
                  key={oh.day} 
                  className={clsx(
                    "flex justify-between items-center py-3 border-b border-gray-50 last:border-0",
                    oh.closed ? "bg-red-50 -mx-4 px-4 rounded text-brand-red font-semibold" : "text-brand-charcoal"
                  )}
                >
                  <span className="font-medium">{oh.day}</span>
                  <span className={clsx("tracking-wide", oh.closed && "bg-brand-red text-brand-white text-xs px-2 py-1 rounded")}>
                    {oh.hours}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 border-t border-gray-100 pt-8">
              <span className="inline-block px-4 py-1.5 bg-green-100 text-green-800 font-sans font-semibold text-sm rounded-full">
                Walk-ins willkommen
              </span>
              <span className="font-sans text-brand-charcoal/60 text-sm">
                Lieferung ab 17:00 Uhr täglich
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
