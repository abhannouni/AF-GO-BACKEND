# Seed Data Structure

This document describes the test data inserted by `npm run seed`. It covers entity relationships, record counts, edge cases, and example records for each collection.

---

## Overview

| Collection     | Records | Notes                                              |
| -------------- | ------- | -------------------------------------------------- |
| Users          | 11      | 1 admin, 4 prestataires, 6 clients                 |
| Activities     | 12      | 3 per prestataire, spread across 5 Moroccan cities |
| Availabilities | 36      | 3 availability dates × 1–3 time slots per activity |
| Bookings       | 15      | Covering confirmed, pending, and cancelled states  |

---

## How to Run

```bash
# Make sure your .env file has MONGODB_URI set
npm run seed
```

The script clears all four collections before inserting fresh data. It is safe to re-run at any time.

After seeding, a `seeders/seed-data.json` file is generated containing the actual MongoDB `_id` values of every inserted record.

---

## Entity Relationships

```
User (prestataire)
 └── Activity (providerId → User._id)
       └── Availability (activityId → Activity._id)
       └── Booking (activityId → Activity._id)
             ├── userId     → User._id  (client)
             └── providerId → User._id  (prestataire, denormalised)
```

---

## Users

All passwords in the source data files are plain text; they are hashed via bcrypt (cost 12) by the User model's `pre('save')` hook before storage.

### Credentials table

| Key        | Username        | Email                      | Password        | Role          |
| ---------- | --------------- | -------------------------- | --------------- | ------------- |
| admin      | admin           | admin@afgo.dev             | Admin@1234      | admin         |
| provider1  | jean_dupont     | jean.dupont@afgo.dev       | Provider@1234   | prestataire   |
| provider2  | marie_martin    | marie.martin@afgo.dev      | Provider@1234   | prestataire   |
| provider3  | pierre_leblanc  | pierre.leblanc@afgo.dev    | Provider@1234   | prestataire   |
| provider4  | sophie_bernard  | sophie.bernard@afgo.dev    | Provider@1234   | prestataire   |
| client1    | alice_moreau    | alice.moreau@afgo.dev      | Client@1234     | client        |
| client2    | thomas_laurent  | thomas.laurent@afgo.dev    | Client@1234     | client        |
| client3    | emma_petit      | emma.petit@afgo.dev        | Client@1234     | client        |
| client4    | lucas_simon     | lucas.simon@afgo.dev       | Client@1234     | client        |
| client5    | chloe_garcia    | chloe.garcia@afgo.dev      | Client@1234     | client        |
| client6    | noah_leroy      | noah.leroy@afgo.dev        | Client@1234     | client        |

> **Edge case:** `noah_leroy` (client6) has no bookings, testing UI/API behavior for clients with an empty booking history.

---

## Activities

Activities are distributed across 5 Moroccan cities. Each `providerId` references the prestataire who owns the activity. Prices are in Moroccan Dirhams (MAD).

| Key    | Title                               | City         | Category     | Price (MAD) | Duration (h) | Provider     |
| ------ | ----------------------------------- | ------------ | ------------ | ----------- | ------------ | ------------ |
| act1   | Marrakech Medina Walking Tour       | Marrakech    | Sightseeing  | 350         | 3            | jean_dupont  |
| act2   | Hot Air Balloon Over Marrakech      | Marrakech    | Adventure    | 1200        | 4            | jean_dupont  |
| act3   | Moroccan Cooking Class in Marrakech | Marrakech    | Cooking      | 550         | 5            | jean_dupont  |
| act4   | Fes Medina Historical Tour          | Fes          | Sightseeing  | 380         | 4            | marie_martin |
| act5   | Traditional Hammam & Spa Experience | Fes          | Wellness     | 450         | 4            | marie_martin |
| act6   | Fes Pottery & Ceramics Workshop     | Fes          | Arts & Crafts| 320         | 3            | marie_martin |
| act7   | Surfing Lessons in Taghazout        | Agadir       | Water Sports | 280         | 3            | pierre_leblanc |
| act8   | Atlas Mountains Hiking Adventure    | Agadir       | Hiking       | 420         | 8            | pierre_leblanc |
| act9   | Paradise Valley Canyoning & Swimming| Agadir       | Adventure    | 380         | 5            | pierre_leblanc |
| act10  | Sahara Desert Camel Trek & Camp     | Merzouga     | Adventure    | 650         | 18           | sophie_bernard |
| act11  | Chefchaouen Blue Pearl Photography Tour | Chefchaouen | Photography | 420     | 4            | sophie_bernard |
| act12  | Sandboarding in Merzouga Dunes      | Merzouga     | Adventure    | 220         | 2            | sophie_bernard |

> **Edge case:** `act11` (Chefchaouen Blue Pearl Photography Tour) has **no bookings**, testing UI/API behavior for activities with zero bookings.

### Example activity record (as stored in MongoDB)

