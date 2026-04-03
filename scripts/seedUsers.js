require('dotenv').config();
const mongoose = require('mongoose');
const userModel = require('../schemas/users');
const roleModel = require('../schemas/roles');

async function run() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('Missing MONGODB_URI in .env');
    }

    await mongoose.connect(mongoUri);

    // Get role IDs
    const adminRole = await roleModel.findOne({ name: 'ADMIN', isDeleted: false });
    const userRole = await roleModel.findOne({ name: 'USER', isDeleted: false });

    if (!adminRole || !userRole) {
        throw new Error('Admin or User role not found. Please run seed:roles first');
    }

    async function upsertSeedUser(filter, payload, createdMessage, updatedMessage) {
        const existing = await userModel.findOne(filter);

        if (!existing) {
            await userModel.create(payload);
            console.log(createdMessage);
            return;
        }

        existing.password = payload.password;
        existing.email = payload.email;
        existing.fullName = payload.fullName;
        existing.birthday = payload.birthday;
        existing.avatarUrl = payload.avatarUrl;
        existing.status = payload.status;
        existing.role = payload.role;
        existing.loginCount = payload.loginCount;
        existing.isDeleted = false;
        await existing.save();
        console.log(updatedMessage);
    }

    // Create admin user
    await upsertSeedUser(
        { username: 'admin' },
        {
            username: 'admin',
            password: 'Admin@123',
            email: 'admin@gmail.com',
            fullName: 'Admin User',
            birthday: new Date('1990-01-01'),
            avatarUrl: 'https://i.sstatic.net/l60Hf.png',
            status: true,
            role: adminRole._id,
            loginCount: 0
        },
        '✓ Created admin user',
        '✓ Updated admin user credentials'
    );

    // Create regular user
    await upsertSeedUser(
        { username: 'user' },
        {
            username: 'user',
            password: 'User@123',
            email: 'user@gmail.com',
            fullName: 'Regular User',
            birthday: new Date('1995-05-15'),
            avatarUrl: 'https://i.sstatic.net/l60Hf.png',
            status: true,
            role: userRole._id,
            loginCount: 0
        },
        '✓ Created regular user',
        '✓ Updated regular user credentials'
    );

    const users = await userModel.find({ isDeleted: false }).populate('role').sort({ username: 1 });
    console.log('\nUsers in database:');
    users.forEach(function(user) {
        console.log('- ' + user.username + ' (' + user.role.name + '): ' + user._id);
    });

    await mongoose.disconnect();
}

run().catch(function(error) {
    console.error(error);
    process.exit(1);
});
