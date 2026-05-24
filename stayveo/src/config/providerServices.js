import {
  Bed,
  Bubbles,
  Home,
  MapPin,
  Shirt,
  Soup,
  Sparkles,
  Timer,
  Utensils,
} from 'lucide-react';

export const SERVICE_TYPES = {
  PG: 'PG',
  TIFFIN: 'TIFFIN',
  LAUNDRY: 'LAUNDRY',
  CLEANING: 'CLEANING',
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
  LAUNDRY: {
    type: SERVICE_TYPES.LAUNDRY,
    icon: Shirt,
    emoji: '🧺',
    label: 'Laundry',
    groupTitle: 'Laundry Services',
    addLabel: 'Add Laundry Service',
    emptyTitle: 'No laundry services yet',
    emptyDescription: 'Offer a new laundry package',
    createTitle: 'Create Laundry Service',
    editTitle: 'Edit Laundry Service',
    submitCreate: 'Publish Service',
    submitEdit: 'Update Service',
    routeBase: '/provider/services/laundry',
    accent: '#0891B2',
    bg: '#ECFEFF',
    fields: [
      { name: 'name', label: 'Service Name', type: 'text', placeholder: 'Campus Laundry Express', required: true, section: 'basics' },
      { name: 'washType', label: 'Wash Type', type: 'chips', options: ['Wash + Fold', 'Wash + Iron', 'Dry Clean', 'Iron Only'], section: 'basics' },
      { name: 'kgPrice', label: 'KG Pricing', type: 'number', placeholder: '80', required: true, section: 'pricing' },
      { name: 'perClothPrice', label: 'Per Cloth Pricing', type: 'number', placeholder: '12', section: 'pricing' },
      { name: 'pickupAvailable', label: 'Pickup Available', type: 'toggle', section: 'operations' },
      { name: 'expressDelivery', label: 'Express Delivery', type: 'toggle', section: 'operations' },
      { name: 'estimatedTime', label: 'Estimated Time', type: 'text', placeholder: '24-48 hours', section: 'operations' },
      ...commonLocationFields,
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Pickup rules, stains policy, delivery promise...', section: 'details' },
    ],
    initialValues: {
      name: '',
      washType: '',
      kgPrice: '',
      perClothPrice: '',
      pickupAvailable: true,
      expressDelivery: false,
      estimatedTime: '',
      address: '',
      serviceRadiusKm: '3',
      description: '',
      images: [],
      coverImage: '',
      isActive: true,
      latitude: null,
      longitude: null,
    },
  },
  CLEANING: {
    type: SERVICE_TYPES.CLEANING,
    icon: Sparkles,
    emoji: '🧹',
    label: 'Cleaning',
    groupTitle: 'Cleaning Services',
    addLabel: 'Add Cleaning Service',
    emptyTitle: 'No cleaning services yet',
    emptyDescription: 'Create a new cleaning offering',
    createTitle: 'Create Cleaning Service',
    editTitle: 'Edit Cleaning Service',
    submitCreate: 'Publish Service',
    submitEdit: 'Update Service',
    routeBase: '/provider/services/cleaning',
    accent: '#7C3AED',
    bg: '#F5F3FF',
    fields: [
      { name: 'name', label: 'Service Name', type: 'text', placeholder: 'Hostel Room Deep Clean', required: true, section: 'basics' },
      { name: 'cleaningType', label: 'Cleaning Type', type: 'chips', options: ['Basic Room', 'Deep Cleaning', 'Bathroom', 'Move-in Cleaning'], section: 'basics' },
      { name: 'deepCleaning', label: 'Deep Cleaning', type: 'toggle', section: 'basics' },
      { name: 'equipmentIncluded', label: 'Equipment Included', type: 'toggle', section: 'operations' },
      { name: 'roomSize', label: 'Room Size', type: 'chips', options: ['Small', 'Medium', 'Large', '2 Rooms'], section: 'pricing' },
      { name: 'price', label: 'Pricing', type: 'number', placeholder: '499', required: true, section: 'pricing' },
      { name: 'availableSlots', label: 'Available Slots', type: 'multiChips', options: ['Morning', 'Afternoon', 'Evening', 'Weekend'], section: 'operations' },
      ...commonLocationFields,
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What is included, timing, material policy...', section: 'details' },
    ],
    initialValues: {
      name: '',
      cleaningType: '',
      deepCleaning: false,
      equipmentIncluded: true,
      roomSize: '',
      price: '',
      availableSlots: [],
      address: '',
      serviceRadiusKm: '3',
      description: '',
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
  const upper = String(type).replace('-', '_').toUpperCase();
  if (upper === 'HOSTEL' || upper === 'ROOM' || upper === 'ROOMS') return SERVICE_TYPES.PG;
  return providerServiceConfig[upper] ? upper : SERVICE_TYPES.PG;
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
