export const brokerData = {
  name: 'Rajesh Kumar', phone: '+91 98765 43210',
  totalEarnings: 285000, thisMonth: 42500,
  totalListings: 8, activeListings: 6,
  occupancyRate: 85, totalBookings: 45,
  pendingRequests: 3,
};

export const providerTypes = [
  { key: 'pg', label: 'PG / Hostel', emoji: '🏠', color: '#6366F1', bgColor: '#EEF2FF', description: 'List your PG, hostel or rooms for rent' },
  { key: 'tiffin', label: 'Tiffin Service', emoji: '🍱', color: '#EA580C', bgColor: '#FFF7ED', description: 'Deliver home-cooked meals to students' },
];

export const calendarSlots = [
  {
    date: '2026-05-03', slots: [
      { time: '11:00', booking: 'Priya - Room Visit', status: 'pending' },
      { time: '14:00', booking: null, status: 'available' },
    ]
  },
  {
    date: '2026-05-04', slots: [
      { time: '09:00', booking: null, status: 'available' },
      { time: '11:00', booking: 'Aarav - Room Visit', status: 'confirmed' },
      { time: '14:00', booking: 'Sneha - Tiffin Setup', status: 'pending' },
      { time: '16:00', booking: null, status: 'available' },
    ]
  },
  {
    date: '2026-05-05', slots: [
      { time: '11:00', booking: null, status: 'available' },
      { time: '14:00', booking: null, status: 'available' },
      { time: '16:00', booking: null, status: 'available' },
    ]
  },
];
