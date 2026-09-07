import {
  Bed,
  Building2,
  Bubbles,
  Home,
  MapPin,
  Soup,
  Sparkles,
  Timer,
  Utensils,
} from 'lucide-react';

export const SERVICE_TYPES = {
  PG: 'PG',
  TIFFIN: 'TIFFIN',
};

export const SERVICE_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  FULL: 'FULL',
  DRAFT: 'DRAFT',
  HIDDEN: 'HIDDEN',
};

const commonLocationFields = [
  { name: 'address', label: 'Service Location', type: 'textarea', placeholder: 'Street, landmark, area', section: 'location' },
  { name: 'serviceRadiusKm', label: 'Service Radius (km)', type: 'number', placeholder: '3', section: 'location' },
];

export const providerServiceConfig = {
  PG: {
    type: SERVICE_TYPES.PG,
    icon: Home,
    emoji: '🏠',
    label: 'PG / Hostel',
    groupTitle: 'PG / Rooms',
    addLabel: 'Add New Room',
    emptyTitle: 'No rooms yet',
    emptyDescription: 'Create a new room listing with pricing and photos',
    createTitle: 'Create Room Listing',
    editTitle: 'Edit Room Listing',
    submitCreate: 'Create Listing',
    submitEdit: 'Save Changes',
    routeBase: '/provider/listing',
    accent: '#4F46E5',
    bg: '#EEF2FF',
    persona: {
      label: 'PG Service',
      shortLabel: 'PG',
      icon: Building2,
      settingsSubtitle: 'Manage your PG Service information and preferences.',
      businessDetailsSubtitle: 'Update your property registry, room layouts and warden contacts.',
      businessProfileDescription: 'This information is shown to students and customers on your property listings.',
      businessNameLabel: 'Property / PG Name',
      businessNamePlaceholder: 'e.g. North Campus Homes',
      businessAddressLabel: 'Property Address',
      descriptionLabel: 'Property Description',
      descriptionPlaceholder: 'Tell students about your property, rooms, amenities, and house rules...',
      locationNote: 'Used for geo-mapping and student enquiries',
      specificSectionTitle: 'Property & Occupancy',
      specificSectionNote: 'Keep your room inventory details up to date',
    },
  },
  TIFFIN: {
    type: SERVICE_TYPES.TIFFIN,
    icon: Utensils,
    emoji: '🍱',
    label: 'Tiffin',
    groupTitle: 'Meal Plans',
    addLabel: 'Add New Meal Plan',
    emptyTitle: 'No meal plans yet',
    emptyDescription: 'Create a new meal plan for students',
    createTitle: 'Create Meal Plan',
    editTitle: 'Edit Meal Plan',
    submitCreate: 'Publish Meal Plan',
    submitEdit: 'Update Meal Plan',
    routeBase: '/provider/services/tiffin',
    accent: '#EA580C',
    bg: '#FFF7ED',
    persona: {
      label: 'Tiffin Service',
      shortLabel: 'Tiffin',
      icon: Utensils,
      settingsSubtitle: 'Manage your Tiffin Service information and preferences.',
      businessDetailsSubtitle: 'Update your business profile, kitchen details and contact information.',
      businessProfileDescription: 'This information is shown to students and customers on your public listings.',
      businessNameLabel: 'Business Name',
      businessNamePlaceholder: 'e.g. Sunny Leone Tiffin & Homely Meals',
      businessAddressLabel: 'Business Address',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Tell students about your meals, portions, delivery rules, and service...',
      locationNote: 'Used for geo-mapping and delivery',
      specificSectionTitle: 'Kitchen & Delivery',
      specificSectionNote: 'Service information used for delivery and verification',
    },
    fields: [
      { name: 'name', label: 'Plan Name', type: 'text', placeholder: 'Monthly Veg Plan', required: true, section: 'basics' },
      { name: 'mealType', label: 'Meal Type', type: 'chips', options: ['Breakfast', 'Lunch', 'Dinner', 'Lunch + Dinner', 'Full Day'], section: 'basics' },
      { name: 'foodType', label: 'Food Preference', type: 'chips', options: ['VEG', 'NONVEG', 'JAIN', 'VEGAN'], section: 'basics' },
      { name: 'monthlyPrice', label: 'Monthly Price', type: 'number', placeholder: '4500', required: true, section: 'pricing' },
      { name: 'weeklyPrice', label: 'Weekly Price', type: 'number', placeholder: '1200', section: 'pricing' },
      { name: 'deliveryTime', label: 'Delivery Time', type: 'text', placeholder: '8:00 AM - 9:30 AM', section: 'operations' },
      { name: 'servingWindows', label: 'Serving Window', type: 'multiChips', options: ['Morning', 'Afternoon', 'Evening', 'Night'], section: 'operations' },
      { name: 'weeklyMenu', label: 'Weekly Menu', type: 'textarea', placeholder: 'Monday: dal, rice, roti...', section: 'details' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe taste, portions, delivery rules...', section: 'details' },
      { name: 'hygieneBadge', label: 'Hygiene Badge', type: 'toggle', section: 'trust' },
      ...commonLocationFields,
    ],
    initialValues: {
      name: '',
      mealType: '',
      foodType: 'VEG',
      monthlyPrice: '',
      weeklyPrice: '',
      deliveryTime: '',
      servingWindows: [],
      weeklyMenu: '',
      description: '',
      hygieneBadge: false,
      address: '',
      serviceRadiusKm: '3',
      images: [],
      coverImage: '',
      isActive: true,
      latitude: null,
      longitude: null,
    },
  },
};

export const serviceSectionLabels = {
  basics: { title: 'Basic Details', icon: Bed },
  pricing: { title: 'Pricing', icon: Timer },
  operations: { title: 'Operations', icon: Bubbles },
  trust: { title: 'Trust & Quality', icon: Sparkles },
  details: { title: 'Description', icon: Soup },
  location: { title: 'Location & Radius', icon: MapPin },
};

export function normalizeServiceType(type) {
  if (!type) return SERVICE_TYPES.PG;
  const rawType = type && typeof type === 'object'
    ? type.type || type.serviceType || type.service_type
    : type;
  const upper = String(rawType).replace('-', '_').toUpperCase();
  if (upper === 'HOSTEL' || upper === 'ROOM' || upper === 'ROOMS') return SERVICE_TYPES.PG;
  return providerServiceConfig[upper] ? upper : SERVICE_TYPES.PG;
}

function knownServiceType(type) {
  const rawType = type && typeof type === 'object'
    ? type.type || type.serviceType || type.service_type
    : type;
  if (!rawType) return '';
  const upper = String(rawType).replace('-', '_').toUpperCase();
  if (upper === 'HOSTEL' || upper === 'ROOM' || upper === 'ROOMS') return SERVICE_TYPES.PG;
  return providerServiceConfig[upper] ? upper : '';
}

export function getActiveProviderServiceType(provider) {
  const candidates = [
    provider?.activeServiceType,
    provider?.active_service_type,
    provider?.serviceType,
    provider?.service_type,
    ...(Array.isArray(provider?.services) ? provider.services : []),
  ];

  return candidates.map(knownServiceType).find(Boolean) || '';
}

export function getProviderPersona(provider) {
  const type = getActiveProviderServiceType(provider);
  if (!type) {
    return {
      type: '',
      label: 'Provider account',
      shortLabel: 'Provider',
      icon: Building2,
      settingsSubtitle: 'Manage your provider information and preferences.',
      businessDetailsSubtitle: 'Update your business profile and contact information.',
      businessProfileDescription: 'This information is shown to students and customers on your public listings.',
      businessNameLabel: 'Business Name',
      businessNamePlaceholder: 'Enter your business name',
      businessAddressLabel: 'Business Address',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Tell students and customers about your business...',
      locationNote: 'Used for geo-mapping and enquiries',
      specificSectionTitle: 'Service Information',
      specificSectionNote: 'Service details will appear once your provider type is available.',
      isUnknown: true,
    };
  }

  return { type, ...providerServiceConfig[type].persona, isUnknown: false };
}

export function getProviderServiceTypes(provider) {
  const selected = provider?.services?.length ? provider.services : [SERVICE_TYPES.PG];
  return selected.map(normalizeServiceType).filter((type, index, arr) => arr.indexOf(type) === index);
}

export function getCreatePath(type) {
  const serviceType = normalizeServiceType(type);
  if (serviceType === SERVICE_TYPES.PG) return '/provider/listing/create';
  return `${providerServiceConfig[serviceType].routeBase}/create`;
}

export function getEditPath(type, id) {
  const serviceType = normalizeServiceType(type);
  if (serviceType === SERVICE_TYPES.PG) return `/provider/listing/${id}/edit`;
  return `${providerServiceConfig[serviceType].routeBase}/${id}/edit`;
}
