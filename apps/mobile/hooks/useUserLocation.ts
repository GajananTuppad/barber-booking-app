import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

// Bengaluru — used as a fallback center when location permission is denied.
const FALLBACK_COORDS = { lat: 12.9716, lng: 77.5946 };

export interface UserLocation {
  lat: number;
  lng: number;
}

export function useUserLocation(): { coords: UserLocation | null; permissionDenied: boolean } {
  const [coords, setCoords] = useState<UserLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mounted) {
          setPermissionDenied(true);
          setCoords(FALLBACK_COORDS);
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      if (mounted) {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      }
    })().catch(() => {
      if (mounted) {
        setPermissionDenied(true);
        setCoords(FALLBACK_COORDS);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { coords, permissionDenied };
}
