## API Docs (MVP)

Base path: `/api/v1` (or `/api/${API_VERSION}`)

### Health

`GET /api/v1/health`

Response `200`

```json
{
  "success": true,
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-04-14T10:00:00.000Z"
}
```

---

## Auth

Base: `/api/v1/auth`

### Register

`POST /api/v1/auth/register`

Body (example)

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Secret123",
  "role": "client"
}
```

### Login

`POST /api/v1/auth/login`

Body (example)

```json
{
  "identifier": "john@example.com",
  "password": "Secret123"
}
```

Use JWT on protected endpoints:

`Authorization: Bearer <token>`

---

## Activities

Base: `/api/v1/activities`

### List activities (public)

`GET /api/v1/activities?city=...&category=...&providerId=...`

Response `200`

```json
{ "success": true, "data": [] }
```

### Get activity by id (public)

`GET /api/v1/activities/:id`

### Create activity (prestataire/admin)

`POST /api/v1/activities`

Headers:
`Authorization: Bearer <token>`

Body (example)

```json
{
  "title": "Quad ride",
  "description": "Nice activity",
  "city": "Agadir",
  "category": "adventure",
  "price": 250,
  "duration": 2,
  "images": [],
  "location": { "address": "..." }
}
```

Notes:
- If you don’t send `providerId`, it defaults to the logged-in user id.

### Update activity (prestataire/admin, owner/admin)

`PATCH /api/v1/activities/:id`

### Delete activity (prestataire/admin, owner/admin)

`DELETE /api/v1/activities/:id`

---

## Availability

Base: `/api/v1/availability`

### List availability (public)

`GET /api/v1/availability?activityId=...&date=YYYY-MM-DD`

### Create availability (prestataire/admin)

`POST /api/v1/availability`

Headers:
`Authorization: Bearer <token>`

Body (example)

```json
{
  "activityId": "64....",
  "date": "2026-04-20",
  "timeSlots": [
    { "startTime": "10:00", "endTime": "12:00", "availableSpots": 10 }
  ]
}
```

---

## Bookings

Base: `/api/v1/bookings`

### Create booking (client/admin)

`POST /api/v1/bookings`

Headers:
`Authorization: Bearer <token>`

Body (example)

```json
{
  "activityId": "64....",
  "providerId": "64....",
  "date": "2026-04-20",
  "time": "10:00",
  "participants": 2,
  "totalPrice": 500
}
```

Notes:
- If you don’t send `userId`, it defaults to the logged-in user id.

### List my bookings

`GET /api/v1/bookings/me`

Headers:
`Authorization: Bearer <token>`

### List provider bookings (prestataire/admin)

`GET /api/v1/bookings/provider`

Headers:
`Authorization: Bearer <token>`

### Update booking status/payment

`PATCH /api/v1/bookings/:id`

Headers:
`Authorization: Bearer <token>`

Body (example)

```json
{ "status": "confirmed", "paymentStatus": "paid" }
```

