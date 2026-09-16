import prisma from '../src/common/db/prisma.js';

// Coordinates for major colleges / hub areas for fallback lookup
const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'SHIVAJI': { lat: 28.6495, lng: 77.1215 },
  'RAJA GARDEN': { lat: 28.6500, lng: 77.1200 },
  'TAGORE GARDEN': { lat: 28.6440, lng: 77.1140 },
  'HANSRAJ': { lat: 28.6874, lng: 77.2090 },
  'NORTH CAMPUS': { lat: 28.6890, lng: 77.2100 },
  'SOUTH CAMPUS': { lat: 28.5862, lng: 77.1648 },
  'SATYA NIKETAN': { lat: 28.5880, lng: 77.1680 },
  'LAJPAT NAGAR': { lat: 28.5677, lng: 77.2433 },
  'KAROL BAGH': { lat: 28.6517, lng: 77.1906 },
  'PATEL NAGAR': { lat: 28.6520, lng: 77.1600 },
  'DEFAULT': { lat: 28.6495, lng: 77.1215 }, // Default near Shivaji / West Delhi hub
};

function resolveCoordinatesForListing(address?: string | null): { lat: number; lng: number } {
  if (!address) return AREA_COORDINATES['DEFAULT'];
  const upper = address.toUpperCase();

  for (const [key, coords] of Object.entries(AREA_COORDINATES)) {
    if (key !== 'DEFAULT' && upper.includes(key)) {
      return coords;
    }
  }

  return AREA_COORDINATES['DEFAULT'];
}

async function backfill() {
  console.log('🔄 Starting RoomListing coordinates backfill...');

  const listings = await prisma.roomListing.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
      ],
    },
    include: {
      provider: {
        include: {
          services: {
            include: {
              tiffinDetails: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${listings.length} room listings requiring coordinate backfill.`);

  let updatedCount = 0;

  for (const listing of listings) {
    let lat: number | null = null;
    let lng: number | null = null;

    // 1. Try to get coordinates from provider's tiffinDetails if available
    for (const service of listing.provider?.services || []) {
      if (service.tiffinDetails?.latitude != null && service.tiffinDetails?.longitude != null) {
        lat = Number(service.tiffinDetails.latitude);
        lng = Number(service.tiffinDetails.longitude);
        break;
      }
    }

    // 2. Fallback to address lookup / area default
    if (lat === null || lng === null) {
      const coords = resolveCoordinatesForListing(listing.address);
      lat = coords.lat;
      lng = coords.lng;
    }

    await prisma.roomListing.update({
      where: { id: listing.id },
      data: {
        latitude: lat,
        longitude: lng,
      },
    });

    updatedCount++;
    console.log(`Updated listing "${listing.title}" (${listing.id}) -> lat: ${lat}, lng: ${lng}`);
  }

  console.log(`✅ Backfill complete! Updated ${updatedCount} listings.`);
  await prisma.$disconnect();
}

backfill().catch((err) => {
  console.error('❌ Backfill failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
