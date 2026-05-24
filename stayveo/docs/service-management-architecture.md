# StayVeo Services Management Architecture

## Frontend Structure

```txt
src/
  config/providerServices.js          # service labels, CTAs, routes, field config
  lib/serviceVisibility.js            # status and inventory derivation
  lib/storage.js                      # Supabase Storage path/bucket strategy
  components/provider/
    DynamicServiceForm.jsx            # config-driven tiffin/laundry/cleaning form
    EmptyStateCard.jsx
    PhotoUploadGrid.jsx
    ServiceStatusChip.jsx
    ServiceManagement.css
  components/maps/LocationPicker.jsx  # Mapbox click/pin/current-location picker
  pages/provider/
    ProviderServices.jsx              # dynamic My Services renderer
    ProviderCreateListing.jsx         # PG create
    ProviderEditListing.jsx           # PG edit
    ProviderServiceCreate.jsx         # generic service create
    ProviderServiceEdit.jsx           # generic service edit
```

## Dynamic Config System

`providerServiceConfig` is the single UI contract for service management:

- Dynamic CTA labels: `Add New Room`, `Add New Meal Plan`, `Add Laundry Service`, `Add Cleaning Service`
- Dynamic empty states
- Dynamic create/edit page titles
- Service-specific field schemas
- Route generation through `getCreatePath(type)` and `getEditPath(type, id)`
- Service colors, icons, grouping names, and submit labels

This keeps product language out of page components and makes new services additive.

## React Component Hierarchy

```txt
ProviderServices
  ServiceCard
    ServiceStatusChip
  EmptyStateCard

ProviderServiceCreate / ProviderServiceEdit
  DynamicServiceForm
    FieldRenderer
    LocationPicker
    PhotoUploadGrid
```

PG rooms intentionally keep `RoomListingForm` because bed inventory has stricter domain logic than the other services.

## Routing

```txt
/provider/services                      # dynamic My Services
/provider/listing/create                # PG create
/provider/listing/:id/edit              # PG edit
/provider/services/tiffin/create
/provider/services/tiffin/:id/edit
/provider/services/laundry/create
/provider/services/laundry/:id/edit
/provider/services/cleaning/create
/provider/services/cleaning/:id/edit
```

## TypeScript Types Target

When the frontend is migrated from JSX to TSX, use this contract:

```ts
type ServiceType = 'PG' | 'TIFFIN' | 'LAUNDRY' | 'CLEANING';
type ServiceStatus = 'ACTIVE' | 'PAUSED' | 'FULL' | 'DRAFT' | 'HIDDEN';

type GeoPoint = {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  serviceRadiusKm?: number;
};

type ServiceImageSet = {
  images: string[];
  coverImage?: string;
};

type RoomListing = GeoPoint & ServiceImageSet & {
  id: string;
  title: string;
  roomType: string;
  sharingType?: string;
  acType?: 'AC' | 'NON_AC';
  price: number;
  securityDeposit?: number;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  amenities: string[];
  genderPreference: 'boys' | 'girls' | 'unisex';
  isActive: boolean;
  status: ServiceStatus;
};
```

## Prisma Architecture

Recommended production models:

```prisma
enum ServiceStatus {
  ACTIVE
  PAUSED
  FULL
  DRAFT
  HIDDEN
}

model RoomListing {
  id               String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  providerId       String        @map("provider_id") @db.Uuid
  title            String
  roomType         String        @map("room_type")
  sharingType      String?       @map("sharing_type")
  acType           String?       @map("ac_type")
  price            Float
  securityDeposit  Float?        @map("security_deposit")
  totalBeds        Int           @map("total_beds")
  occupiedBeds     Int           @default(0) @map("occupied_beds")
  availableBeds    Int           @map("available_beds")
  amenities        String[]      @default([])
  description      String?
  images           String[]      @default([])
  coverImage       String?       @map("cover_image")
  isActive         Boolean       @default(true) @map("is_active")
  status           ServiceStatus @default(ACTIVE)
  latitude         Decimal?      @db.Decimal(9, 6)
  longitude        Decimal?      @db.Decimal(9, 6)
  serviceRadiusKm  Decimal?      @map("service_radius_km") @db.Decimal(5, 2)
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  @@index([providerId, status, isActive, availableBeds])
  @@map("room_listings")
}
```

Use separate tables for `MealPlan`, `LaundryOffering`, and `CleaningOffering` rather than one overloaded JSON table. Their workflows, search filters, and pricing models differ enough to deserve first-class models. Keep shared columns consistent: provider relation, images, cover image, coordinates, radius, `isActive`, `status`, timestamps.

## Fastify API Structure

```txt
backend/src/modules/service-management/
  service-management.routes.ts
  service-management.controller.ts
  service-management.service.ts
  service-management.repository.ts
  service-management.schema.ts
  visibility.ts
```

Routes:

```txt
GET    /api/provider/services/:type/items
POST   /api/provider/services/:type/items
GET    /api/provider/services/:type/items/:id
PUT    /api/provider/services/:type/items/:id
PATCH  /api/provider/services/:type/items/:id/toggle
DELETE /api/provider/services/:type/items/:id
```

Rules:

- Resolve provider from auth/session, not from client-sent provider IDs.
- Validate every request with Zod.
- Enforce ownership before read/update/delete.
- Derive status server-side. Never trust client-submitted `status`.

## Visibility Engine

PG:

```ts
availableBeds = max(totalBeds - occupiedBeds, 0)
status = !isActive ? 'PAUSED' : availableBeds === 0 ? 'FULL' : 'ACTIVE'
isVisible = status === 'ACTIVE' && availableBeds > 0
```

Other services:

```ts
status = isActive ? 'ACTIVE' : 'PAUSED'
isVisible = status === 'ACTIVE'
```

Student-facing queries must filter by `status = ACTIVE`, `isActive = true`, and for rooms `availableBeds > 0`.

## Supabase Storage

Buckets:

- `pg-images` for PG, tiffin, laundry, and cleaning service images

Path strategy:

```txt
provider-{providerId}/{serviceType}-{listingId}/{timestamp}-{imageId}.{ext}
```

Frontend flow:

```txt
File state -> validate type/size -> optional compression hook -> Supabase upload
-> public URL -> images[] + coverImage -> backend API -> Prisma -> Postgres
```

Production hardening:

- Switch from public bucket uploads to signed upload URLs.
- Store image metadata in `MediaUpload`.
- Use RLS policies keyed by Supabase auth user ID.
- Add image moderation and background compression for large uploads.

## Mapbox Architecture

`LocationPicker` supports:

- Responsive rectangular map
- Click to pin
- Pin map center
- Current location button
- Coordinate readout
- Token-missing empty state

Next production steps:

- Make marker draggable.
- Add reverse geocoding to fill readable address.
- Draw service radius circle.
- Persist `latitude`, `longitude`, and `serviceRadiusKm` on every service table.

## Mobile UX Rules

- Keep forms sectioned into short cards.
- Use sticky bottom submit bars.
- Prefer chips/toggles over long selects.
- Use live preview cards before submit.
- Show loading skeletons and optimistic toggles.
- Do not show dead navigation; disabled future items should be clearly marked or removed.

## Scalability Reasoning

The architecture separates product semantics from implementation mechanics:

- Config owns labels, routes, and field definitions.
- Forms render from config.
- Backend owns validation, status derivation, and ownership.
- Prisma models stay domain-specific for query speed and clean filters.
- Shared UI components keep the SaaS dashboard consistent across services.

This gives StayVeo the ability to add future student services without duplicating dashboard, upload, map, and visibility code.
