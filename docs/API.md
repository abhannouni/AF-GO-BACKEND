# AF-GO API Documentation

**Base URL:** `http://localhost:3002/api/v1`  
**Content-Type:** `application/json`  
**Authentication:** Bearer token via `Authorization: Bearer <token>` header

---

## Table of Contents

- [Health](#health)
- [Auth](#auth)
- [Activities](#activities)
- [Availability](#availability)
- [Bookings](#bookings)
- [Trips](#trips)
- [Error Responses](#error-responses)

---

## Health

### Check server status

```
GET /health
```

**Auth:** None

**Response `200`**
```json
{
  "success": true,
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-04-17T10:00:00.000Z"
}
```

---

## Auth

### Register

```
POST /auth/register
```

**Auth:** None

**Request Body**

| Field      | Type   | Required | Description                              |
|------------|--------|----------|------------------------------------------|
| `username` | string | Yes      | Unique username                          |
| `email`    | string | Yes      | Valid email address                      |
| `password` | string | Yes      | Minimum 6 characters                    |
| `role`     | string | No       | `client` (default) · `prestataire`       |

**Example**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Secret123",
  "role": "client"
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "User registered",
  "data": {
    "_id": "664abc123...",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "client"
  }
}
```

---

### Login

```
POST /auth/login
```

**Auth:** None

**Request Body**

| Field        | Type   | Required | Description                    |
|--------------|--------|----------|--------------------------------|
| `identifier` | string | Yes      | Email or username              |
| `password`   | string | Yes      | Account password               |

**Example**
```json
{
  "identifier": "john@example.com",
  "password": "Secret123"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGci...",
  "data": {
    "_id": "664abc123...",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "client"
  }
}
```

> Store the `token` and attach it to protected requests as `Authorization: Bearer <token>`.

---

## Activities

### List activities

```
GET /activities
```

**Auth:** None

**Query Parameters**

| Param        | Type   | Description                         |
|--------------|--------|-------------------------------------|
| `city`       | string | Filter by city name                 |
| `category`   | string | Filter by category                  |
| `providerId` | string | Filter by provider (User ObjectId)  |

**Example**
```
GET /activities?city=Marrakech&category=adventure
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664abc123...",
      "title": "Quad Bike Desert Ride",
      "description": "...",
      "city": "Marrakech",
      "category": "adventure",
      "price": 250,
      "duration": 2,
      "images": ["https://..."],
      "providerId": "664xyz...",
      "location": { "address": "Agafay Desert", "lat": 31.5, "lng": -8.1 },
      "included": ["Guide", "Helmet"],
      "excluded": ["Transport"],
      "maxParticipants": 10,
      "rating": { "average": 4.7, "count": 52 },
      "createdAt": "2026-04-10T08:00:00.000Z",
      "updatedAt": "2026-04-10T08:00:00.000Z"
    }
  ]
}
```

---

### Get activity by ID

```
GET /activities/:id
```

**Auth:** None

**Response `200`**
```json
{
  "success": true,
  "data": { /* Activity object */ }
}
```

**Response `404`**
```json
{ "success": false, "message": "Activity not found" }
```

---

### Create activity

```
POST /activities
```

**Auth:** Required — `prestataire` or `admin`

**Request Body**

| Field             | Type     | Required | Description                               |
|-------------------|----------|----------|-------------------------------------------|
| `title`           | string   | Yes      | Activity title                            |
| `description`     | string   | Yes      | Full description                          |
| `city`            | string   | Yes      | City name                                 |
| `category`        | string   | Yes      | E.g. `adventure`, `cultural`, `beach`     |
| `price`           | number   | Yes      | Price per person (MAD or USD)             |
| `duration`        | number   | Yes      | Duration in hours                         |
| `images`          | string[] | No       | Array of image URLs                       |
| `location`        | object   | No       | `{ address, lat, lng }`                   |
| `included`        | string[] | No       | What's included                           |
| `excluded`        | string[] | No       | What's not included                       |
| `maxParticipants` | number   | No       | Max group size                            |
| `providerId`      | string   | No       | Defaults to authenticated user's ID       |

**Example**
```json
{
  "title": "Quad Bike Desert Ride",
  "description": "Thrilling quad biking through Agafay desert.",
  "city": "Marrakech",
  "category": "adventure",
  "price": 250,
  "duration": 2,
  "images": ["https://example.com/quad.jpg"],
  "location": { "address": "Agafay Desert", "lat": 31.5, "lng": -8.1 },
  "included": ["Guide", "Helmet", "Water"],
  "excluded": ["Transport to site"],
  "maxParticipants": 10
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Activity created",
  "data": { /* Created activity object */ }
}
```

---

### Update activity

```
PATCH /activities/:id
```

**Auth:** Required — owner (`prestataire`) or `admin`

**Request Body** — any subset of the create fields (except `providerId`)

**Response `200`**
```json
{
  "success": true,
  "message": "Activity updated",
  "data": { /* Updated activity object */ }
}
```

**Response `403`**
```json
{ "success": false, "message": "Access denied" }
```

---

### Delete activity

```
DELETE /activities/:id
```

**Auth:** Required — owner (`prestataire`) or `admin`

**Response `200`**
```json
{ "success": true, "message": "Activity deleted" }
```

---

## Availability

All endpoints are under `/availability`. Providers define time slots for their activities; clients inspect capacity before booking.

### Data model

```
Availability
  _id           ObjectId
  activityId    ObjectId → Activity (required)
  providerId    ObjectId → User/prestataire (required)
  date          Date     (stored as UTC midnight)
  timeSlots     Array<{ startTime: "HH:mm", availableSpots: integer ≥ 1 }>
  isBlocked     Boolean  (default: false)
  createdAt / updatedAt
```

> `endTime` is **not** stored — it is computed on-the-fly from `activity.duration`.  
> When `isBlocked: true` the provider has explicitly closed the date; `timeSlots` is always `[]` and no bookings are accepted.

---

### 1. List availability records

```
GET /availability
```

**Auth:** None

**Query Parameters**

| Param        | Type   | Description                                |
|--------------|--------|--------------------------------------------|
| `activityId` | string | Filter by activity ObjectId                |
| `providerId` | string | Filter by provider ObjectId                |
| `date`       | string | Filter by exact date — `YYYY-MM-DD`        |

**Example**
```
GET /availability?activityId=664abc123
GET /availability?providerId=664xyz&date=2026-05-10
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664def...",
      "activityId": "664abc123...",
      "providerId": "664xyz...",
      "date": "2026-05-10T00:00:00.000Z",
      "timeSlots": [
        { "startTime": "09:00", "availableSpots": 12 },
        { "startTime": "14:00", "availableSpots": 10 }
      ],
      "isBlocked": false,
      "createdAt": "2026-04-20T10:00:00.000Z",
      "updatedAt": "2026-04-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get available slots (with remaining capacity)

```
GET /availability/slots
```

Returns each slot annotated with `remainingSpots` (deducting active bookings) and `endTime` (derived from `activity.duration`). Use this in the booking flow when the client selects a date.

**Auth:** None

**Query Parameters**

| Param        | Type   | Required | Description                        |
|--------------|--------|----------|------------------------------------|
| `activityId` | string | Yes      | Activity ObjectId                  |
| `date`       | string | Yes      | Date in `YYYY-MM-DD` format        |

**Example**
```
GET /availability/slots?activityId=664abc123&date=2026-05-10
```

**Response `200` — slots available**
```json
{
  "success": true,
  "data": {
    "activityId": "664abc123...",
    "providerId": "664xyz...",
    "date": "2026-05-10T00:00:00.000Z",
    "durationHours": 3,
    "isBlocked": false,
    "slots": [
      {
        "startTime": "09:00",
        "endTime": "12:00",
        "availableSpots": 12,
        "remainingSpots": 10,
        "isAvailable": true
      },
      {
        "startTime": "14:00",
        "endTime": "17:00",
        "availableSpots": 10,
        "remainingSpots": 0,
        "isAvailable": false
      }
    ]
  }
}
```

**Response `200` — no availability or date is blocked**
```json
{
  "success": true,
  "data": { "slots": [], "date": "2026-05-10T00:00:00.000Z", "isBlocked": true }
}
```

**Error responses**

| Status | Message |
|--------|---------|
| `400`  | `activityId and date are required.` |
| `404`  | `Activity not found.` |

---

### 3. Get calendar view (month)

```
GET /availability/calendar
```

Returns per-day status for every day of a given month. Designed for rendering a date-picker calendar in the booking UI.

**Auth:** None

**Query Parameters**

| Param        | Type   | Required | Description               |
|--------------|--------|----------|---------------------------|
| `activityId` | string | Yes      | Activity ObjectId         |
| `year`       | number | Yes      | 4-digit year e.g. `2026`  |
| `month`      | number | Yes      | 1-based month e.g. `5`    |

**Example**
```
GET /availability/calendar?activityId=664abc123&year=2026&month=5
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "date": "2026-05-01", "status": "past",      "availableSlotCount": 0 },
    { "date": "2026-05-05", "status": "available", "availableSlotCount": 2 },
    { "date": "2026-05-06", "status": "full",      "availableSlotCount": 0 },
    { "date": "2026-05-07", "status": "blocked",   "availableSlotCount": 0 },
    { "date": "2026-05-08", "status": "none",      "availableSlotCount": 0 }
  ]
}
```

**Day statuses**

| Status      | Meaning                                                      |
|-------------|--------------------------------------------------------------|
| `available` | At least one slot with remaining capacity                    |
| `full`      | All defined slots are fully booked                           |
| `blocked`   | Provider explicitly closed this date                         |
| `none`      | No availability record exists for this date                  |
| `past`      | Date is before today — always disabled for new bookings      |

**Error responses**

| Status | Message |
|--------|---------|
| `400`  | `activityId, year, and month are required.` |
| `400`  | `Invalid year or month.` |

---

### 4. Create / upsert availability (single date)

```
POST /availability
```

Creates a new record or replaces the existing one for the same `(activityId, providerId, date)` triple. Set `isBlocked: true` to close a date without providing time slots.

**Auth:** Required — `prestataire` or `admin`

**Request Body**

| Field        | Type      | Required                 | Constraints                                          |
|--------------|-----------|--------------------------|------------------------------------------------------|
| `activityId` | string    | Yes                      | ObjectId — must be an activity you own               |
| `date`       | string    | Yes                      | `YYYY-MM-DD`                                         |
| `timeSlots`  | object[]  | Yes (unless `isBlocked`) | Array of `{ startTime, availableSpots }` objects     |
| `isBlocked`  | boolean   | No                       | `true` = close date; clears any existing time slots  |

**`timeSlots` item constraints**

| Field            | Rule                       |
|------------------|----------------------------|
| `startTime`      | Required — `HH:mm` 24-hour |
| `availableSpots` | Required — integer ≥ 1     |

**Example — set two time slots**
```json
{
  "activityId": "664abc123...",
  "date": "2026-05-10",
  "timeSlots": [
    { "startTime": "09:00", "availableSpots": 12 },
    { "startTime": "14:00", "availableSpots": 10 }
  ]
}
```

**Example — block a date**
```json
{
  "activityId": "664abc123...",
  "date": "2026-05-26",
  "isBlocked": true
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Availability saved.",
  "data": {
    "_id": "664def...",
    "activityId": "664abc123...",
    "providerId": "664xyz...",
    "date": "2026-05-10T00:00:00.000Z",
    "timeSlots": [
      { "startTime": "09:00", "availableSpots": 12 },
      { "startTime": "14:00", "availableSpots": 10 }
    ],
    "isBlocked": false
  }
}
```

**Error responses**

| Status | Message |
|--------|---------|
| `400`  | `activityId and date are required.` |
| `400`  | `Provide at least one timeSlot, or set isBlocked=true.` |
| `400`  | `Invalid startTime format: "…". Use HH:mm.` |
| `400`  | `Each slot must have at least 1 available spot.` |
| `403`  | `You can only manage availability for your own activities.` |
| `404`  | `Activity not found.` |

---

### 5. Bulk create / upsert (date range)

```
POST /availability/bulk
```

Upserts availability for every day in a range, with an optional weekday filter. Ideal for recurring schedules (e.g., every Mon–Fri for a month). Maximum range: 366 days.

**Auth:** Required — `prestataire` or `admin`

**Request Body**

| Field        | Type      | Required                 | Description                                                        |
|--------------|-----------|--------------------------|--------------------------------------------------------------------|
| `activityId` | string    | Yes                      | ObjectId — must be an activity you own                             |
| `startDate`  | string    | Yes                      | Range start — `YYYY-MM-DD`                                         |
| `endDate`    | string    | Yes                      | Range end — `YYYY-MM-DD` (inclusive, max 366 days from start)      |
| `weekdays`   | number[]  | No                       | JS `getUTCDay()` values: `0`=Sun `1`=Mon … `6`=Sat. Omit for all days |
| `timeSlots`  | object[]  | Yes (unless `isBlocked`) | Same structure as single-date create                               |
| `isBlocked`  | boolean   | No                       | `true` = block all matching dates                                  |

**Example — set Mon–Fri schedule for May 2026**
```json
{
  "activityId": "664abc123...",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "weekdays": [1, 2, 3, 4, 5],
  "timeSlots": [
    { "startTime": "09:00", "availableSpots": 10 },
    { "startTime": "14:00", "availableSpots": 10 }
  ]
}
```

**Example — block all Sundays in the same range**
```json
{
  "activityId": "664abc123...",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "weekdays": [0],
  "isBlocked": true
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Availability saved for 22 day(s).",
  "count": 22
}
```

**Error responses**

| Status | Message |
|--------|---------|
| `400`  | `activityId, startDate, and endDate are required.` |
| `400`  | `Provide at least one timeSlot, or set isBlocked=true.` |
| `400`  | `endDate must be on or after startDate.` |
| `400`  | `Date range cannot exceed 366 days.` |
| `400`  | `No matching dates found in the selected range and weekday filter.` |
| `403`  | `You can only manage availability for your own activities.` |
| `404`  | `Activity not found.` |

---

### 6. Update availability record

```
PATCH /availability/:id
```

Replaces the time slots of an existing record (found by MongoDB `_id`). Can also toggle `isBlocked`. Use `POST /availability` (upsert) if you don't have the record's `_id`.

**Auth:** Required — record owner (`prestataire`) or `admin`

**URL Parameters**

| Param | Description                    |
|-------|--------------------------------|
| `id`  | Availability record ObjectId   |

**Request Body**

| Field       | Type      | Required                 | Description                                   |
|-------------|-----------|--------------------------|-----------------------------------------------|
| `timeSlots` | object[]  | Yes (unless `isBlocked`) | Replaces all existing slots; min 1 slot       |
| `isBlocked` | boolean   | No                       | Toggle block state; clears slots when `true`  |

**Example — replace slots**
```json
{
  "timeSlots": [
    { "startTime": "10:00", "availableSpots": 8 }
  ]
}
```

**Example — block record**
```json
{ "isBlocked": true }
```

**Response `200`**
```json
{
  "success": true,
  "message": "Availability updated.",
  "data": { /* Updated availability object */ }
}
```

**Error responses**

| Status | Message |
|--------|---------|
| `400`  | `Provide at least one timeSlot, or set isBlocked=true.` |
| `400`  | `Invalid startTime format: "…". Use HH:mm.` |
| `400`  | `Each slot must have at least 1 available spot.` |
| `403`  | `Access denied.` |
| `404`  | `Availability record not found.` |

---

### 7. Delete availability record

```
DELETE /availability/:id
```

Removes an availability record. Fails if any active (`pending` or `confirmed`) bookings exist for this date — cancel them first.

**Auth:** Required — record owner (`prestataire`) or `admin`

**URL Parameters**

| Param | Description                    |
|-------|--------------------------------|
| `id`  | Availability record ObjectId   |

**Response `200`**
```json
{ "success": true, "message": "Availability deleted." }
```

**Error responses**

| Status | Message |
|--------|---------|
| `403`  | `Access denied.` |
| `404`  | `Availability record not found.` |
| `409`  | `Cannot delete: N active booking(s) exist for this date. Cancel them first.` |

---

### Validation rules summary

| Rule                               | Enforced in                       |
|------------------------------------|-----------------------------------|
| `startTime` must match `HH:mm`     | `create`, `update`, `bulk`        |
| `availableSpots` must be ≥ 1       | `create`, `update`, `bulk`        |
| At least one slot (or `isBlocked`) | `create`, `update`, `bulk`        |
| Activity must belong to provider   | `create`, `bulk`                  |
| Date range ≤ 366 days              | `bulk`                            |
| Active bookings block deletion     | `delete`                          |
| `isBlocked=true` blocks bookings   | booking `create` (booking system) |

---

## Bookings

### Create booking

```
POST /bookings
```

**Auth:** Required — `client` or `admin`

**Request Body**

| Field          | Type   | Required | Description                                           |
|----------------|--------|----------|-------------------------------------------------------|
| `activityId`   | string | Yes      | Activity to book (ObjectId)                           |
| `date`         | string | Yes      | Booking date — `YYYY-MM-DD`                           |
| `startTime`    | string | Yes      | Time slot — `HH:mm` (must match a defined slot)       |
| `participants` | number | Yes      | Number of participants (min 1)                        |

**Example**
```json
{
  "activityId": "664abc123...",
  "date": "2026-05-10",
  "startTime": "09:00",
  "participants": 2
}
```

> `userId`, `providerId`, `endTime`, and `totalPrice` are all resolved server-side — do not send them.

**Response `201`**
```json
{
  "success": true,
  "message": "Booking created.",
  "data": {
    "_id": "664bbb...",
    "userId": "664aaa...",
    "activityId": "664abc123...",
    "providerId": "664xyz...",
    "date": "2026-05-10T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "12:00",
    "participants": 2,
    "totalPrice": 700,
    "status": "pending",
    "paymentStatus": "pending"
  }
}
```

---

### List my bookings

```
GET /bookings/me
```

**Auth:** Required — any authenticated user

**Response `200`**
```json
{
  "success": true,
  "data": [ /* Array of booking objects */ ]
}
```

---

### List provider bookings

```
GET /bookings/provider
```

**Auth:** Required — `prestataire` or `admin`

**Response `200`**
```json
{
  "success": true,
  "data": [ /* Array of booking objects for this provider */ ]
}
```

---

### Update booking status

```
PATCH /bookings/:id
```

**Auth:** Required — booking owner, activity provider, or `admin`

**Request Body**

| Field           | Type   | Description                                         |
|-----------------|--------|-----------------------------------------------------|
| `status`        | string | `pending` · `confirmed` · `cancelled`               |
| `paymentStatus` | string | `pending` · `paid` · `refunded`                     |

**Example**
```json
{ "status": "confirmed", "paymentStatus": "paid" }
```

**Response `200`**
```json
{
  "success": true,
  "message": "Booking updated",
  "data": { /* Updated booking object */ }
}
```

---

## Trips

### List trips

```
GET /trips
```

**Auth:** None

**Query Parameters**

| Param      | Type    | Description                                     |
|------------|---------|-------------------------------------------------|
| `region`   | string  | Filter by region (e.g. `Marrakech-Safi`)        |
| `category` | string  | Filter by category (e.g. `Adventure`)           |
| `featured` | boolean | `true` to return only featured trips            |

**Example**
```
GET /trips?region=Marrakech-Safi&category=Adventure
GET /trips?featured=true
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664trip01...",
      "title": "Sahara Desert Camel Trek",
      "description": "Experience the magic of the Sahara...",
      "region": "Drâa-Tafilalet",
      "category": "Adventure",
      "price": 299,
      "duration": "3 days",
      "image": "https://images.unsplash.com/photo-...",
      "featured": true,
      "location": {
        "address": "Merzouga, Drâa-Tafilalet",
        "city": "Merzouga",
        "lat": 31.1,
        "lng": -4.01
      },
      "included": ["Camel ride", "Berber camp accommodation", "All meals", "Guide"],
      "excluded": ["Transport to Merzouga", "Travel insurance"],
      "maxParticipants": 12,
      "rating": { "average": 4.9, "count": 128 },
      "createdAt": "2026-04-17T09:00:00.000Z",
      "updatedAt": "2026-04-17T09:00:00.000Z"
    }
  ]
}
```

---

### Get trip by ID

```
GET /trips/:id
```

**Auth:** None

**Response `200`**
```json
{
  "success": true,
  "data": { /* Trip object */ }
}
```

**Response `404`**
```json
{ "success": false, "message": "Trip not found" }
```

---

### Create trip

```
POST /trips
```

**Auth:** Required — `prestataire` or `admin`

**Request Body**

| Field             | Type     | Required | Description                                        |
|-------------------|----------|----------|----------------------------------------------------|
| `title`           | string   | Yes      | Trip title                                         |
| `description`     | string   | Yes      | Full description                                   |
| `region`          | string   | Yes      | Moroccan region (e.g. `Marrakech-Safi`)            |
| `category`        | string   | Yes      | `City Tour` · `Adventure` · `Cultural` · `Beach`   |
| `price`           | number   | Yes      | Price per person                                   |
| `duration`        | string   | Yes      | Human-readable duration (e.g. `"3 days"`)          |
| `image`           | string   | Yes      | Cover image URL                                    |
| `featured`        | boolean  | No       | Show in homepage featured section (default `false`)|
| `location`        | object   | No       | `{ address, city, lat, lng }`                      |
| `included`        | string[] | No       | What's included in the trip                        |
| `excluded`        | string[] | No       | What's not included                                |
| `maxParticipants` | number   | No       | Maximum group size                                 |
| `rating`          | object   | No       | `{ average, count }` — set manually or via reviews |

**Example**
```json
{
  "title": "Sahara Desert Camel Trek",
  "description": "Experience the magic of the Sahara with a multi-day camel trek through golden dunes.",
  "region": "Drâa-Tafilalet",
  "category": "Adventure",
  "price": 299,
  "duration": "3 days",
  "image": "https://images.unsplash.com/photo-1548813395-dabb7a4e5d2a?w=800",
  "featured": true,
  "location": {
    "address": "Merzouga, Drâa-Tafilalet",
    "city": "Merzouga",
    "lat": 31.1,
    "lng": -4.01
  },
  "included": ["Camel ride", "Berber camp accommodation", "All meals", "Guide"],
  "excluded": ["Transport to Merzouga", "Travel insurance"],
  "maxParticipants": 12
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Trip created",
  "data": { /* Created trip object */ }
}
```

---

### Update trip

```
PATCH /trips/:id
```

**Auth:** Required — owner (`prestataire`) or `admin`

**Request Body** — any subset of the create fields

**Example**
```json
{ "price": 320, "featured": true }
```

**Response `200`**
```json
{
  "success": true,
  "message": "Trip updated",
  "data": { /* Updated trip object */ }
}
```

**Response `403`**
```json
{ "success": false, "message": "Access denied" }
```

---

### Delete trip

```
DELETE /trips/:id
```

**Auth:** Required — owner (`prestataire`) or `admin`

**Response `200`**
```json
{ "success": true, "message": "Trip deleted" }
```

---

## Error Responses

All errors follow a consistent shape:

```json
{ "success": false, "message": "Human-readable error message" }
```

| Status | Meaning                                                    |
|--------|------------------------------------------------------------|
| `400`  | Bad request — missing or invalid fields                    |
| `401`  | Unauthorized — missing or invalid token                    |
| `403`  | Forbidden — authenticated but insufficient permissions     |
| `404`  | Not found — resource does not exist                        |
| `500`  | Internal server error                                      |

---

## Roles & Permissions Summary

| Role           | Can do                                                                      |
|----------------|-----------------------------------------------------------------------------|
| `client`       | Register, login, browse activities/trips, create bookings, view own bookings |
| `prestataire`  | All client actions + create/update/delete own activities and trips, view received bookings |
| `admin`        | Full access to all resources                                                |
