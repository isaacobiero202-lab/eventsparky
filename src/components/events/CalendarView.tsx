
import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string;
  image_url: string;
}

interface CalendarViewProps {
  events: Event[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(parseISO(event.event_date), day));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-12">
      {/* Calendar Header */}
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white relative z-10">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">
            Event Schedule Grid
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400 hover:text-indigo-600 border border-slate-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 rounded-xl transition"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400 hover:text-indigo-600 border border-slate-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-3 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 grid-rows-5 bg-slate-100 gap-[1px]">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isInMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={idx}
              className={`min-h-[140px] bg-white p-3 transition h-full relative group ${
                isInMonth ? '' : 'bg-slate-50/50 grayscale-[0.5] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : isInMonth ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                    {dayEvents.length} Event{dayEvents.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {dayEvents.slice(0, 3).map(event => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="block p-1.5 bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xs rounded-lg transition group/event overflow-hidden"
                  >
                    <p className="text-[10px] font-bold text-slate-700 truncate leading-tight group-hover/event:text-indigo-600">
                      {event.title}
                    </p>
                    <div className="flex items-center text-[8px] text-slate-400 mt-0.5 truncate">
                      <Clock className="w-2.5 h-2.5 mr-1 shrink-0" />
                      <span>{format(parseISO(event.event_date), 'h:mm a')}</span>
                    </div>
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-slate-400 font-bold pl-1">
                    + {dayEvents.length - 3} more...
                  </div>
                )}
              </div>

              {/* Hover indicator for interactive areas */}
              <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/[0.02] transition pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
