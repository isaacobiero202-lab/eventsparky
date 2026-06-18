import { Users, Calendar, ClipboardCheck, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Stat {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  description?: string;
}

interface StatsCardsProps {
  stats: Stat[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15
    }
  }
};

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        
        return (
          <motion.div
            variants={itemVariants}
            key={i}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between group hover:shadow-sm hover:border-slate-300/80 transition-all duration-300"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                {stat.label}
              </p>
              <h4 className="text-3xl font-bold text-slate-900 mt-1.5 font-display tracking-tight">
                {stat.value}
              </h4>
              {stat.description && (
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {stat.description}
                </p>
              )}
            </div>

            <div className={`p-3.5 rounded-lg shrink-0 ${stat.color} text-white`}>
              <Icon className="w-5 h-5" />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
