
// const User = require('../models/User');
// const Product = require('../models/Product');
// const Order = require('../models/Order');  // Assuming you have this model
// const { v4: uuidv4 } = require('uuid');
// const client = require('../config/redis');

// // Fetch the product price for a given product ID
// async function getProductPrice(productId) {
//   try {
//     const product = await Product.findById(productId);
//     if (!product) {
//       throw new Error('Product not found');
//     }
//     return product.price;
//   } catch (error) {
//     console.error('Error getting product price:', error);
//     throw error;
//   }
// }

// // Validate product quantities and enrich with prices
// async function validateAndEnrichProducts(products) {
//   const enrichedProducts = [];
  
//   for (const product of products) {
//     // Validate productId
//     if (!product.productId || typeof product.productId !== 'string') {
//       throw new Error('Invalid product ID');
//     }

//     // Validate and normalize quantity
//     const quantity = parseInt(product.quantity, 10);
//     if (isNaN(quantity) || quantity <= 0) {
//       throw new Error(`Invalid quantity for product ${product.productId}`);
//     }

//     // Fetch product price
//     const price = await getProductPrice(product.productId);
    
//     enrichedProducts.push({
//       productId: product.productId,
//       quantity: quantity,
//       price: price
//     });
//   }

//   return enrichedProducts;
// }
// exports.placeOrder = async (req, res) => {
//   try {
//     const { customerId, products } = req.body;

//     // Input validation
//     if (!customerId) {
//       return res.status(400).json({ error: 'Customer ID is required' });
//     }

//     if (!Array.isArray(products) || products.length === 0) {
//       return res.status(400).json({ error: 'Product list must be a non-empty array' });
//     }

//     // Validate and enrich product data
//     const enrichedProducts = await validateAndEnrichProducts(products);

//     // Calculate total order amount
//     const totalAmount = enrichedProducts.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );

//     // Generate unique order reference
//     const orderReference = uuidv4();

//     // Prepare message for Redis stream
//     const messageData = [
//       'customerId', JSON.stringify(customerId),
//       'products', JSON.stringify(enrichedProducts),
//       'totalAmount', JSON.stringify(totalAmount),
//       'orderReference', orderReference,
//       'timestamp', Date.now().toString()
//     ];

//     // Retry mechanism for Redis stream insertion
//     const maxRetries = 3;
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//       try {
//         await client.xAdd('order_stream', '*', messageData);
//         break; // Success
//       } catch (err) {
//         console.error(`❌ Redis xAdd attempt ${attempt} failed:`, err);

//         if (attempt === maxRetries) {
//           throw new Error('Failed to add order to Redis stream after multiple attempts');
//         }

//         // Wait using exponential backoff
//         await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
//       }
//     }

//     // Update customer stats
//     const user = await User.findById(customerId);
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     user.orderCount = (user.orderCount || 0) + 1;
//     user.totalSpent = (user.totalSpent || 0) + totalAmount;

//     if (!user.firstPurchaseDate) {
//       user.firstPurchaseDate = new Date();
//     }

//     await user.save();

//     // Save order in the DB
//     const newOrder = new Order({
//       customerId: user._id,
//       products: enrichedProducts,
//       totalAmount,
//       orderReference,
//       status: 'PENDING',
//       createdAt: new Date()
//     });

//     await newOrder.save();

//     return res.status(201).json({
//       message: 'Order received and queued for processing',
//       orderReference
//     });

//   } catch (error) {
//     console.error('❌ Order placement error:', error);

//     if (error.message.includes('Product not found')) {
//       return res.status(404).json({ error: 'One or more products not found' });
//     }

//     if (error.message.toLowerCase().includes('invalid')) {
//       return res.status(400).json({ error: error.message });
//     }

//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// // Optional: Add an endpoint to check order status
// exports.checkOrderStatus = async (req, res) => {
//   try {
//     const { orderReference } = req.params;

