import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { API_BASES } from '../config/api.js';

// ─── StayVeo API Client ─────────────────────────────────────────────────
// Central HTTP client for all backend calls.
// All responses follow { success, data, message } format.
// ────────────────────────────────────────────────────────────────────────

class ApiRequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.details = details;
  }
}

async function parseResponse(res) {
  const text = await res.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiRequestError('Backend returned an invalid JSON response', {
      status: res.status,
      responsePreview: text.slice(0, 200),
    });
  }
}

export async function request(endpoint, options = {}) {
  const { method = 'GET', body, userId, providerPhone, signal } = options;
  const hasBody = body !== undefined;

  const headers = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (userId) headers['x-user-id'] = userId;
  if (providerPhone) headers['x-provider-phone'] = providerPhone;

  const networkErrors = [];

  for (const baseUrl of API_BASES) {
    const url = `${baseUrl}${endpoint}`;

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(body) : undefined,
        signal,
      });

      const json = await parseResponse(res);

      if (!res.ok || !json?.success) {
        throw new ApiRequestError(json?.message || `Request failed with status ${res.status}`, {
          status: res.status,
          url,
          response: json,
        });
      }

      return json;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        throw err;
      }

      networkErrors.push({
        url,
        message: err?.message || 'Network request failed',
      });
    }
  }

  throw new ApiRequestError('Unable to reach the API server. Check that the backend is running and VITE_API_URL is correct.', {
    endpoint,
    attemptedUrls: networkErrors.map(error => error.url),
    networkErrors,
  });
}

// ── Auth ────────────────────────────────────────────────────────────────

export function startAuth(email, password, role = 'STUDENT') {
  return request('/auth/start', { method: 'POST', body: { email, password, role } });
}

export function verifyOtp(email, otp, role = 'STUDENT') {
  return request('/auth/verify-otp', { method: 'POST', body: { email, otp, role } });
}

export function resendOtp(email, role = 'STUDENT') {
  return request('/auth/resend-otp', { method: 'POST', body: { email, role } });
}

// Retained for backward compatibility if any legacy code calls sendOtp
export function sendOtp(email, password, role = 'STUDENT') {
  return startAuth(email, password, role);
}

export function createStudentProfile(userId, profileData) {
  return request('/student/profile', { method: 'POST', body: profileData, userId });
}

export function getCurrentUserProfile(userId) {
  return request('/users/me', { method: 'GET', userId });
}

export function updateUserProfile(profileData) {
  return request('/user/update-profile', { method: 'PUT', body: profileData });
}

// ── Saved Listings ─────────────────────────────────────────────────────

function getRoomId(roomOrId) {
  const id = typeof roomOrId === 'object' ? roomOrId?.id : roomOrId;
  return id === null || id === undefined ? '' : String(id);
}

function buildSavedSnapshot(userId, listings = [], patch = {}) {
  return {
    userId,
    listings,
    ids: new Set(listings.map(getRoomId).filter(Boolean)),
    loading: false,
    loaded: false,
    savingIds: new Set(),
    error: null,
    version: 0,
    ...patch,
  };
}

let savedSnapshot = buildSavedSnapshot(null);
const savedListeners = new Set();
const savedLoadRequests = new Map();
let savedMutationVersion = 0;

function emitSavedSnapshot(nextSnapshot) {
  savedSnapshot = {
    ...nextSnapshot,
    version: savedSnapshot.version + 1,
  };
  savedListeners.forEach((listener) => listener());
}

function subscribeSavedListings(listener) {
  savedListeners.add(listener);
  return () => savedListeners.delete(listener);
}

function getSavedSnapshot() {
  return savedSnapshot;
}

export async function getSavedListings(userId) {
  if (!userId) return [];
  const response = await request('/saved', { method: 'GET', userId });
  return response?.data?.listings || [];
}

export async function saveListing(roomId, userId) {
  return request(`/saved/${encodeURIComponent(roomId)}`, { method: 'POST', userId });
}

export async function removeSavedListing(roomId, userId) {
  return request(`/saved/${encodeURIComponent(roomId)}`, { method: 'DELETE', userId });
}

