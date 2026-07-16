import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMobileClient, type TypedSupabaseClient } from '@barber/shared';

export const supabase: TypedSupabaseClient = createMobileClient(AsyncStorage);
