import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { ServiceItem } from '../../components/ServiceItem';
import { colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../providers/AuthProvider';

interface ServiceFormState {
  id?: string;
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
}

const EMPTY_SERVICE_FORM: ServiceFormState = { name: '', description: '', durationMinutes: '30', price: '' };

export default function BarberProfileScreen() {
  const { session } = useAuth();
  const utils = trpc.useUtils();
  const { data: profileData } = trpc.vendor.getMyProfile.useQuery();

  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceFormState | null>(null);

  useEffect(() => {
    if (profileData?.barber) {
      setBio(profileData.barber.bio ?? '');
      setExperienceYears(String(profileData.barber.experience_years));
      setIsAvailable(profileData.barber.is_available);
    }
  }, [profileData?.barber]);

  const updateProfileMutation = trpc.vendor.updateProfile.useMutation({
    onSuccess: () => {
      utils.vendor.getMyProfile.invalidate();
      setServiceForm(null);
    },
    onError: (err) => Alert.alert('Could not save', err.message),
  });
  const deleteServiceMutation = trpc.vendor.deleteService.useMutation({
    onSuccess: () => utils.vendor.getMyProfile.invalidate(),
    onError: (err) => Alert.alert('Could not delete service', err.message),
  });

  async function uploadImage(kind: 'avatar' | 'cover') {
    if (!session) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to update your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: kind === 'avatar' ? [1, 1] : [16, 9],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    const setUploading = kind === 'avatar' ? setUploadingAvatar : setUploadingCover;
    setUploading(true);
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const extension = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/${kind}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      updateProfileMutation.mutate(
        kind === 'avatar' ? { avatarUrl: publicUrlData.publicUrl } : { coverImageUrl: publicUrlData.publicUrl },
      );
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setUploading(false);
    }
  }

  function handleSaveDetails() {
    const years = Number(experienceYears);
    updateProfileMutation.mutate({
      bio,
      experienceYears: Number.isFinite(years) ? years : undefined,
    });
  }

  function handleToggleAvailability(value: boolean) {
    setIsAvailable(value);
    updateProfileMutation.mutate({ isAvailable: value });
  }

  function handleSaveService() {
    if (!serviceForm) return;
    const durationMinutes = Number(serviceForm.durationMinutes);
    const price = Number(serviceForm.price);
    if (!serviceForm.name || !Number.isFinite(durationMinutes) || !Number.isFinite(price)) {
      Alert.alert('Fill in all service fields');
      return;
    }
    updateProfileMutation.mutate({
      services: [
        {
          id: serviceForm.id,
          name: serviceForm.name,
          description: serviceForm.description || undefined,
          durationMinutes,
          price,
        },
      ],
    });
  }

  const barber = profileData?.barber;
  const services = profileData?.services ?? [];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="pb-8 pt-14">
      <View className="h-32 bg-input">
        {barber?.cover_image_url ? <Image source={{ uri: barber.cover_image_url }} className="h-32 w-full" /> : null}
        <Pressable
          onPress={() => uploadImage('cover')}
          className="absolute bottom-2 right-4 rounded-full bg-black/60 px-3 py-1"
        >
          <Text className="text-xs text-white">{uploadingCover ? 'Uploading…' : 'Edit cover'}</Text>
        </Pressable>
      </View>

      <View className="px-4">
        <Pressable onPress={() => uploadImage('avatar')} className="-mt-10 mb-4 items-center">
          {uploadingAvatar ? (
            <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-bg bg-input">
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : barber?.avatar_url ? (
            <Image source={{ uri: barber.avatar_url }} className="h-20 w-20 rounded-full border-4 border-bg bg-input" />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-bg bg-input">
              <Text className="text-2xl font-semibold text-gold">B</Text>
            </View>
          )}
          <Text className="mt-1 text-xs text-gold">Change photo</Text>
        </Pressable>

        <View className="mb-6 flex-row items-center justify-between rounded-card border border-border bg-card px-4 py-3">
          <Text className="text-white">Available for bookings</Text>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            trackColor={{ true: colors.gold, false: colors.border }}
          />
        </View>

        <AppInput label="Bio" value={bio} onChangeText={setBio} multiline />
        <AppInput
          label="Experience (years)"
          keyboardType="number-pad"
          value={experienceYears}
          onChangeText={setExperienceYears}
        />
        <AppButton label="Save Details" loading={updateProfileMutation.isPending} onPress={handleSaveDetails} />

        <Text className="mb-2 mt-8 text-lg font-semibold text-white">Services</Text>
        {services.map((service) => (
          <View key={service.id} className="mb-2 flex-row items-center">
            <View className="flex-1">
              <ServiceItem name={service.name} duration={service.duration_minutes} price={Number(service.price)} />
            </View>
            <Pressable
              onPress={() =>
                setServiceForm({
                  id: service.id,
                  name: service.name,
                  description: service.description ?? '',
                  durationMinutes: String(service.duration_minutes),
                  price: String(service.price),
                })
              }
              className="ml-2 px-2"
            >
              <Text className="text-gold">Edit</Text>
            </Pressable>
            <Pressable onPress={() => deleteServiceMutation.mutate({ serviceId: service.id })} className="px-2">
              <Text className="text-danger">Delete</Text>
            </Pressable>
          </View>
        ))}

        {serviceForm ? (
          <View className="mt-2 rounded-card border border-border bg-card p-4">
            <AppInput
              label="Service name"
              value={serviceForm.name}
              onChangeText={(v) => setServiceForm((f) => f && { ...f, name: v })}
            />
            <AppInput
              label="Description"
              value={serviceForm.description}
              onChangeText={(v) => setServiceForm((f) => f && { ...f, description: v })}
            />
            <AppInput
              label="Duration (min)"
              keyboardType="number-pad"
              value={serviceForm.durationMinutes}
              onChangeText={(v) => setServiceForm((f) => f && { ...f, durationMinutes: v })}
            />
            <AppInput
              label="Price (₹)"
              keyboardType="decimal-pad"
              value={serviceForm.price}
              onChangeText={(v) => setServiceForm((f) => f && { ...f, price: v })}
            />
            <AppButton label="Save Service" loading={updateProfileMutation.isPending} onPress={handleSaveService} />
            <View className="h-2" />
            <AppButton label="Cancel" variant="ghost" onPress={() => setServiceForm(null)} />
          </View>
        ) : (
          <AppButton label="+ Add Service" variant="secondary" onPress={() => setServiceForm(EMPTY_SERVICE_FORM)} />
        )}

        <View className="h-6" />
        <AppButton label="Log Out" variant="ghost" onPress={() => supabase.auth.signOut()} />
      </View>
    </ScrollView>
  );
}
