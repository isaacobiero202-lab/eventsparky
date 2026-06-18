import React, { useState, useRef, useEffect } from 'react';
import { useNotifications, Notification } from '../../hooks/useNotifications';
import { useRegistrations } from '../../hooks/useRegistrations';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatDate';
import { 
  Bell, 
  Mail, 
  Tv, 
  Check, 
  Trash2, 
  CheckCheck, 
  Calendar, 
  MapPin, 
  User, 
  Sparkles, 
  Eye, 
  Compass, 
  ToggleLeft, 
  ToggleRight,
  ChevronDown,
  ChevronUp,
  X,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export function NotificationDropdown() {
  const { profile } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    emailEnabled, 
    toggleEmailEnabled, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();

  const { registerForEvent } = useRegistrations();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [registeringMap, setRegisteringMap] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [registeringError, setRegisteringError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!profile) return null;

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    markAsRead(id);
  };

  const handleRegister = async (e: React.MouseEvent, eventId: string, notificationId: string) => {
    e.stopPropagation();
    setRegisteringMap(prev => ({ ...prev, [notificationId]: 'loading' }));
    setRegisteringError(null);
    try {
      await registerForEvent(eventId);
      setRegisteringMap(prev => ({ ...prev, [notificationId]: 'success' }));
    } catch (err: any) {
      console.error('Failed to register via notification:', err);
      setRegisteringError(err.message || 'Already registered or limit reached.');
      setRegisteringMap(prev => ({ ...prev, [notificationId]: 'error' }));
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="bell-notification-container">
      {/* Bell Button Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
        aria-label="View notifications"
        id="bell-trigger-button"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce text-indigo-600' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col"
            id="notification-dropdown-panel"
          >
            {/* Header section */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm tracking-tight text-slate-800">Notifications</h3>
                <span className="bg-indigo-100 text-indigo-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition px-1.5 py-1 rounded hover:bg-indigo-50 cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5 inline mr-1" /> Ready
                    </button>
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] font-medium text-slate-500 hover:text-red-600 transition px-1.5 py-1 rounded hover:bg-red-50 cursor-pointer"
                      title="Clear all"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Email dispatch toggles */}
            <div className="px-4 py-2 bg-indigo-50/45 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center font-medium">
                <Mail className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                Email dispatch simulation
              </span>
              <button
                onClick={toggleEmailEnabled}
                className="flex items-center py-0.5 text-indigo-600 font-semibold hover:text-indigo-800 transition cursor-pointer"
              >
                {emailEnabled ? (
                  <>
                    <span className="mr-1">Active</span>
                    <ToggleRight className="w-5 h-5 text-indigo-600" />
                  </>
                ) : (
                  <>
                    <span className="mr-1 text-slate-400">Silent</span>
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  </>
                )}
              </button>
            </div>

            {/* Notification items container list */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100" id="notification-items-scroll">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                    <Bell className="w-6 h-6 text-slate-400" />
                  </div>
                  <h4 className="font-semibold text-xs text-slate-700">All caught up!</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    No new event activity or registrations registered.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isExpanded = expandedId === notif.id;
                  const regStatus = registeringMap[notif.id] || 'idle';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleToggleExpand(notif.id)}
                      className={`p-3.5 transition-colors duration-200 cursor-pointer relative flex flex-col ${
                        notif.is_read ? 'bg-white' : 'bg-indigo-50/20 shadow-inner border-l-2 border-indigo-600'
                      } hover:bg-slate-50/60`}
                    >
                      {/* Flex row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                              {notif.type === 'organizer_booking' ? 'Attendee Registered' : 'New Event'}
                            </span>
                            {!notif.is_read && (
                              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full inline-block" />
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-slate-800 mt-1.5">
                            {notif.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 mr-4">
                            {notif.message}
                          </p>
                        </div>

                        <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">
                          {formatDate(notif.created_at)}
                        </span>
                      </div>

                      {/* Expanded View for Organizer Details */}
                      {isExpanded && notif.type === 'organizer_booking' && notif.metadata && (
                        <div className="mt-3.5 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1.5" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-between">
                            <span className="font-semibold">Attendee Name:</span>
                            <span className="text-slate-800 font-medium">{notif.metadata.attendee_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Event Target:</span>
                            <span className="text-slate-800 font-medium">{notif.metadata.event_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Capacity Booked:</span>
                            <span className="text-slate-800 font-mono">1 seat</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Booking Local Time:</span>
                            <span className="text-slate-800">{new Date(notif.metadata.booking_time || notif.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Expanded View for Attendee Details & Register Directly */}
                      {isExpanded && notif.type === 'attendee_new_event' && notif.metadata && (
                        <div className="mt-3.5 p-3.5 bg-indigo-50/20 rounded-xl border border-indigo-100 text-xs text-slate-600 space-y-3" onClick={e => e.stopPropagation()}>
                          <div className="space-y-1.5">
                            <div className="flex items-center text-slate-800 font-bold mb-1">
                              <Compass className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                              {notif.metadata.event_title}
                            </div>
                            <div className="flex items-center text-slate-500">
                              <Calendar className="w-3 h-3 text-slate-400 mr-1.5" />
                              {new Date(notif.metadata.event_date || '').toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400 mr-1.5" />
                              {notif.metadata.venue}
                            </div>
                            <p className="text-[11px] text-slate-500 italic mt-1 font-sans">
                              {notif.metadata.description}
                            </p>
                          </div>

                          {/* Action CTA Button */}
                          <div className="pt-1 select-none">
                            {regStatus === 'idle' && (
                              <button
                                onClick={(e) => handleRegister(e, notif.event_id, notif.id)}
                                className="w-full flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs tracking-tight shadow-2xs transition duration-200 cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Register Directly</span>
                              </button>
                            )}

                            {regStatus === 'loading' && (
                              <div className="w-full text-center py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1">
                                <span className="animate-spin mr-1">⌛</span> Securing Seat...
                              </div>
                            )}

                            {regStatus === 'success' && (
                              <div className="w-full text-center py-1.5 bg-green-100 text-green-800 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1">
                                <span>🎉 Confirmed Booked!</span>
                              </div>
                            )}

                            {regStatus === 'error' && (
                              <div className="space-y-1.5">
                                <div className="w-full text-center py-1.5 bg-red-100 text-red-800 rounded-lg text-[11px] font-semibold">
                                  ❌ Limit reached or already booked
                                </div>
                                <Link
                                  to={`/events`}
                                  onClick={() => setIsOpen(false)}
                                  className="block w-full text-center text-[10px] text-indigo-600 underline font-semibold"
                                >
                                  View Full event listings
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dropdown toggle hint */}
                      <div className="text-right mt-1.5 select-none opacity-40 group-hover:opacity-100">
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 inline-block" />
                        ) : (
                          <ChevronDown className="w-3 h-3 inline-block" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center text-[10px] text-slate-400 font-mono">
                Powered by EventSpark Real-Time Engine
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
