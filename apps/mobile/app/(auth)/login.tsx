import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { signInWithGoogle } from '../../lib/oauth';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError(signInError.message);
    // The root NavigationGuard redirects to the customer tabs once the session updates.
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above, then tap "Forgot password" again.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    if (resetError) {
      setError(resetError.message);
    } else {
      Alert.alert('Check your email', 'We sent you a password reset link.');
    }
  }

  return (
    <View className="flex-1 justify-center bg-bg px-6">
      <Text className="mb-8 text-3xl font-bold text-white">Welcome back</Text>

      <AppInput
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AppInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Pressable onPress={handleForgotPassword} className="mb-6 self-end">
        <Text className="text-sm text-gold">Forgot password?</Text>
      </Pressable>

      <AppButton label="Log In" loading={loading} onPress={handleLogin} />
      <View className="h-3" />
      <AppButton label="Continue with Google" variant="secondary" loading={googleLoading} onPress={handleGoogleLogin} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-muted">Don&apos;t have an account? </Text>
        <Link href="/(auth)/signup">
          <Text className="font-semibold text-gold">Sign up</Text>
        </Link>
      </View>
    </View>
  );
}
