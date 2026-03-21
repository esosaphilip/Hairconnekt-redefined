import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { menuCategories } from "../../config/data";
import { clsx } from "clsx";

export function MenuSection() {
  const [activeTab, setActiveTab] = useState(menuCategories[0].id);

  const activeCategory = menuCategories.find(c => c.id === activeTab);

  return (
    <section id="menu" className="py-24 bg-brand-cream relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-bold text-4xl text-brand-charcoal mb-4">Speisekarte</h2>
          <p className="font-serif italic text-xl text-brand-charcoal/70">
            Frisch zubereitet, heiß serviert.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12">
          {menuCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className={clsx(
                "px-4 md:px-6 py-2.5 font-sans font-medium text-sm md:text-base transition-all rounded shadow-sm border",
                activeTab === category.id 
                  ? "bg-brand-red text-brand-white border-brand-red" 
                  : "bg-brand-white text-brand-charcoal border-gray-200 hover:border-brand-red/50 hover:bg-brand-blush/30"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Content */}
        <div className="bg-brand-white rounded-lg shadow-sm border border-gray-100 overflow-hidden relative group">
          {/* Subtle checkered accent top left */}
          <div className="absolute top-0 left-0 w-32 h-32 checkered-pattern opacity-30 pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="p-6 md:p-10 relative z-10"
            >
              <h3 className="font-serif italic font-semibold text-2xl text-brand-red mb-8 border-b border-gray-100 pb-4">
                {activeCategory?.name}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {activeCategory?.items.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-end border-b border-gray-50 pb-3 hover:border-brand-red/30 transition-colors"
                  >
                    <div className="font-sans font-medium text-brand-charcoal">
                      {item.name}
                    </div>
                    <div className="font-sans font-bold text-brand-red pl-4 shrink-0">
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Hover interaction - red border traces */}
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-red/20 transition-colors duration-500 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