```json
{
  "_id": "<ObjectId>",
  "title": "Marrakech Medina Walking Tour",
  "description": "Explore the heart of Marrakech with an expert local guide. Wander through the bustling souks…",
  "city": "Marrakech",
  "category": "Sightseeing",
  "price": 350,
  "duration": 3,
  "images": [
    "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800&h=600&fit=crop"
  ],
  "providerId": "<ObjectId of jean_dupont>",
  "location": {
    "address": "Jemaa el-Fnaa, Medina, Marrakech 40000",
    "lat": 31.6259,
    "lng": -7.9893
  },
  "included": ["Professional local guide (Arabic/French/English)", "Medina entrance fees", "Traditional mint tea break"],
  "excluded": ["Personal purchases in souks", "Lunch", "Transportation to meeting point"],
  "maxParticipants": 15,
  "rating": { "average": 0, "count": 0 },
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

---

## Availabilities

Each activity has 3 upcoming availability dates (May 2026), each with 1–3 time slots.

### Example availability record

```json
{
  "_id": "<ObjectId>",
  "activityId": "<ObjectId of act1>",
  "date": "2026-05-05T00:00:00.000Z",
  "timeSlots": [
    { "startTime": "09:00", "endTime": "11:00", "availableSpots": 15 },
    { "startTime": "14:00", "endTime": "16:00", "availableSpots": 12 }
  ],
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

---

## Bookings

### Booking matrix

| Key        | Client          | Activity                            | Date       | Time  | Participants | Total (MAD) | Status      | Payment   |
| ---------- | --------------- | ----------------------------------- | ---------- | ----- | ------------ | ----------- | ----------- | --------- |
| booking1   | alice_moreau    | Marrakech Medina Walking Tour       | 2026-05-05 | 09:00 | 2            | 700         | confirmed   | paid      |
| booking2   | alice_moreau    | Fes Medina Historical Tour          | 2026-05-08 | 09:00 | 1            | 380         | confirmed   | paid      |
| booking3   | alice_moreau    | Surfing Lessons in Taghazout        | 2026-05-11 | 09:00 | 3            | 840         | pending     | pending   |
| booking4   | thomas_laurent  | Hot Air Balloon Over Marrakech      | 2026-05-06 | 05:30 | 2            | 2400        | confirmed   | paid      |
| booking5   | thomas_laurent  | Traditional Hammam & Spa Experience | 2026-05-09 | 10:00 | 1            | 450         | confirmed   | paid      |
| booking6   | thomas_laurent  | Sahara Desert Camel Trek & Camp     | 2026-05-07 | 16:00 | 2            | 1300        | cancelled   | refunded  |
| booking7   | emma_petit      | Moroccan Cooking Class in Marrakech | 2026-05-07 | 09:00 | 1            | 550         | confirmed   | paid      |
| booking8   | emma_petit      | Atlas Mountains Hiking Adventure    | 2026-05-05 | 07:00 | 2            | 840         | confirmed   | paid      |
| booking9   | lucas_simon     | Fes Pottery & Ceramics Workshop     | 2026-05-10 | 10:00 | 4            | 1280        | confirmed   | paid      |
| booking10  | lucas_simon     | Paradise Valley Canyoning & Swimming| 2026-05-06 | 08:30 | 2            | 760         | confirmed   | paid      |
| booking11  | chloe_garcia    | Marrakech Medina Walking Tour       | 2026-05-12 | 14:00 | 1            | 350         | confirmed   | paid      |
| booking12  | chloe_garcia    | Sandboarding in Merzouga Dunes      | 2026-05-09 | 16:00 | 2            | 440         | pending     | pending   |
| booking13  | alice_moreau    | Moroccan Cooking Class in Marrakech | 2026-05-14 | 10:00 | 1            | 550         | confirmed   | paid      |
| booking14  | thomas_laurent  | Fes Medina Historical Tour          | 2026-05-22 | 09:00 | 3            | 1140        | pending     | pending   |
| booking15  | emma_petit      | Sandboarding in Merzouga Dunes      | 2026-05-16 | 09:00 | 2            | 440         | confirmed   | paid      |

### Example booking record (as stored in MongoDB)

```json
{
  "_id": "<ObjectId>",
  "userId": "<ObjectId of alice_moreau>",
  "activityId": "<ObjectId of act1>",
  "providerId": "<ObjectId of jean_dupont>",
  "date": "2026-05-05T00:00:00.000Z",
  "time": "09:00",
  "participants": 2,
  "totalPrice": 700,
  "status": "confirmed",
  "paymentStatus": "paid",
  "createdAt": "<ISO timestamp>"
}
```

---

## Edge Cases Covered

| Scenario                              | Detail                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Client with no bookings               | `noah_leroy` (client6) has zero bookings                                      |
| Activity with no bookings             | `act11` — Chefchaouen Blue Pearl Photography Tour                             |
| Cancelled booking with refund         | `booking6` — thomas_laurent / Sahara Desert Camel Trek & Camp (cancelled/refunded)|
| Pending booking (no payment yet)      | `booking3`, `booking12`, `booking14`                                          |
| Multiple bookings per client          | `alice_moreau` has 3 bookings across different Moroccan cities and categories |
| Multiple bookings for same activity   | `act1` has 2 bookings (alice + chloe); `act3` has 2 bookings (alice + emma); `act4` has 2 bookings (alice + thomas); `act12` has 2 bookings (chloe + emma) |
| Multiple activities per prestataire   | Each of the 4 prestataires owns exactly 3 activities                          |
| Prestataire with a cancelled booking  | Bookings on `sophie_bernard`'s act10 include a cancellation                   |

---

## File Structure

```
seeders/
├── index.js              ← Seeder entry point (run with: npm run seed)
├── seed-data.json        ← Auto-generated after seeding; contains real _id values
└── data/
    ├── users.json        ← Raw user seed data (11 records)
    ├── activities.json   ← Raw activity + availability seed data (12 records)
    └── bookings.json     ← Raw booking seed data (15 records)
```

---

## Re-running the Seeder

The seeder is **idempotent**: it deletes all documents from `users`, `activities`, `availabilities`, and `bookings` before inserting fresh data. Re-running it at any time is safe and will reset the database to the baseline seed state.

```bash
npm run seed
```
