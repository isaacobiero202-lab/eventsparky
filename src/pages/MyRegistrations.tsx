import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRegistrations } from '../hooks/useRegistrations';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatDate, formatPrice } from '../utils/formatDate';
import { 
  ClipboardCheck, 
  MapPin, 
  Calendar, 
  Trash2, 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';

export function MyRegistrations() {
  const { profile } = useAuth();
  const { getRegistrationsByUser, cancelRegistration, addFeedback } = useRegistrations();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Feedback popup form state
  const [activeFeedEventId, setActiveFeedEventId] = useState<string | null>(null);
  const [activeFeedEventTitle, setActiveFeedEventTitle] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedSubmitting, setFeedSubmitting] = useState(false);
  const [feedSuccess, setFeedSuccess] = useState<string | null>(null);

  const loadRegs = async () => {
    if (!profile) return;
    try {
      const list = await getRegistrationsByUser(profile.id);
      setRegistrations(list);
    } catch (err) {
      console.error('Load registrations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegs();
  }, [profile]);

  const handleCancelReg = async (regId: string) => {
    if (confirm('Are you absolutely sure you want to cancel your event registration? This will rescind your ticket immediately.')) {
      try {
        setLoading(true);
        await cancelRegistration(regId);
        await loadRegs();
      } catch (err) {
        console.error('Cancel reg failure:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLeaveReview = (eventId: string, eventTitle: string) => {
    setActiveFeedEventId(eventId);
    setActiveFeedEventTitle(eventTitle);
    setRating(5);
    setComment('');
    setFeedSuccess(null);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedEventId) return;
    setFeedSubmitting(true);
    try {
      await addFeedback(activeFeedEventId, rating, comment.trim());
      setFeedSuccess('Thank you! Your feedback has been posted.');
      setTimeout(() => {
        setActiveFeedEventId(null);
        setActiveFeedEventTitle(null);
        setFeedSuccess(null);
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setFeedSubmitting(false);
    }
  };

  if (!profile) {
    return <LoadingSpinner size="large" />;
  }

  // Filter registrations
  const activeRegs = registrations.filter((r) => r.status === 'registered');
  const cancelledRegs = registrations.filter((r) => r.status === 'cancelled');

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <ClipboardCheck className="w-8 h-8 text-indigo-650" />
          My Scheduled Tickets
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Review tickets, cancel listings, print schedules, and leave feedback reviews on attended workshops
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="medium" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Columns: Active and Cancelled lists */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-101 shadow-xs space-y-4">
              <h2 className="text-base font-extrabold text-slate-800 border-b border-slate-50 pb-3 flex items-center justify-between">
                <span>Active Reservations ({activeRegs.length})</span>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Valid
                </span>
              </h2>

              {activeRegs.length === 0 ? (
                <div className="text-center py-10 max-w-sm mx-auto">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">
                    No active registrations booked. Use our events feed to find interesting programs!
                  </p>
                  <Link
                    to="/events"
                    className="mt-3 inline-flex items-center space-x-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition"
                  >
                    <span>Browse Events Marketplace</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRegs.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                    >
                      <div className="flex space-x-3.5 items-start">
                        {reg.event?.image_url ? (
                          <img
                            src={reg.event.image_url}
                            alt={reg.event.title}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100">
                            ES
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/events/${reg.event?.id}`}
                            className="font-bold text-slate-800 hover:text-indigo-600 line-clamp-1 text-sm"
                          >
                            {reg.event?.title || 'Event Details'}
                          </Link>
                          <div className="text-xs text-slate-500 mt-0.5">{formatDate(reg.event?.event_date)}</div>
                          <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{reg.event?.location || 'TBD'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 justify-between w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <span className="text-xs font-extrabold text-slate-900 bg-white border border-slate-100 px-2.5 py-1 rounded-md shadow-2xs">
                          {formatPrice(reg.event?.price || 0)}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLeaveReview(reg.event?.id, reg.event?.title)}
                            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                          >
                            Leave Feedback
                          </button>
                          
                          <button
                            onClick={() => handleCancelReg(reg.id)}
                            className="p-2 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Cancel Registration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cancelled List inside second accordian */}
            {cancelledRegs.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-500">Cancelled/Declined Listings ({cancelledRegs.length})</h3>
                <div className="space-y-2.5 divide-y divide-slate-50">
                  {cancelledRegs.map((reg) => (
                    <div key={reg.id} className="pt-2.5 flex items-center justify-between text-slate-550 text-xs">
                      <div>
                        <span className="font-bold line-clamp-1">{reg.event?.title || 'Past Event'}</span>
                        <span className="text-[10px] text-slate-400">Cancelled on: {formatDate(reg.registered_at)}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                        Void
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic floating feedback card form */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-150 rounded-xl p-5 shadow-xs">
              {activeFeedEventId ? (
                <div>
                  <div className="flex items-center space-x-2.5 text-indigo-700 font-extrabold mb-2.5">
                    <MessageSquare className="w-5 h-5 text-indigo-650" />
                    <h4 className="text-sm tracking-tight">Post Attendee Feedback</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal mb-4">
                    Leave a rating review for <span className="font-bold text-indigo-700">"{activeFeedEventTitle}"</span> to share your thoughts with the organizer.
                  </p>

                  {feedSuccess ? (
                    <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs rounded-lg font-medium flex items-center space-x-1.5 animate-bounce">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{feedSuccess}</span>
                    </div>
                  ) : (
                    <form onSubmit={submitReview} className="space-y-4">
                      {/* Star Rating select radio row */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rating Rating (1 to 5 Stars)</label>
                        <div className="flex items-center space-x-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="focus:outline-hidden cursor-pointer group"
                            >
                              <Star
                                className={`w-6 h-6 transition-all scale-100 active:scale-90 ${
                                  star <= rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300 hover:text-amber-305'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment text */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Review Comment</label>
                        <textarea
                          placeholder="What did you like? What could be improved?"
                          rows={4}
                          required
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 resize-none"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFeedEventId(null);
                            setActiveFeedEventTitle(null);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition"
                        >
                          Cancel
                        </button>
                        
                        <button
                          type="submit"
                          disabled={feedSubmitting || !comment.trim()}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition disabled:bg-slate-300"
                        >
                          <span>Publish Review</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Award className="w-10 h-10 text-indigo-400/80 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-800 text-xs">Aesthetic Reviews</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    Select the "Leave Feedback" button next to any registered event ticket to activate review logs here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
