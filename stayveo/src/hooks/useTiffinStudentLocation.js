import { useEffect, useState } from 'react';
import { getCurrentUserProfile } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useTiffinStudentLocation() {
  const { authState } = useAuth();
  const [savedLocation, setSavedLocation] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!authState.userId || authState.role !== 'STUDENT') {
      return () => { cancelled = true; };
    }

    getCurrentUserProfile(authState.userId)
      .then((response) => {
        if (cancelled) return;
        const profile = response?.data?.studentProfile;
        setSavedLocation({
          userId: authState.userId,
          location: profile ? { latitude: profile.latitude, longitude: profile.longitude } : null,
        });
      })
      .catch(() => {
        if (!cancelled) setSavedLocation({ userId: authState.userId, location: null });
      });

    return () => { cancelled = true; };
  }, [authState.role, authState.userId]);

  if (authState.role !== 'STUDENT' || savedLocation?.userId !== authState.userId) return null;
  return savedLocation.location;
}
