import React from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatPrice } from '../../utils/formatDate';
import { Calendar, MapPin, Users, Flame, Edit, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface EventCardProps {
  event: Event;
  onDelete?: (id: string) => void | Promise<void>;
  key?: any;
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const { profile } = useAuth();

  const isOrganizer = profile?.id === event.organizer_id && profile?.role === 'organizer';
  const isAdmin = profile?.role === 'admin';
  const canManage = isOrganizer || isAdmin;

  const spotsLeft = event.capacity ? event.capacity - (event.registration_count || 0) : null;
  const isSoldOut = event.capacity > 0 && spotsLeft !== null && spotsLeft <= 0;

  // Render a clean fallback image if event image is null or empty
  const bannerImage = event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

  return (
    <motion.div
      whileHover={{ 
        y: -4,
        scale: 1.015,
        boxShadow: "0 10px 20px -6px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.03)",
        borderColor: "rgba(203, 213, 225, 0.95)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25 
      }}
      className="bg-white rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs flex flex-col h-full group"
    >
      {/* Event Banner */}
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img
          src={bannerImage}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 rounded-md shadow-xs">
            {formatPrice(event.price)}
          </span>
          {isSoldOut ? (
            <span className="px-2.5 py-1 text-xs font-bold text-white bg-rose-500 rounded-md shadow-xs flex items-center space-x-1 animate-pulse">
              <span>Sold Out</span>
            </span>
          ) : spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 ? (
            <span className="px-2.5 py-1 text-xs font-bold text-white bg-amber-500 rounded-md shadow-xs flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Only {spotsLeft} Left</span>
            </span>
          ) : null}
        </div>

        {/* Organizer / Admin Actions Overlay */}
        {canManage && (
          <div className="absolute top-3 right-3 flex space-x-1.5 z-10">
            <Link
              to={`/edit-event/${event.id}`}
              className="p-1.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md shadow-xs transition"
              title="Edit Event"
            >
              <Edit className="w-4 h-4" />
            </Link>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm('Are you absolutely sure you want to delete this event? This action will cancel all registrations!')) {
                    onDelete(event.id);
                  }
                }}
                className="p-1.5 bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-md shadow-xs transition cursor-pointer"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors font-display tracking-tight">
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </h3>
          
          <p className="mt-2 text-slate-500 text-sm line-clamp-2 h-10">
            {event.description || 'No description provided for this event. Click view details to read more.'}
          </p>

          {/* Quick Stats Grid */}
          <div className="mt-4 pt-4 border-t border-slate-50 space-y-2 text-slate-600 text-xs">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="truncate">{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="truncate">{event.location || 'TBD'}</span>
            </div>
            {event.capacity > 0 && (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  {event.registration_count || 0} / {event.capacity} registered
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500 max-w-[60%]">
            {event.organizer?.avatar_url ? (
              <img
                src={event.organizer.avatar_url}
                alt={event.organizer.full_name || 'Organizer'}
                className="w-5 h-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">
                O
              </div>
            )}
            <span className="truncate font-medium">By {event.organizer?.full_name || 'Organizer'}</span>
          </div>

          <Link
            to={`/events/${event.id}`}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
