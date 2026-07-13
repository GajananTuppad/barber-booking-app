import type { UserRole } from '@barber/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { supabase } from '../../lib/supabase';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'customer', label: 'Customer', description: 'Book appointments with barbers near you' },
  { value: 'barber', label: 'Barber', description: 'Manage your salon and take bookings' },
];

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    setError(null);
    if (!fullName || !email || !password) {
      setError('Full name, email and password are required');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setLoading(false);
      setError(signUpError?.message ?? 'Sign up failed');
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      phone: phone || null,
      role,
    });
    setLoading(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    // The root NavigationGuard redirects to the customer tabs once the session updates.
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-6 py-16">
      <Text className="mb-8 text-3xl font-bold text-white">Create your account</Text>

      <AppInput label="Full name" value={fullName} onChangeText={setFullName} />
      <AppInput label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <AppInput
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AppInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <Text className="mb-2 mt-1 text-sm text-muted">I am a...</Text>
      <View className="mb-6 flex-row gap-3">
        {ROLES.map((option) => {
          const selected = role === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setRole(option.value)}
              className={`flex-1 rounded-card border p-3 ${selected ? 'border-gold bg-gold/10' : 'border-border bg-card'}`}
            >
              <Text className={`text-base font-semibold ${selected ? 'text-gold' : 'text-white'}`}>{option.label}</Text>
              <Text className="mt-1 text-xs text-muted">{option.description}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <AppButton label="Sign Up" loading={loading} onPress={handleSignup} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-muted">Already have an account? </Text>
        <Link href="/(auth)/login">
          <Text className="font-semibold text-gold">Log in</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
