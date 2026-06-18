import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NotificationDropdown } from './NotificationDropdown';
import { 
  Sparkles, 
  Calendar, 
  PlusCircle, 
  LayoutDashboard, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ClipboardList, 
  BarChart2
} from 'lucide-react';

export function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) => `
    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
    ${isActive(path) 
      ? 'bg-indigo-50 text-indigo-700' 
      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}
  `;

  const mobileLinkClass = (path: string) => `
    flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium transition-colors duration-200
    ${isActive(path) 
      ? 'bg-indigo-50 text-indigo-700' 
      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}
  `;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Brand / Icon */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2.5 hover:opacity-90">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold font-display shadow-xs">E</div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-display">
                Event<span className="text-indigo-600 font-medium font-sans">Spark</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/events" className={linkClass('/events')}>
              <Calendar className="w-4 h-4" />
              <span>Browse Events</span>
            </Link>

            {profile && (
              <>
                {/* Organize events links */}
                {profile.role === 'organizer' && (
                  <>
                    <Link to="/create-event" className={linkClass('/create-event')}>
                      <PlusCircle className="w-4 h-4" />
                      <span>Create Event</span>
                    </Link>
                    <Link to="/dashboard" className={linkClass('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                  </>
                )}

                {/* Attendee registrations links */}
                {profile.role === 'attendee' && (
                  <>
                    <Link to="/my-registrations" className={linkClass('/my-registrations')}>
                      <ClipboardList className="w-4 h-4" />
                      <span>My Registrations</span>
                    </Link>
                    <Link to="/dashboard" className={linkClass('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                  </>
                )}

                {/* Admin Analytics link */}
                {profile.role === 'admin' && (
                  <Link to="/admin-analytics" className={linkClass('/admin-analytics')}>
                    <BarChart2 className="w-4 h-4" />
                    <span>Admin Analytics</span>
                  </Link>
                )}

                {/* Real-time Notifications Bell Dropdown */}
                <div className="flex items-center px-1">
                  <NotificationDropdown />
                </div>

                {/* Common Profile link */}
                <Link to="/profile" className={linkClass('/profile')}>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'My Profile'}
                      className="w-5 h-5 rounded-full object-cover ring-2 ring-indigo-500"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span>{profile.full_name || 'Profile'}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}

            {!profile && (
              <div className="flex items-center space-x-3 ml-4">
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-indigo-600 text-sm font-semibold transition px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-xs"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex items-center md:hidden space-x-2">
            {profile && (
              <div className="mr-1">
                <NotificationDropdown />
              </div>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white transition-colors duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/events"
              onClick={() => setIsOpen(false)}
              className={mobileLinkClass('/events')}
            >
              <Calendar className="w-5 h-5" />
              <span>Browse Events</span>
            </Link>

            {profile ? (
              <>
                {profile.role === 'organizer' && (
                  <>
                    <Link
                      to="/create-event"
                      onClick={() => setIsOpen(false)}
                      className={mobileLinkClass('/create-event')}
                    >
                      <PlusCircle className="w-5 h-5" />
                      <span>Create Event</span>
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className={mobileLinkClass('/dashboard')}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                  </>
                )}

                {profile.role === 'attendee' && (
                  <>
                    <Link
                      to="/my-registrations"
                      onClick={() => setIsOpen(false)}
                      className={mobileLinkClass('/my-registrations')}
                    >
                      <ClipboardList className="w-5 h-5" />
                      <span>My Registrations</span>
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className={mobileLinkClass('/dashboard')}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                  </>
                )}

                {profile.role === 'admin' && (
                  <Link
                    to="/admin-analytics"
                    onClick={() => setIsOpen(false)}
                    className={mobileLinkClass('/admin-analytics')}
                  >
                    <BarChart2 className="w-5 h-5" />
                    <span>Admin Analytics</span>
                  </Link>
                )}

                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className={mobileLinkClass('/profile')}
                >
                  <User className="w-5 h-5" />
                  <span>Profile Settings</span>
                </Link>

                 <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-3 text-red-600 hover:bg-red-50 rounded-md text-base font-semibold cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="pt-4 pb-2 border-t border-slate-100 flex flex-col space-y-2 px-3">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="text-center w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="text-center w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
