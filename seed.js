const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./configs/db');
const Trip = require('./models/Trip');

const trips = [
    {
        title: 'Sahara Desert Camel Trek',
        description: 'Experience the magic of the Sahara with a multi-day camel trek through golden dunes, sleeping under the stars in luxury Berber camps in Merzouga.',
        region: 'Drâa-Tafilalet',
        category: 'Adventure',
        price: 299,
        duration: '3 days',
        image: 'https://images.unsplash.com/photo-1548813395-dabb7a4e5d2a?w=800&q=80',
        featured: true,
        location: { address: 'Merzouga, Drâa-Tafilalet', city: 'Merzouga', lat: 31.1, lng: -4.01 },
        included: ['Camel ride', 'Berber camp accommodation', 'All meals', 'Guide'],
        excluded: ['Transport to Merzouga', 'Travel insurance'],
        maxParticipants: 12,
        rating: { average: 4.9, count: 128 },
    },
    {
        title: 'Marrakech Medina Walking Tour',
        description: 'Wander through the labyrinthine souks, historic palaces, and vibrant Jemaa el-Fna square with an expert local guide revealing centuries of history.',
        region: 'Marrakech-Safi',
        category: 'City Tour',
        price: 45,
        duration: '4 hours',
        image: 'https://images.unsplash.com/photo-1553832012-82b5d1d62b63?w=800&q=80',
        featured: true,
        location: { address: 'Jemaa el-Fna, Marrakech', city: 'Marrakech', lat: 31.6258, lng: -7.9892 },
        included: ['English-speaking guide', 'Entry fees', 'Traditional mint tea'],
        excluded: ['Lunch', 'Personal shopping'],
        maxParticipants: 15,
        rating: { average: 4.7, count: 245 },
    },
    {
        title: 'Fès Pottery & Craft Workshop',
        description: 'Immerse yourself in Fès artisanal culture — visit the iconic tanneries, learn hand-painted zellige tilework, and explore the oldest university in the world.',
        region: 'Fès-Meknès',
        category: 'Cultural',
        price: 89,
        duration: '1 day',
        image: 'https://images.unsplash.com/photo-1539020140153-e479b8f22986?w=800&q=80',
        featured: true,
        location: { address: 'Fès el-Bali Medina, Fès', city: 'Fès', lat: 34.0539, lng: -4.9998 },
        included: ['Workshop materials', 'Local guide', 'Traditional lunch'],
        excluded: ['Transport', 'Souvenirs'],
        maxParticipants: 10,
        rating: { average: 4.8, count: 92 },
    },
    {
        title: 'Essaouira Coastal Escape',
        description: 'Discover the wind-swept ramparts, vibrant blue fishing boats, and bohemian art scene of Essaouira — Morocco\'s most charming Atlantic port city.',
        region: 'Marrakech-Safi',
        category: 'Beach',
        price: 120,
        duration: '2 days',
        image: 'https://images.unsplash.com/photo-1565118531796-763e5082d113?w=800&q=80',
        featured: false,
        location: { address: 'Essaouira Medina, Essaouira', city: 'Essaouira', lat: 31.5085, lng: -9.7595 },
        included: ['Riad accommodation', 'Breakfast', 'Guided medina walk'],
        excluded: ['Dinner', 'Watersport rentals'],
        maxParticipants: 20,
        rating: { average: 4.6, count: 74 },
    },
    {
        title: 'Chefchaouen Blue City Day Trip',
        description: 'Explore the legendary "Blue Pearl" — steep blue-washed streets, cascading bougainvillea, and the relaxed mountain atmosphere of Chefchaouen.',
        region: 'Tanger-Tétouan',
        category: 'City Tour',
        price: 65,
        duration: '1 day',
        image: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=800&q=80',
        featured: true,
        location: { address: 'Chefchaouen Medina, Chefchaouen', city: 'Chefchaouen', lat: 35.1688, lng: -5.2636 },
        included: ['Transport from Tétouan', 'Local guide', 'Hiking trail access'],
        excluded: ['Meals', 'Personal purchases'],
        maxParticipants: 18,
        rating: { average: 4.8, count: 189 },
    },
    {
        title: 'Toubkal Summit Trek',
        description: 'Conquer North Africa\'s highest peak at 4,167m. A challenging 2-day ascent of Jebel Toubkal through Berber villages and stunning High Atlas scenery.',
        region: 'Marrakech-Safi',
        category: 'Adventure',
        price: 220,
        duration: '2 days',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
        featured: false,
        location: { address: 'Toubkal National Park, Imlil', city: 'Imlil', lat: 31.1, lng: -7.92 },
        included: ['Mountain guide', 'Refuge accommodation', 'All meals on trail'],
        excluded: ['Trekking gear', 'Travel insurance'],
        maxParticipants: 8,
        rating: { average: 4.7, count: 56 },
    },
    {
        title: 'Dades & Todra Gorges Road Trip',
        description: 'Journey through the dramatic rose-red walls of Dades Gorge and towering 300m cliffs of Todra Gorge — one of Morocco\'s most spectacular road trip routes.',
        region: 'Drâa-Tafilalet',
        category: 'Adventure',
        price: 175,
        duration: '2 days',
        image: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&q=80',
        featured: false,
        location: { address: 'Dades Valley, Boumalne Dadès', city: 'Boumalne Dadès', lat: 31.375, lng: -5.99 },
        included: ['4x4 transport', 'Driver/guide', 'Kasbah accommodation', 'Breakfast'],
        excluded: ['Lunch & dinner', 'Fuel surcharges'],
        maxParticipants: 6,
        rating: { average: 4.6, count: 43 },
    },
    {
        title: 'Tangier History & Culture Tour',
        description: 'Uncover the mysterious legacy of Tangier — the Kasbah, Grand Socco, American Legation, and the cafe where the Beat Generation once gathered.',
        region: 'Tanger-Tétouan',
        category: 'Cultural',
        price: 55,
        duration: '5 hours',
        image: 'https://images.unsplash.com/photo-1539020140153-e479b8f22986?w=800&q=80',
        featured: false,
        location: { address: 'Tangier Medina, Tangier', city: 'Tangier', lat: 35.7721, lng: -5.8099 },
        included: ['Expert local guide', 'Museum entries', 'Traditional pastilla lunch'],
        excluded: ['Shopping', 'Personal transport'],
        maxParticipants: 14,
        rating: { average: 4.5, count: 61 },
    },
];

const seed = async () => {
    await connectDB();
    await Trip.deleteMany({});
    const created = await Trip.insertMany(trips);
    console.log(`✅ Seeded ${created.length} trips successfully.`);
    process.exit(0);
};

seed().catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