export async function loadSavedListings(userId, { force = false } = {}) {
  if (!userId) {
    emitSavedSnapshot(buildSavedSnapshot(null));
    return [];
  }

  if (!force && savedSnapshot.userId === userId && savedSnapshot.loaded) {
    return savedSnapshot.listings;
  }

  const pendingLoad = savedLoadRequests.get(userId);
  if (!force && pendingLoad) {
    return pendingLoad.promise;
  }

  const currentUserSnapshot = savedSnapshot.userId === userId
    ? savedSnapshot
    : buildSavedSnapshot(userId);

  emitSavedSnapshot({
    ...currentUserSnapshot,
    userId,
    loading: true,
    error: null,
  });

  const requestKey = Symbol(userId);
  const loadVersion = savedMutationVersion;
  const requestPromise = getSavedListings(userId)
    .then((listings) => {
      if (savedSnapshot.userId === userId && loadVersion === savedMutationVersion) {
        emitSavedSnapshot(buildSavedSnapshot(userId, listings, {
          loaded: true,
          savingIds: savedSnapshot.savingIds,
        }));
      }
      return listings;
    })
    .catch((error) => {
      if (
        savedSnapshot.userId === userId &&
        loadVersion === savedMutationVersion &&
        savedLoadRequests.get(userId)?.requestKey === requestKey
      ) {
        emitSavedSnapshot({
          ...savedSnapshot,
          loading: false,
          error,
        });
      }
      throw error;
    })
    .finally(() => {
      if (savedLoadRequests.get(userId)?.requestKey === requestKey) {
        savedLoadRequests.delete(userId);
      }
    });

  savedLoadRequests.set(userId, { promise: requestPromise, requestKey });
  return requestPromise;
}

export function refreshSavedListings(userId) {
  return loadSavedListings(userId, { force: true });
}

export async function toggleSavedListing(userId, listing) {
  const roomId = getRoomId(listing);
  if (!userId) throw new Error('Please login first');
  if (!roomId) throw new Error('Room id is required');

  const baseSnapshot = savedSnapshot.userId === userId
    ? savedSnapshot
    : buildSavedSnapshot(userId);
  const wasSaved = baseSnapshot.ids.has(roomId);
  const previousSnapshot = savedSnapshot;
  const nextIds = new Set(baseSnapshot.ids);
  const nextSavingIds = new Set(baseSnapshot.savingIds);
  const withoutListing = baseSnapshot.listings.filter((item) => getRoomId(item) !== roomId);
  let nextListings = withoutListing;

  savedMutationVersion += 1;
  nextSavingIds.add(roomId);
  if (wasSaved) {
    nextIds.delete(roomId);
  } else {
    nextIds.add(roomId);
    nextListings = [{ ...(listing || {}), id: roomId, saved: true }, ...withoutListing];
  }

  emitSavedSnapshot({
    ...baseSnapshot,
    userId,
    ids: nextIds,
    listings: nextListings,
    savingIds: nextSavingIds,
    error: null,
  });

  try {
    if (wasSaved) {
      await removeSavedListing(roomId, userId);
    } else {
      await saveListing(roomId, userId);
    }

    const savingIds = new Set(savedSnapshot.savingIds);
    savingIds.delete(roomId);
    emitSavedSnapshot({
      ...savedSnapshot,
      savingIds,
    });
    loadSavedListings(userId, { force: true }).catch(() => {});

    return { roomId, saved: !wasSaved };
  } catch (error) {
    emitSavedSnapshot(previousSnapshot);
    throw error;
  }
}

export function useSavedListings(userId) {
  const snapshot = useSyncExternalStore(
    subscribeSavedListings,
    getSavedSnapshot,
    getSavedSnapshot
  );

  useEffect(() => {
    if (!userId) {
      emitSavedSnapshot(buildSavedSnapshot(null));
      return;
    }

    loadSavedListings(userId).catch(() => {});
  }, [userId]);

  const userSnapshot = userId && snapshot.userId === userId
    ? snapshot
    : buildSavedSnapshot(userId || null);

  const isSaved = useCallback((roomOrId) => (
    userSnapshot.ids.has(getRoomId(roomOrId))
  ), [userSnapshot.ids]);

  const toggleSaved = useCallback((listing) => (
    toggleSavedListing(userId, listing)
  ), [userId]);

  const refresh = useCallback(() => (
    userId ? refreshSavedListings(userId) : Promise.resolve([])
  ), [userId]);

  return {
    ...userSnapshot,
    savedIds: userSnapshot.ids,
    isSaved,
    toggleSaved,
    refresh,
  };
}
