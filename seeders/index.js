'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const connectDB = require('../configs/db');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Availability = require('../models/Availability');
const Booking = require('../models/Booking');

const usersData = require('./data/users.json');
const activitiesData = require('./data/activities.json');
const bookingsData = require('./data/bookings.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
    console.log(msg);
}

// Build a lookup: activityKey → providerKey (for booking inserts)
const activityProviderMap = {};
for (const a of activitiesData) {
    activityProviderMap[a.key] = a.providerKey;
}

// ─── Main seeder ─────────────────────────────────────────────────────────────

async function seed() {
    await connectDB();
    log('\n🌱  Starting database seeding…\n');

    // ── 1. Clear existing collections ──────────────────────────────────────
    await Promise.all([
        User.deleteMany({}),
        Activity.deleteMany({}),
        Availability.deleteMany({}),
        Booking.deleteMany({}),
    ]);
    log('🗑️   Cleared existing collections\n');

    // ── 2. Insert Users ────────────────────────────────────────────────────
    const userIdMap = {}; // key → ObjectId
    const reportUsers = [];

    for (const u of usersData) {
        // The User model's pre-save hook will hash the password automatically
        const user = await User.create({
            username: u.username,
            email: u.email,
            password: u.password,
            role: u.role,
        });

        userIdMap[u.key] = user._id;
        reportUsers.push({
            key: u.key,
            _id: user._id.toString(),
            username: u.username,
            email: u.email,
            role: u.role,
            plainPassword: u.password, // stored in report for dev convenience only
        });
    }
    log(`✅  Inserted ${reportUsers.length} users`);

    // ── 3. Insert Activities ───────────────────────────────────────────────
    const activityIdMap = {}; // key → ObjectId
    const reportActivities = [];
    const availabilityDocs = [];

    for (const a of activitiesData) {
        const activity = await Activity.create({
            title: a.title,
            description: a.description,
            city: a.city,
            category: a.category,
            price: a.price,
            duration: a.duration,
            images: a.images,
            providerId: userIdMap[a.providerKey],
            location: a.location,
            included: a.included,
            excluded: a.excluded,
            maxParticipants: a.maxParticipants,
        });

        activityIdMap[a.key] = activity._id;

        reportActivities.push({
            key: a.key,
            _id: activity._id.toString(),
            title: a.title,
            city: a.city,
            category: a.category,
            price: a.price,
            providerKey: a.providerKey,
            providerId: userIdMap[a.providerKey].toString(),
        });

        // Collect availability documents for this activity
        for (const av of a.availabilities) {
            availabilityDocs.push({
                activityId: activity._id,
                date: new Date(av.date),
                timeSlots: av.timeSlots,
            });
        }
    }
    log(`✅  Inserted ${reportActivities.length} activities`);

    // ── 4. Insert Availabilities ───────────────────────────────────────────
    await Availability.insertMany(availabilityDocs);
    log(`✅  Inserted ${availabilityDocs.length} availability records`);

    // ── 5. Insert Bookings ─────────────────────────────────────────────────
    const bookingDocs = bookingsData.map((b) => ({
        userId: userIdMap[b.userKey],
        activityId: activityIdMap[b.activityKey],
        providerId: userIdMap[activityProviderMap[b.activityKey]],
        date: new Date(b.date),
        time: b.time,
        participants: b.participants,
        totalPrice: b.totalPrice,
        status: b.status,
        paymentStatus: b.paymentStatus,
    }));

    const insertedBookings = await Booking.insertMany(bookingDocs);
    log(`✅  Inserted ${insertedBookings.length} bookings\n`);

    // ── 6. Write seed report ───────────────────────────────────────────────
    const reportBookings = bookingsData.map((b, i) => ({
        key: b.key,
        _id: insertedBookings[i]._id.toString(),
        userKey: b.userKey,
        userId: userIdMap[b.userKey].toString(),
        activityKey: b.activityKey,
        activityId: activityIdMap[b.activityKey].toString(),
        providerKey: activityProviderMap[b.activityKey],
        providerId: userIdMap[activityProviderMap[b.activityKey]].toString(),
        date: b.date,
        time: b.time,
        participants: b.participants,
        totalPrice: b.totalPrice,
        status: b.status,
        paymentStatus: b.paymentStatus,
    }));

    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            users: reportUsers.length,
            activities: reportActivities.length,
            availabilities: availabilityDocs.length,
            bookings: insertedBookings.length,
        },
        users: reportUsers,
        activities: reportActivities,
        bookings: reportBookings,
    };

    const reportPath = path.join(__dirname, 'seed-data.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄  Seed report written to seeders/seed-data.json\n`);
    log('🎉  Seeding complete!\n');

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('\n❌  Seeding failed:', err.message);
    process.exit(1);
});
