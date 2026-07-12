export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'customer' | 'barber' | 'admin';
export type SlotStatus = 'available' | 'locked' | 'booked' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
};
export type ProfileInsert = Partial<Omit<ProfileRow, 'id'>> & Pick<ProfileRow, 'id'>;
export type ProfileUpdate = Partial<ProfileRow>;

export type SalonRow = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  cover_image_url: string | null;
  rating: number;
  is_active: boolean;
  created_at: string;
};
export type SalonInsert = Partial<Omit<SalonRow, 'id' | 'created_at'>> &
  Pick<SalonRow, 'owner_id' | 'name'>;
export type SalonUpdate = Partial<SalonRow>;

export type BarberRow = {
  id: string;
  profile_id: string;
  salon_id: string;
  bio: string | null;
  experience_years: number;
  avatar_url: string | null;
  is_available: boolean;
  created_at: string;
};
export type BarberInsert = Partial<Omit<BarberRow, 'id' | 'created_at'>> &
  Pick<BarberRow, 'profile_id' | 'salon_id'>;
export type BarberUpdate = Partial<BarberRow>;

export type ServiceRow = {
  id: string;
  barber_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  created_at: string;
};
export type ServiceInsert = Partial<Omit<ServiceRow, 'id' | 'created_at'>> &
  Pick<ServiceRow, 'barber_id' | 'name' | 'price'>;
export type ServiceUpdate = Partial<ServiceRow>;

export type SlotRow = {
  id: string;
  barber_id: string;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  created_at: string;
};
export type SlotInsert = Partial<Omit<SlotRow, 'id' | 'created_at'>> &
  Pick<SlotRow, 'barber_id' | 'start_time' | 'end_time'>;
export type SlotUpdate = Partial<SlotRow>;

export type BookingRow = {
  id: string;
  slot_id: string;
  service_id: string;
  customer_id: string;
  barber_id: string;
  status: BookingStatus;
  payment_id: string | null;
  payment_status: string;
  total_amount: number;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
};
export type BookingInsert = Partial<Omit<BookingRow, 'id' | 'created_at'>> &
  Pick<BookingRow, 'slot_id' | 'service_id' | 'customer_id' | 'barber_id' | 'total_amount'>;
export type BookingUpdate = Partial<BookingRow>;

export type ReviewRow = {
  id: string;
  booking_id: string;
  customer_id: string;
  barber_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};
export type ReviewInsert = Partial<Omit<ReviewRow, 'id' | 'created_at'>> &
  Pick<ReviewRow, 'booking_id' | 'customer_id' | 'barber_id' | 'rating'>;
export type ReviewUpdate = Partial<ReviewRow>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      salons: {
        Row: SalonRow;
        Insert: SalonInsert;
        Update: SalonUpdate;
        Relationships: [
          {
            foreignKeyName: 'salons_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      barbers: {
        Row: BarberRow;
        Insert: BarberInsert;
        Update: BarberUpdate;
        Relationships: [
          {
            foreignKeyName: 'barbers_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'barbers_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      services: {
        Row: ServiceRow;
        Insert: ServiceInsert;
        Update: ServiceUpdate;
        Relationships: [
          {
            foreignKeyName: 'services_barber_id_fkey';
            columns: ['barber_id'];
            isOneToOne: false;
            referencedRelation: 'barbers';
            referencedColumns: ['id'];
          },
        ];
      };
      slots: {
        Row: SlotRow;
        Insert: SlotInsert;
        Update: SlotUpdate;
        Relationships: [
          {
            foreignKeyName: 'slots_barber_id_fkey';
            columns: ['barber_id'];
            isOneToOne: false;
            referencedRelation: 'barbers';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: BookingRow;
        Insert: BookingInsert;
        Update: BookingUpdate;
        Relationships: [
          {
            foreignKeyName: 'bookings_slot_id_fkey';
            columns: ['slot_id'];
            isOneToOne: true;
            referencedRelation: 'slots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_barber_id_fkey';
            columns: ['barber_id'];
            isOneToOne: false;
            referencedRelation: 'barbers';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: ReviewRow;
        Insert: ReviewInsert;
        Update: ReviewUpdate;
        Relationships: [
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_barber_id_fkey';
            columns: ['barber_id'];
            isOneToOne: false;
            referencedRelation: 'barbers';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      slot_status: SlotStatus;
      booking_status: BookingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
