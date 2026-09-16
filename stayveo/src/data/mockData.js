export const notifications = [
  { id: 1, type: 'booking', title: 'Booking Confirmed!', message: 'Your room at Sunshine PG is confirmed for May 15.', time: '2 min ago', read: false },
  { id: 4, type: 'payment', title: 'Payment Due', message: 'Rent payment of ₹8,500 due in 3 days.', time: '1 day ago', read: true },
  { id: 5, type: 'booking', title: 'New Enquiry', message: 'A student enquired about your listing.', time: '2 days ago', read: true },
];

export const currentUser = {
  name: 'Aarav Mehta', year: '2nd Year', branch: 'Computer Science',
  college: 'IIT Delhi', avatar: '😊', gender: 'Male',
  preferences: { budget: [5000, 10000], food: 'Vegetarian', lifestyle: 'Night Owl' },
  activeRoom: {
    id: 1, title: 'Sunshine PG for Boys', type: 'PG', price: 8500, distance: 0.3,
    rating: 4.5, reviews: 128, verified: true, available: true,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'],
    roomType: 'shared', capacity: 2, gender: 'male',
    services: ['wifi', 'food'],
    amenities: ['AC', 'Geyser', 'Study Table', 'Cupboard'],
    address: '23, MG Road, Near Gate 3', owner: 'Rajesh Kumar',
    description: 'Spacious shared rooms with home-cooked meals. 24/7 security and CCTV. Walking distance from campus gate 3.',
  },
  savedListings: [
    {
      id: 1, title: 'Sunshine PG for Boys', type: 'PG', price: 8500, distance: 0.3,
      rating: 4.5, reviews: 128, verified: true, available: true,
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop'],
      roomType: 'shared', capacity: 2, gender: 'male',
      services: ['wifi', 'food'],
      amenities: ['AC', 'Geyser', 'Study Table', 'Cupboard'],
      address: '23, MG Road, Near Gate 3', owner: 'Rajesh Kumar',
    },
    {
      id: 3, title: 'Campus Edge PG', type: 'PG', price: 7200, distance: 0.2,
      rating: 4.7, reviews: 203, verified: true, available: true,
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop'],
      roomType: 'shared', capacity: 3, gender: 'female',
      services: ['wifi', 'food'],
      amenities: ['AC', 'Geyser', 'Common Kitchen', 'Terrace'],
      address: '12, College Road, Main Gate', owner: 'Anita Devi',
    },
    {
      id: 5, title: 'Budget Boys Hostel', type: 'Hostel', price: 4500, distance: 0.5,
      rating: 3.9, reviews: 156, verified: true, available: true,
      images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop'],
      roomType: 'shared', capacity: 4, gender: 'male',
      services: ['wifi', 'food'],
      amenities: ['Fan', 'Common Bathroom', 'Study Hall'],
      address: '90, Station Road', owner: 'Suresh Patel',
    },
  ],
  nextPayment: { amount: 8500, date: 'May 15, 2026', type: 'Rent' },
};

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
