
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');
const client = require('../config/redis');
const mongoose = require('mongoose');

// Fetch the product price for a given product ID
async function getProductPrice(productId) {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    return product.price;
  } catch (error) {
    console.error('Error getting product price:', error);
    throw error;
  }
}

// Validate product quantities and enrich with prices
async function validateAndEnrichProducts(products) {
  const enrichedProducts = [];
  
  for (const product of products) {
    // Validate productId
    if (!product.productId || typeof product.productId !== 'string') {
      throw new Error('Invalid product ID');
    }

    // Validate and normalize quantity
    const quantity = parseInt(product.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product ${product.productId}`);
    }

    // Fetch product price
    const price = await getProductPrice(product.productId);
    
    enrichedProducts.push({
      productId: product.productId,
      quantity: quantity,
      price: price
    });
  }

  return enrichedProducts;
}

exports.placeOrder = async (req, res) => {
  try {
    const { customerId, products } = req.body;

    // Input validation
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Product list must be a non-empty array' });
    }

    // Validate and enrich product data
    const enrichedProducts = await validateAndEnrichProducts(products);

    // Calculate total order amount
    const totalAmount = enrichedProducts.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Generate unique order reference
    const orderReference = uuidv4();

    // Prepare message for Redis stream
    const messageData = [
      'customerId', customerId,
      'products', JSON.stringify(enrichedProducts),
      'totalAmount', totalAmount.toString(),
      'orderReference', orderReference,
      'timestamp', Date.now().toString()
    ];

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await client.xAdd('order_stream', '*', messageData);
        break; // Success
      } catch (err) {
        console.error(` Redis xAdd attempt ${attempt} failed:`, err);

        if (attempt === maxRetries) {
          throw new Error('Failed to add order to Redis stream after multiple attempts');
        }

     
        await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
      }
    }

    return res.status(201).json({
      message: 'Order received and queued for processing',
      orderReference
    });

  } catch (error) {
    console.error('Order placement error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.checkOrderStatus = async (req, res) => {
  try {
    const { orderReference } = req.params;

    if (!orderReference) {
      return res.status(400).json({ error: 'Order reference is required' });
    }

    const order = await Order.findOne({ 
      orderReference: orderReference,
      
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ 
      orderReference: order.orderReference,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      products: order.products
    });
  } catch (error) {
    console.error('❌ Order status check error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
