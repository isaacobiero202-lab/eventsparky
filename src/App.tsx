import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Events } from './pages/Events';
import { EventDetails } from './pages/EventDetails';
import { CreateEvent } from './pages/CreateEvent';
import { EditEvent } from './pages/EditEvent';
import { MyRegistrations } from './pages/MyRegistrations';
import { Profile } from './pages/Profile';
import { AdminAnalytics } from './pages/AdminAnalytics';

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-800 transition-colors duration-300">
            <Navbar />
            
            <main className="flex-grow">
            <Routes>
              {/* Public/Primary Routes */}
              <Route path="/" element={<Navigate to="/events" replace />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Workspace Controller Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-registrations"
                element={
                  <ProtectedRoute allowedRoles={['attendee', 'admin']}>
                    <MyRegistrations />
                  </ProtectedRoute>
                }
              />

              {/* Organizer / Admin specific paths */}
              <Route
                path="/create-event"
                element={
                  <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                    <CreateEvent />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/edit-event/:id"
                element={
                  <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                    <EditEvent />
                  </ProtectedRoute>
                }
              />

              {/* Admin specific paths */}
              <Route
                path="/admin-analytics"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Catch-all Route */}
              <Route path="*" element={<Navigate to="/events" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
