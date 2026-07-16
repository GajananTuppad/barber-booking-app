import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function ProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await refreshProfile();
    Alert.alert('Saved', 'Your profile has been updated.');
  }

  async function handlePickAvatar() {
    if (!session) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to update your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    setUploadingAvatar(true);
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const extension = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', session.user.id);
      if (profileError) throw profileError;

      await refreshProfile();
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pb-8 pt-16">
      <Text className="mb-6 text-2xl font-bold text-white">Profile</Text>

      <Pressable onPress={handlePickAvatar} className="mb-6 items-center">
        {uploadingAvatar ? (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-input">
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="h-24 w-24 rounded-full bg-input" />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-input">
            <Text className="text-3xl font-semibold text-gold">
              {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="mt-2 text-sm text-gold">Change photo</Text>
      </Pressable>

      <AppInput label="Full name" value={fullName} onChangeText={setFullName} />
      <AppInput label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

      <View className="mb-6 flex-row items-center justify-between rounded-card border border-border bg-card px-4 py-3">
        <Text className="text-white">Notification preferences</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ true: colors.gold, false: colors.border }}
        />
      </View>

      <AppButton label="Save Changes" loading={saving} onPress={handleSave} />

      <View className="h-3" />
      <AppButton label="Log Out" variant="ghost" onPress={handleLogout} />
    </ScrollView>
  );
}
