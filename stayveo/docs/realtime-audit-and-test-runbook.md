# StayVeo Realtime Audit And Test Runbook

## Debug Logging

Enable client-side realtime logs in the browser console:

```js
localStorage.setItem('stayveoRealtimeDebug', 'true')
```

Disable:

```js
localStorage.removeItem('stayveoRealtimeDebug')
```

Expected log labels:

- `NEW REQUEST RECEIVED`
- `REQUEST STATUS UPDATED`
- `NOTIFICATION RECEIVED`
- `NOTIFICATION UPDATED`
- `BOOKING STATUS UPDATED`

## Tables Required For Realtime

- `laundry_requests`
- `notifications`
- `bookings`

The migration `20260526000000_service_requests_student_location` adds missing request/profile/notification columns and includes guarded `ALTER PUBLICATION supabase_realtime ADD TABLE ...` statements.

## Test Flow 1: Student Request

1. Open student app.
2. Ensure profile has `current_address`, `latitude`, and `longitude`.
3. Open a laundry or cleaning service detail page.
4. Tap `Book Request`.
5. Expected database event: `laundry_requests INSERT`.
6. Expected provider console log: `NEW REQUEST RECEIVED`.
7. Expected provider UI: request card appears without refresh.

## Test Flow 2: Provider Accept

1. Open `/provider/requests`.
2. Open a pending request.
3. Choose pickup date and pickup time.
4. Submit accept.
5. Expected database events:
   - `laundry_requests UPDATE status='accepted'`
   - `notifications INSERT`
6. Expected student console log: `NOTIFICATION RECEIVED`.
7. Expected student UI: toast and notification center update without refresh.

## Test Flow 3: Provider Decline

1. Open `/provider/requests`.
2. Decline a pending request.
3. Expected database events:
   - `laundry_requests UPDATE status='declined'`
   - `notifications INSERT`
4. Expected student UI: decline notification appears without refresh.

## Common Failure Checks

- If provider does not receive request: verify `laundry_requests` is in `supabase_realtime`.
- If student does not receive notification: verify `notifications` is in `supabase_realtime`.
- If duplicate events appear: check React StrictMode and confirm each hook cleanup calls `supabase.removeChannel(channel)`.
- If rows are missing in realtime payloads: confirm Realtime RLS policies allow the current client to read those rows.
- If notification center is empty while rows exist: confirm `notifications.user_id` matches the app `authState.userId`.
