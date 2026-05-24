# StayVeo Mapbox Location Picker Architecture

This document explains the service location selection flow used in provider onboarding for PG/Hostel, Tiffin, Laundry, and Cleaning services.

## Mapbox Setup

Install:

```bash
npm install react-map-gl mapbox-gl
```

Why both packages exist:

- `mapbox-gl` is the actual WebGL map engine. It creates the canvas, downloads style JSON, requests vector/raster tiles, renders roads/labels/buildings, and handles low-level map interactions.
- `react-map-gl` is the React wrapper. It turns the imperative Mapbox map into React components such as `Map`, `Marker`, and `NavigationControl`, so state and props drive the map UI.

Mapbox maps are built from styles and tiles. A style such as `mapbox://styles/mapbox/light-v11` describes which tile sources, layers, colors, labels, and roads should render. Tiles are small geographic chunks loaded as the user pans and zooms. The access token tells Mapbox which account/project is requesting those tiles and styles.

## Environment Variables

Frontend token:

```bash
VITE_MAPBOX_TOKEN=pk_your_public_mapbox_token
```

Vite exposes only variables prefixed with `VITE_` through `import.meta.env`. This keeps environment-specific config out of source code. A Mapbox public token is still visible in the browser, so restrict it in the Mapbox dashboard by URL/domain and avoid using secret tokens in frontend code.

After editing `.env`, restart the Vite dev server.

## Component Architecture

The reusable map component lives at:

```text
src/components/maps/LocationPicker.jsx
```

Why isolate it:

- map rendering, camera movement, markers, and browser GPS are specialized concerns
- onboarding should only care about business state: service type, latitude, longitude, address
- the same picker can later be reused in edit-listing, admin review, or map-search workflows
- future reverse geocoding and map search can be added without bloating the form component

## State Model

The picker uses two kinds of state:

- `viewState`: camera state for the map UI, including longitude, latitude, zoom, bearing, and pitch
- `selectedLocation`: business selection shown by the marker

The parent onboarding form owns service-keyed location state:

```js
{
  PG: { latitude, longitude, address },
  TIFFIN: { latitude, longitude, address },
  LAUNDRY: { latitude, longitude, address },
  CLEANING: { latitude, longitude, address }
}
```

Camera state answers: "Where is the map looking?" Business state answers: "Where is this service actually located?" Keeping these separate matters because a user can pan the map without changing the saved service location.

## Click-to-Select Flow

1. Provider clicks the map.
2. Mapbox fires a click event.
3. `event.lngLat` contains `{ lng, lat }`.
4. The component converts that into `{ latitude: lat, longitude: lng }`.
5. `selectedLocation` updates, so React re-renders the marker.
6. `onChange` lifts the coordinates to `ProviderOnboarding`.
7. Form submit sends coordinates to Fastify.

Longitude comes first in Mapbox because GeoJSON and many GIS APIs use `[longitude, latitude]`, which maps to `[x, y]` on the globe. Database fields and app payloads usually name them explicitly as `latitude` and `longitude` to avoid confusion.

## Current Location Flow

The picker uses:

```js
navigator.geolocation.getCurrentPosition(success, error, options)
```

The browser asks the user for permission. On success, the browser returns GPS/Wi-Fi/cell-derived coordinates. On mobile this is often very accurate; on desktop it may be approximate. The picker recenters the camera, updates the selected marker, and lifts the same coordinates to the parent form.

## Backend Flow

Coordinates move through the system like this:

```text
React ProviderOnboarding
  -> src/api/provider.js saveServiceDetails()
  -> Fastify /api/provider/service-details
  -> provider.controller.ts
  -> provider.service.ts
  -> provider.repository.ts
  -> Prisma service detail upsert
  -> PostgreSQL *_details.latitude / *_details.longitude
```

Coordinates belong on service detail rows, not the provider profile. One provider may operate a PG in one place, a tiffin kitchen in another, and cleaning/laundry pickup zones from a third operational base.

## Database Notes

Service detail models store:

```prisma
latitude  Decimal? @db.Decimal(9, 6)
longitude Decimal? @db.Decimal(9, 6)
```

`Decimal(9, 6)` stores six digits after the decimal point, which is roughly sub-meter precision. That is more than enough for property search and distance filtering. Floats are convenient in JavaScript, but decimals are safer for stable persisted coordinates.

The columns are nullable during rollout. Nullable geo fields let existing rows survive migration, and they let providers save partial drafts before a location is required by policy.

Migration flow:

```bash
cd backend
npm run db:generate
npm run db:push
```

For migration-based environments, apply the generated SQL migration instead of using `db push` directly against production.

## Future TODOs

- Reverse geocode coordinates into readable addresses.
- Let providers search by address/landmark before pinning.
- Auto-suggest nearby colleges.
- Add Haversine or PostGIS distance filtering.
- Show PG and service cards on a map in student search.
- Cluster markers for dense city areas.
- Add college-based recommendations.
- Add backend validation that selected coordinates are within supported service cities.
- Add audit fields for who changed listing coordinates and when.
- Add service availability zones and geo-ranking per service category.
