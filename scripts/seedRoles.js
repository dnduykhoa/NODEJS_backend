require('dotenv').config();
const mongoose = require('mongoose');
const roleModel = require('../schemas/roles');

async function run() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('Missing MONGODB_URI in .env');
    }

    await mongoose.connect(mongoUri);

    const rolesToEnsure = [
        { name: 'ADMIN', description: 'Admin role' },
        { name: 'MODERATOR', description: 'Moderator role' },
        { name: 'USER', description: 'User role' }
    ];

    for (let i = 0; i < rolesToEnsure.length; i += 1) {
        const role = rolesToEnsure[i];
        const existing = await roleModel.findOne({ name: role.name, isDeleted: false });
        if (!existing) {
            await roleModel.create(role);
        }
    }

    const roles = await roleModel.find({ isDeleted: false }).sort({ name: 1 });
    console.log('Roles in database:');
    roles.forEach(function(role) {
        console.log('- ' + role.name + ': ' + role._id);
    });

    await mongoose.disconnect();
}

run().catch(function(error) {
    console.error(error);
    process.exit(1);
});
