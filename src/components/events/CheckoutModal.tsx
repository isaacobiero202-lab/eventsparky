import React, { useState, useMemo } from 'react';
import { 
  X, 
  Ticket, 
  Plus, 
  Minus, 
  ChevronRight, 
  ChevronLeft, 
  CreditCard, 
  Sparkles, 
  CheckCircle, 
  Download, 
  MapPin, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Info, 
  BadgePercent,
  Lock,
  Loader2,
  PhoneCall
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTickets, Ticket as TicketType } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { formatDate, formatPrice } from '../../utils/formatDate';

interface CheckoutModalProps {
  event: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckoutModal({ event, onClose, onSuccess }: CheckoutModalProps) {
  const { createTicket } = useTickets();
  const { profile } = useAuth();
  
  // Checkout Steps: 1 = Ticket Choice, 2 = Attendee Info, 3 = Payment & Code, 4 = Confirmation
  const [step, setStep] = useState(1);
  
  // Choice state
  const [selectedCategory, setSelectedCategory] = useState<'General' | 'VIP' | 'Student'>('General');
  const [qty, setQty] = useState(1);
  
  // Promo state
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent?: number; amount?: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Attendees list state
  const [attendees, setAttendees] = useState<Array<{ name: string; email: string; phone: string }>>([
    { name: profile?.full_name || '', email: profile?.email || '', phone: '' }
  ]);

  // Payment forms state
  const [cardName, setCardName] = useState(profile?.full_name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  
  const [payLoading, setPayLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [paymentFinished, setPaymentFinished] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<TicketType[]>([]);

  // Ticket Categories pricing bounds
  const unitPrices = useMemo(() => {
    const base = event.price || 0;
    return {
      General: base,
      VIP: Math.round(base * 1.8 + 25),
      Student: Math.round(base * 0.7)
    };
  }, [event.price]);

  // Calculations
  const subtotal = useMemo(() => {
    return unitPrices[selectedCategory] * qty;
  }, [selectedCategory, qty, unitPrices]);

  const discountValue = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.percent) {
      return (subtotal * appliedDiscount.percent) / 100;
    }
    if (appliedDiscount.amount) {
      return Math.min(appliedDiscount.amount * qty, subtotal);
    }
    return 0;
  }, [appliedDiscount, subtotal, qty]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountValue);
  }, [subtotal, discountValue]);

  // Quantity updates listener to scale default attendee slots
  const handleQtyChange = (newQty: number) => {
    if (newQty < 1 || newQty > 5) return;
    setQty(newQty);
    
    setAttendees(prev => {
      const arr = [...prev];
      if (newQty > arr.length) {
        for (let i = arr.length; i < newQty; i++) {
          arr.push({ name: '', email: '', phone: '' });
        }
      } else if (newQty < arr.length) {
        arr.splice(newQty);
      }
      return arr;
    });
  };

  // Promo checking
  const handleApplyPromo = () => {
    setPromoError(null);
    setPromoSuccess(null);
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'SPARKY20') {
      setAppliedDiscount({ code: 'SPARKY20', percent: 20 });
      setPromoSuccess('Promo Code "SPARKY20" applied! 20% discount successfully granted.');
    } else if (code === 'EARLYBIRD') {
      const discountAmt = Math.min(15, event.price || 15);
      setAppliedDiscount({ code: 'EARLYBIRD', amount: discountAmt });
      setPromoSuccess(`Promo Code "EARLYBIRD" applied! $${discountAmt} discount seat quantity package.`);
    } else {
      setPromoError('Invalid promo code. Verify correct spelling and try again.');
    }
  };

  // Validation step helpers
  const handleNextToAttendees = () => {
    setStep(2);
  };

  const handleNextToPayment = () => {
    // Validate attendees
    for (let i = 0; i < attendees.length; i++) {
      if (!attendees[i].name.trim() || !attendees[i].email.trim()) {
        alert(`Please complete name and email fields for Attendee #${i + 1}`);
        return;
      }
    }
    setStep(3);
  };

  // Final simulation action
  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      alert('Kindly configure all required billing card fields.');
      return;
    }

    setPayLoading(true);
    setLoadingStatus('Verifying payment authorization with gateway...');
    
    try {
      // Step wise loader simulation for aesthetic high fidelity immersion
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoadingStatus('Validating ticket reservation seats...');
      await new Promise(resolve => setTimeout(resolve, 700));
      setLoadingStatus('Generating custom attendee secure QR badges...');

      // Save transactions, seats, and actual tickets inside tables!
      const ticketsCreatedInDb: TicketType[] = [];
      const localCancelledList = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eventspark_cancelled_events') || '{}') : {};

      for (let i = 0; i < qty; i++) {
        const attendee = attendees[i];
        const ticketCode = `SPK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100000 + Math.random() * 900000)}`;
        
        // Simulating highly descriptive robust QR Code content
        const qrJsonData = {
          ticketCode,
          eventTitle: event.title,
          eventDate: event.event_date,
          venue: event.location,
          attendee: attendee.name,
          category: selectedCategory,
          pricePaid: total / qty,
        };
        const qrContent = encodeURIComponent(JSON.stringify(qrJsonData));
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrContent}`;

        const created = await createTicket({
          event_id: event.id,
          attendee_name: attendee.name,
          attendee_email: attendee.email,
          attendee_phone: attendee.phone,
          ticket_category: selectedCategory,
          price_paid: total / qty,
          ticket_code: ticketCode,
          qr_code: qrUrl
        });

        ticketsCreatedInDb.push(created);

        // Record default seats / registrations mapping as well to lock user seat count increments!
        try {
          await supabase.from('registrations').insert({
            event_id: event.id,
            user_id: profile?.id,
            status: 'registered',
            registered_at: new Date().toISOString()
          });
        } catch (regSaveErr) {
          console.warn('Registration table sync fallback managed info.');
        }
      }

      setGeneratedTickets(ticketsCreatedInDb);
      setLoadingStatus('Broadcasting real-time live panel synchronization...');
      
      // Dispatch real-time Notifications as requested!
      try {
        // Organizer gets notification
        const organizerNotif = {
          id: 'notif-' + Math.random().toString(36).slice(2, 11),
          user_id: event.organizer_id,
          type: 'organizer_booking',
          title: 'Direct Pass Purchased! 🎟️',
          message: `${attendees[0].name} has successfully purchased ${qty} ${selectedCategory} tickets for "${event.title}".`,
          event_id: event.id,
          is_read: false,
          created_at: new Date().toISOString(),
          metadata: {
            qty,
            category: selectedCategory,
            total_earned: total,
            attendees_list: attendees.map(a => a.name).join(', '),
          }
        };
        await supabase.from('notifications').insert(organizerNotif);
        await fetch('/api/notifications/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(organizerNotif)
        }).catch(() => {});

        // Attendee gets confirmation
        const attendeeNotif = {
          id: 'notif-' + Math.random().toString(36).slice(2, 11),
          user_id: profile?.id,
          type: 'ticket_issued',
          title: 'Ticket Issued successfully! 🎟️✨',
          message: `Your digital QR tickets are ready for "${event.title}". Total: ${formatPrice(total)}`,
          event_id: event.id,
          is_read: false,
          created_at: new Date().toISOString(),
          metadata: {
            qty,
            category: selectedCategory,
            total_paid: total,
            qr_link: ticketsCreatedInDb[0]?.qr_code
          }
        };
        await supabase.from('notifications').insert(attendeeNotif);
        await fetch('/api/notifications/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attendeeNotif)
        }).catch(() => {});

      } catch (notifErr) {
        console.warn('Silent issue writing transaction feeds.');
      }

      // Final short loading
      await new Promise(resolve => setTimeout(resolve, 500));
      setPaymentFinished(true);
      setStep(4);
    } catch (err: any) {
      alert(`Simulation failed to submit: ${err.message || err}`);
    } finally {
      setPayLoading(false);
    }
  };

  const handleClose = () => {
    if (paymentFinished) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header Layout */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 text-left">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight">Secure Pass Registry Checklist</h3>
              <p className="text-[10px] text-slate-300 font-medium truncate max-w-[280px] md:max-w-md">
                {event.title}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Bar indicator */}
        {step < 4 && (
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-400 shrink-0">
            <div className="flex items-center space-x-4">
              <span className={step === 1 ? "text-indigo-600 underline font-black" : step > 1 ? "text-slate-700" : ""}>1. Ticket Selection</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className={step === 2 ? "text-indigo-600 underline font-black" : step > 2 ? "text-slate-700" : ""}>2. Attendees Form</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className={step === 3 ? "text-indigo-600 underline font-black" : ""}>3. Payment Authorization</span>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm">Step {step}/3</span>
          </div>
        )}

        {/* Scrollable Container Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-700">
          
          {step === 1 && (
            <div className="space-y-6 text-left">
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 text-sm">Choose Your Badge Category</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* General */}
                  <div 
                    onClick={() => setSelectedCategory('General')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedCategory === 'General' ? 'border-indigo-650 bg-indigo-50/15' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-black text-indigo-700 tracking-wider">Pass Standard</span>
                      <h5 className="font-black text-sm text-slate-800 mt-1">General Admission</h5>
                      <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Full access admission to all core speeches, seating gallery, and networking areas.</p>
                    </div>
                    <span className="text-sm font-black text-slate-900 mt-4 block">{formatPrice(unitPrices.General)}</span>
                  </div>

                  {/* VIP */}
                  <div 
                    onClick={() => setSelectedCategory('VIP')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedCategory === 'VIP' ? 'border-indigo-650 bg-indigo-50/15' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-black text-amber-600 tracking-wider">Pass Premium ✨</span>
                      <h5 className="font-black text-sm text-slate-800 mt-1">VIP Premium Pass</h5>
                      <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Front row seating, standard handbook catalogs, catered cocktail bar mixer, and catalog kit.</p>
                    </div>
                    <span className="text-sm font-black text-slate-900 mt-4 block">{formatPrice(unitPrices.VIP)}</span>
                  </div>

                  {/* Student */}
                  <div 
                    onClick={() => setSelectedCategory('Student')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedCategory === 'Student' ? 'border-indigo-650 bg-indigo-50/15' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-black text-emerald-600 tracking-wider">Academic Discount 🎓</span>
                      <h5 className="font-black text-sm text-slate-800 mt-1">Student Discount</h5>
                      <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Discount admission for verify students. Requires university email proof at verification gate.</p>
                    </div>
                    <span className="text-sm font-black text-slate-900 mt-4 block">{formatPrice(unitPrices.Student)}</span>
                  </div>
                </div>
              </div>

              {/* Quantity selector */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Seat Reservation Slots</h4>
                  <p className="text-[11px] text-slate-405 font-medium">Select up to 5 tickets for colleagues or companions.</p>
                </div>

                <div className="flex items-center space-x-3.5 bg-white border border-slate-200 p-1.5 rounded-xl shrink-0">
                  <button 
                    onClick={() => handleQtyChange(qty - 1)}
                    disabled={qty <= 1}
                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-sm text-slate-800 w-5 text-center">{qty}</span>
                  <button 
                    onClick={() => handleQtyChange(qty + 1)}
                    disabled={qty >= 5}
                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Total Summary Mini Container */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2 text-slate-500">
                  <Info className="w-4 h-4 text-indigo-650" />
                  <span className="font-semibold">{qty} x {selectedCategory} Pass at {formatPrice(unitPrices[selectedCategory])}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-right">Subtotal:</span>
                  <span className="font-black text-slate-900 text-lg block">{formatPrice(subtotal)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-left">
              <h4 className="font-black text-slate-900 text-sm">Configure Badge Attendees Info</h4>
              <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed">
                Provide descriptive details for each personalized attendee badge for registration records.
              </p>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                {attendees.map((attendee, idx) => (
                  <div key={idx} className="p-4 border border-slate-150 rounded-2xl space-y-3 bg-slate-50/20">
                    <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest bg-slate-900 text-white rounded-md">
                      ATTENDEE BADGE #{idx + 1}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800"
                            value={attendee.name}
                            onChange={(e) => {
                              const arr = [...attendees];
                              arr[idx].name = e.target.value;
                              setAttendees(arr);
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            placeholder="colleague@example.com"
                            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800"
                            value={attendee.email}
                            onChange={(e) => {
                              const arr = [...attendees];
                              arr[idx].email = e.target.value;
                              setAttendees(arr);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Phone Companion (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="+1 (555) 019-2834"
                          className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800"
                          value={attendee.phone}
                          onChange={(e) => {
                            const arr = [...attendees];
                            arr[idx].phone = e.target.value;
                            setAttendees(arr);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleCompletePayment} className="space-y-5 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Side: Billing form */}
                <div className="space-y-3.5">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Gateway Card Billing</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={profile?.full_name || "Jane Doe"}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-805 bg-slate-50/50"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-805 bg-slate-50/50"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Expiration
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-805 bg-slate-50/50 text-center"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        CVC/CVV Code
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="•••"
                        maxLength={4}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-805 bg-slate-50/50 text-center"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Billing Street Address
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="120 Market St, San Francisco, CA"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-805 bg-slate-50/50"
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Side: Promo Code & Order Summary receipt */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3.5">
                    <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5"><BadgePercent className="w-4.5 h-4.5 text-indigo-600" /> Promotional Campaigns</h4>
                    
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. SPARKY20"
                        className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-805 font-mono uppercase"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && <p className="text-[10px] text-rose-600 font-bold">{promoError}</p>}
                    {promoSuccess && <p className="text-[10px] text-emerald-700 font-bold">{promoSuccess}</p>}

                    <div className="text-[10px] text-slate-400 bg-white/50 p-2 border border-slate-100/50 rounded-lg space-y-0.5">
                      <span className="block font-black uppercase text-indigo-700">Available mock codes:</span>
                      <span className="block font-semibold">🎫 <strong className="font-extrabold text-slate-700 font-mono">SPARKY20</strong> : 20% discount standard pass.</span>
                      <span className="block font-semibold">🎫 <strong className="font-extrabold text-slate-700 font-mono">EARLYBIRD</strong> : $15 markdown off ticket.</span>
                    </div>
                  </div>

                  {/* Summary receipt */}
                  <div className="p-4 border border-indigo-100 bg-indigo-50/5 rounded-2xl space-y-2 text-xs">
                    <h4 className="font-black text-indigo-900 border-b border-indigo-100 pb-1 text-left">Order Ledger</h4>
                    
                    <div className="flex justify-between font-semibold">
                      <span>Category / Slot:</span>
                      <span className="text-slate-800 font-bold">{qty} x {selectedCategory}</span>
                    </div>

                    <div className="flex justify-between font-semibold">
                      <span>Subtotal:</span>
                      <span className="text-slate-800 font-bold">{formatPrice(subtotal)}</span>
                    </div>

                    {appliedDiscount && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Campaign Discount:</span>
                        <span>-{formatPrice(discountValue)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-800 font-black border-t border-slate-200 mt-2 pt-2 text-sm">
                      <span>Grand Total:</span>
                      <span className="text-indigo-700">{formatPrice(total)}</span>
                    </div>

                    <div className="pt-2 flex items-center justify-center space-x-1 text-[10px] text-slate-400 font-bold uppercase leading-none mt-2">
                      <Lock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>SECURE 256-BIT SSL GATEWAY</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Progress Modal overlay loader */}
              {payLoading && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 p-8 z-30">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <div className="text-center space-y-1">
                    <h4 className="font-black text-slate-800 text-sm">Authorizing Billing Order</h4>
                    <p className="text-xs text-indigo-650 font-mono animate-pulse">{loadingStatus}</p>
                  </div>
                </div>
              )}
            </form>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center p-4 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-2 max-w-md mx-auto">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Transaction Authorized successfully! 🎟️</h4>
                  <p className="text-[11px] text-emerald-600 font-bold">Your Companion seat badges are validated below.</p>
                </div>
              </div>

              {/* Digital printable tickets visualization */}
              <div className="space-y-5 text-left">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Your Issued Admission Passes</h4>
                
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {generatedTickets.map((tkt, idx) => (
                    <div 
                      key={tkt.id}
                      className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col md:flex-row relative group"
                    >
                      {/* Left Ticket Body */}
                      <div className="p-5 flex-1 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-md">
                            {tkt.ticket_category} ADMISSION PASS
                          </span>
                          <span className="font-mono text-[9px] font-black text-slate-450 uppercase">{tkt.ticket_code}</span>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-black text-slate-805 text-sm leading-tight line-clamp-1">{event.title}</h5>
                          
                          <div className="grid grid-cols-2 gap-3 text-[10.5px] text-slate-500 font-bold">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">{formatDate(event.event_date)}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">{event.location || 'Online'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center space-x-2.5 text-[11px] text-slate-700">
                          <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center font-black text-[9px]">U</div>
                          <div>
                            <span className="block font-bold leading-none">{tkt.attendee_name}</span>
                            <span className="text-[9.5px] text-slate-400 mt-0.5 block leading-none">{tkt.attendee_email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Ticket Coupon cut boundary marker and QR block */}
                      <div className="border-t md:border-t-0 md:border-l border-dashed border-slate-300 md:w-44 p-4 flex flex-col items-center justify-center bg-slate-50 shrink-0 space-y-2 relative">
                        {/* Circular notched paper effect details */}
                        <div className="hidden md:absolute -top-2 -left-2 w-4 h-4 bg-white border border-slate-200 rounded-full" />
                        <div className="hidden md:absolute -bottom-2 -left-2 w-4 h-4 bg-white border border-slate-200 rounded-full" />

                        <img 
                          src={tkt.qr_code} 
                          alt="Admission QR code scanner"
                          className="w-24 h-24 border border-slate-200 p-1.5 bg-white rounded-lg shadow-3xs"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-wide">ID: {tkt.id.split('-')[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Progression CTA Actions */}
        {step < 4 && (
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-850 bg-white border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-400">Pass Select</span>
            )}

            {step === 1 && (
              <button
                type="button"
                onClick={handleNextToAttendees}
                className="inline-flex items-center space-x-1 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition shadow-2xs cursor-pointer"
              >
                <span>Setup Attendees Info</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleNextToPayment}
                className="inline-flex items-center space-x-1 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition shadow-2xs cursor-pointer"
              >
                <span>Authorize & Pay</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="submit"
                onClick={handleCompletePayment}
                className="inline-flex items-center space-x-1.5 text-xs font-black text-white bg-indigo-650 hover:bg-indigo-700 px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Purchase Passes {formatPrice(total)}</span>
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-center shrink-0">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Finish & Return to Event
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
