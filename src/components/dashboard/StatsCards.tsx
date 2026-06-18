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
      className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5"
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        
        return (
          <motion.div
            variants={itemVariants}
            key={i}
            className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-sm hover:border-slate-300/80 transition-all duration-300"
          >
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono truncate">
                {stat.label}
              </p>
              <h4 className="text-xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-1.5 font-display tracking-tight truncate">
                {stat.value}
              </h4>
              {stat.description && (
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">
                  {stat.description}
                </p>
              )}
            </div>

            <div className={`p-2.5 sm:p-3.5 rounded-lg shrink-0 ${stat.color} text-white self-start sm:self-auto`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