//     if (!orderReference) {
//       return res.status(400).json({ error: 'Order reference is required' });
//     }

//     // Find the order by reference
//     const order = await Order.findOne({ 
//       orderReference: orderReference,
//       // Optionally, filter by customerId if you want to ensure the order belongs to the current user
//       // customerId: req.user._id 
//     });

//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     res.json({ 
//       orderReference: order.orderReference,
//       status: order.status,
//       totalAmount: order.totalAmount,
//       createdAt: order.createdAt,
//       products: order.products
//     });
//   } catch (error) {
//     console.error('❌ Order status check error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// Updated Order Controller with Fixed Tracking
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

    // Retry mechanism for Redis stream insertion (outside transaction as it's a different system)
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await client.xAdd('order_stream', '*', messageData);
        break; // Success
      } catch (err) {
        console.error(`❌ Redis xAdd attempt ${attempt} failed:`, err);

        if (attempt === maxRetries) {
          throw new Error('Failed to add order to Redis stream after multiple attempts');
        }

        // Wait using exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
      }
    }

    return res.status(201).json({
      message: 'Order received and queued for processing',
      orderReference
    });

  } catch (error) {
    console.error('❌ Order placement error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Optional: Add an endpoint to check order status
exports.checkOrderStatus = async (req, res) => {
  try {
    const { orderReference } = req.params;

    if (!orderReference) {
      return res.status(400).json({ error: 'Order reference is required' });
    }

    // Find the order by reference
    const order = await Order.findOne({ 
      orderReference: orderReference,
      // Optionally, filter by customerId if you want to ensure the order belongs to the current user
      // customerId: req.user._id 
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

// Comprehensive Order Placement Controller
// const mongoose = require('mongoose');
// const User = require('../models/User');
// const Product = require('../models/Product');
// const { v4: uuidv4 } = require('uuid');
// const client = require('../config/redis');
// const OrderService = require('../streamConsumer');

// // Controller to handle HTTP request for placing an order
// exports.placeOrder = async (req, res) => {
//   try {
//     const { customerId, products } = req.body;

//     // Input validation
//     if (!customerId || !Array.isArray(products) || products.length === 0) {
//       return res.status(400).json({ error: 'Invalid input data' });
//     }

//     // Validate and enrich product data in a single batch operation
//     const enrichedProducts = await OrderService.validateAndEnrichProducts(products);

//     // Calculate total order amount
//     const totalAmount = enrichedProducts.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );

//     // Generate unique order reference
//     const orderReference = uuidv4();

//     // Prepare the Redis stream message
//     const messageData = [
//       'customerId', customerId,
//       'orderReference', orderReference,
//       'products', JSON.stringify(enrichedProducts),
//       'totalAmount', totalAmount.toString(),
//       'timestamp', Date.now().toString()
//     ];

//     // Add to Redis stream (no transaction or MongoDB saving)
//     await OrderService.addToOrderStream(messageData);

//     return res.status(201).json({
//       message: 'Order placed successfully',
//       orderReference,
//       totalAmount
//     });

//   } catch (error) {
//     console.error('❌ Order placement HTTP error:', error);
    
//     // Map error to appropriate HTTP status
//     if (error.message.includes('not found')) {
//       return res.status(404).json({ error: error.message });
//     }
    
//     if (error.message.includes('invalid')) {
//       return res.status(400).json({ error: error.message });
//     }
    
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// // Existing status check method (no change needed)
// exports.checkOrderStatus = async (req, res) => {
//   try {
//     const { orderReference } = req.params;

//     if (!orderReference) {
//       return res.status(400).json({ error: 'Order reference is required' });
//     }

//     const order = await Order.findOne({ orderReference });

//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     res.json({ 
//       orderReference: order.orderReference,
//       status: order.status,
//       totalAmount: order.totalAmount,
//       createdAt: order.createdAt,
//       products: order.products
//     });
//   } catch (error) {
//     console.error('❌ Order status check error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };
