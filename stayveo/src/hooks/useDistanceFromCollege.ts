import { useEffect, useMemo, useState } from 'react';
import { getCollegeById } from '../api/colleges';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import { calculateDistanceKm, formatDistance } from '../utils/calculateDistance';

type Coordinates = {
  id?: string | null;
  name?: string | null;
  latitude: number | null;
  longitude: number | null;
};

type DistanceItem = {
  latitude?: unknown;
  longitude?: unknown;
  [key: string]: unknown;
};

const collegeCache = new Map<string, Coordinates | null>();
const collegeRequests = new Map<string, Promise<Coordinates | null>>();

function getStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(key);
  if (!value || value === 'undefined' || value === 'null') return null;
  return value;
}

function getStoredCollege(): Coordinates | null {
  const latitude = Number(getStorageValue('selectedCollegeLatitude'));
  const longitude = Number(getStorageValue('selectedCollegeLongitude'));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: getStorageValue('userCollegeId') || getStorageValue('selectedCollegeId'),
    name:
      getStorageValue('userCollegeName') ||
      getStorageValue('selectedCollegeName') ||
      getStorageValue('userCollege') ||
      getStorageValue('selectedCollege'),
    latitude,
    longitude,
  };
}

function persistCollege(college: Coordinates | null) {
  if (typeof window === 'undefined' || !college) return;
  if (college.id) {
    window.localStorage.setItem('userCollegeId', String(college.id));
    window.localStorage.setItem('selectedCollegeId', String(college.id));
  }
  if (college.name) {
    window.localStorage.setItem('userCollegeName', String(college.name));
    window.localStorage.setItem('selectedCollegeName', String(college.name));
  }
  if (Number.isFinite(college.latitude) && Number.isFinite(college.longitude)) {
    window.localStorage.setItem('selectedCollegeLatitude', String(college.latitude));
    window.localStorage.setItem('selectedCollegeLongitude', String(college.longitude));
  }
}

function normalizeCollege(college: any): Coordinates | null {
  if (!college) return null;
  const latitude = Number(college.latitude);
  const longitude = Number(college.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: college.id ?? college.college_id ?? null,
    name: college.name ?? college.college_name ?? null,
    latitude,
    longitude,
  };
}

async function fetchCollegeOnce(collegeId: string, signal?: AbortSignal): Promise<Coordinates | null> {
  if (collegeCache.has(collegeId)) return collegeCache.get(collegeId) || null;
  if (collegeRequests.has(collegeId)) return collegeRequests.get(collegeId) || null;

  const request = getCollegeById(collegeId, { signal })
    .then(normalizeCollege)
    .then((college) => {
      collegeCache.set(collegeId, college);
      collegeRequests.delete(collegeId);
      return college;
    })
    .catch((error) => {
      collegeRequests.delete(collegeId);
      throw error;
    });

  collegeRequests.set(collegeId, request);
  return request;
}

async function fetchStudentCollegeId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('college_id, college_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('useDistanceFromCollege: user college lookup failed:', error.message);
    return null;
  }

  if (data?.college_name && typeof window !== 'undefined') {
    window.localStorage.setItem('userCollegeName', data.college_name);
  }

  return data?.college_id || null;
}

function distanceForItem(item: DistanceItem, college: Coordinates | null) {
  if (!college) {
    return {
      distance: null,
      distanceKm: null,
      distanceLabel: 'Distance unavailable',
    };
  }

  const distanceKm = calculateDistanceKm(
    college.latitude,
    college.longitude,
    item?.latitude,
    item?.longitude
  );

  return {
    distance: distanceKm,
    distanceKm,
    distanceLabel: formatDistance(distanceKm),
  };
}

export function useDistanceFromCollege<T extends DistanceItem>(items: T[] = []) {
  const { authState } = useAuth();
  const [college, setCollege] = useState<Coordinates | null>(() => getStoredCollege());
  const [loadingCollege, setLoadingCollege] = useState(() => !getStoredCollege());
  const [collegeError, setCollegeError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function resolveCollege() {
      const storedCollege = getStoredCollege();
      if (storedCollege) {
        setCollege(storedCollege);
        setLoadingCollege(false);
        return;
      }

      setLoadingCollege(true);
      setCollegeError(null);

      try {
        const storedCollegeId = getStorageValue('userCollegeId') || getStorageValue('selectedCollegeId');
        const userCollegeId = await fetchStudentCollegeId(authState?.userId);
        const collegeId = storedCollegeId || userCollegeId;

        if (!collegeId) {
          setCollege(null);
          return;
        }

        const fetchedCollege = await fetchCollegeOnce(collegeId, controller.signal);
        if (controller.signal.aborted) return;

        setCollege(fetchedCollege);
        persistCollege(fetchedCollege);
      } catch (error: any) {
        if (error?.name === 'AbortError' || controller.signal.aborted) return;
        console.warn('useDistanceFromCollege: college coordinate lookup failed:', error);
        setCollegeError(error?.message || 'Could not load college coordinates');
        setCollege(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCollege(false);
        }
      }
    }

    resolveCollege();
    return () => controller.abort();
  }, [authState?.userId]);

  const itemsWithDistance = useMemo(() => {
    const source = Array.isArray(items) ? items : [];

    return source
      .map((item) => ({
        ...item,
        ...distanceForItem(item, college),
      }))
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [items, college?.latitude, college?.longitude]);

  return {
    college,
    loadingCollege,
    collegeError,
    itemsWithDistance,
  };
}
