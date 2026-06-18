export type UserRole = 'admin' | 'organizer' | 'attendee';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  capacity: number;
  price: number;
  image_url: string | null;
  organizer_id: string | null;
  created_at: string;
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  agenda?: string;
  speakers?: string;
  faqs?: string;
  policies?: string;
  views?: number;
  is_template?: boolean;
  // Joined fields for organizers
  organizer?: Profile;
  // Extra client metrics
  registration_count?: number;
}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'cancelled' | 'attended';
  registered_at: string;
  // Joined fields
  event?: Event;
  user_profile?: Profile;
}

export interface Feedback {
  id: string;
  event_id: string;
  user_id: string;
  rating: number; // 1 to 5
  comment: string | null;
  created_at: string;
  // Joined fields
  user_profile?: Profile;
}

export interface AuthState {
  user: any | null; // Supabase user
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isAttendee: boolean;
}
