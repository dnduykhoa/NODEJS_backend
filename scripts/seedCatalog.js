require('dotenv').config();
const mongoose = require('mongoose');
const categoryModel = require('../schemas/categories');
const productModel = require('../schemas/products');

async function run() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('Missing MONGODB_URI in .env');
    }

    await mongoose.connect(mongoUri);

    let category = await categoryModel.findOne({ name: 'Default', isDeleted: false });
    if (!category) {
        category = await categoryModel.create({
            name: 'Default',
            description: 'Default category'
        });
    }

    let product = await productModel.findOne({ name: 'Sample Product', isDeleted: false });
    if (!product) {
        product = await productModel.create({
            name: 'Sample Product',
            price: 120000,
            category: category._id,
            sku: 'SAMPLE-001',
            description: 'San pham mau',
            shortDescription: 'Mau',
            images: [],
            material: 'Ceramic',
            color: 'White',
            dimensions: '10x10',
            weightInGram: 500,
            discountPercent: 0,
            status: true
        });
    }

    console.log('Seed category id:', category._id.toString());
    console.log('Seed product id:', product._id.toString());

    await mongoose.disconnect();
}

run().catch(function(error) {
    console.error(error);
    process.exit(1);
});
