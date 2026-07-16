import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput, type UserRole } from '@barber/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { supabase } from '../../lib/supabase';

const ROLES: { value: Exclude<UserRole, 'admin'>; label: string; description: string }[] = [
  { value: 'customer', label: 'Customer', description: 'Book appointments with barbers near you' },
  { value: 'barber', label: 'Barber', description: 'Manage your salon and take bookings' },
];

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', phone: '', email: '', password: '', role: 'customer' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });
    if (signUpError || !data.user) {
      setLoading(false);
      setError(signUpError?.message ?? 'Sign up failed');
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: values.fullName,
      phone: values.phone || null,
      role: values.role,
    });
    setLoading(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    // The root NavigationGuard redirects to the customer tabs once the session updates.
  });

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-6 py-16">
      <Text className="mb-8 text-3xl font-bold text-white">Create your account</Text>

      <Controller
        control={control}
        name="fullName"
        render={({ field, fieldState }) => (
          <AppInput
            label="Full name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <AppInput
            label="Phone"
            keyboardType="phone-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <AppInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <AppInput
            label="Password"
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Text className="mb-2 mt-1 text-sm text-muted">I am a...</Text>
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <View className="mb-6 flex-row gap-3">
            {ROLES.map((option) => {
              const selected = field.value === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => field.onChange(option.value)}
                  className={`flex-1 rounded-card border p-3 ${selected ? 'border-gold bg-gold/10' : 'border-border bg-card'}`}
                >
                  <Text className={`text-base font-semibold ${selected ? 'text-gold' : 'text-white'}`}>
                    {option.label}
                  </Text>
                  <Text className="mt-1 text-xs text-muted">{option.description}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <AppButton label="Sign Up" loading={loading} onPress={onSubmit} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-muted">Already have an account? </Text>
        <Link href="/(auth)/login">
          <Text className="font-semibold text-gold">Log in</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
