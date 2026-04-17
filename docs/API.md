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

### List availability

```
GET /availability
```

**Auth:** None

**Query Parameters**

| Param        | Type   | Description                            |
|--------------|--------|----------------------------------------|
| `activityId` | string | Filter by activity (ObjectId)          |
| `date`       | string | Filter by date — format `YYYY-MM-DD`   |

**Example**
```
GET /availability?activityId=664abc123&date=2026-05-01
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664def...",
      "activityId": "664abc123...",
      "date": "2026-05-01",
      "timeSlots": [
        { "startTime": "09:00", "endTime": "11:00", "availableSpots": 8 },
        { "startTime": "14:00", "endTime": "16:00", "availableSpots": 10 }
      ]
    }
  ]
}
```

---

### Create availability

```
POST /availability
```

**Auth:** Required — `prestataire` or `admin`

**Request Body**

| Field        | Type     | Required | Description                          |
|--------------|----------|----------|--------------------------------------|
| `activityId` | string   | Yes      | Target activity ObjectId             |
| `date`       | string   | Yes      | Date in `YYYY-MM-DD` format          |
| `timeSlots`  | object[] | Yes      | Array of `{ startTime, endTime, availableSpots }` |

**Example**
```json
{
  "activityId": "664abc123...",
  "date": "2026-05-01",
  "timeSlots": [
    { "startTime": "09:00", "endTime": "11:00", "availableSpots": 8 },
    { "startTime": "14:00", "endTime": "16:00", "availableSpots": 10 }
  ]
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Availability created",
  "data": { /* Availability object */ }
}
```

---

## Bookings

### Create booking

```
POST /bookings
```

**Auth:** Required — `client` or `admin`

**Request Body**

| Field         | Type   | Required | Description                              |
|---------------|--------|----------|------------------------------------------|
| `activityId`  | string | Yes      | Activity to book (ObjectId)              |
| `providerId`  | string | Yes      | Provider of the activity (ObjectId)      |
| `date`        | string | Yes      | Booking date — `YYYY-MM-DD`              |
| `time`        | string | Yes      | Booking time slot — `HH:MM`              |
| `participants`| number | Yes      | Number of participants                   |
| `totalPrice`  | number | Yes      | Total calculated price                   |

**Example**
```json
{
  "activityId": "664abc123...",
  "providerId": "664xyz...",
  "date": "2026-05-01",
  "time": "09:00",
  "participants": 2,
  "totalPrice": 500
}
```

> `userId` defaults to the authenticated user — no need to send it.

**Response `201`**
```json
{
  "success": true,
  "message": "Booking created",
  "data": {
    "_id": "664bbb...",
    "userId": "664aaa...",
    "activityId": "664abc123...",
    "providerId": "664xyz...",
    "date": "2026-05-01",
    "time": "09:00",
    "participants": 2,
    "totalPrice": 500,
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
