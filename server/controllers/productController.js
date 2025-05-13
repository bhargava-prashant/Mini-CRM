const Product = require('../models/Product');

exports.seedProducts = async (req, res) => {
  const sample = Array.from({ length: 20 }, (_, i) => ({
    name: `Product ${i + 1}`,
    price: Math.floor(Math.random() * 1000 + 100),
  }));
  await Product.deleteMany();
  await Product.insertMany(sample);
  res.json({ message: 'Seeded products' });
};

exports.getProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};