require("dotenv").config();

const redis = require("redis");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Order = require("./models/Order");
const Product = require("./models/Product"); 
const User = require("./models/User");

function safeJSONParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`JSON parsing error for value: ${value}`, error);
    return fallback;
  }
}

function normalizeNumeric(value, defaultValue = 0) {
  if (value == null) return defaultValue;

  // Handle different numeric representations
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  return value;
}

async function startConsumer() {
  const redisClient = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err) => console.error("❌ Redis Client Error", err));
  await redisClient.connect();
  console.log("🔌 Redis connected");

  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/mini_crm"
    );
    console.log("🛢 MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }

  try {
    await redisClient.xGroupCreate(
      "order_stream",
      "order_consumer_group",
      "0",
      {
        MKSTREAM: true,
      }
    );
    console.log("✅ Consumer group created");
  } catch (err) {
   
    if (!err.message.includes("BUSYGROUP")) {
      console.error("⚠️ Consumer group error:", err.message);
    } else {
      console.log("✅ Using existing consumer group");
    }
  }

  while (true) {
    try {
      // Read from the Redis stream as part of a consumer group
      const results = await redisClient.xReadGroup(
        "order_consumer_group", 
        "consumer1", 
        [
          
          {
            key: "order_stream",
            id: ">", 
          },
        ],
        {
          COUNT: 1, 
          BLOCK: 0,
        }
      );

      if (!results || results.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const [stream] = results;
      if (!stream.messages || stream.messages.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const [msg] = stream.messages;
      const { id, message: fields } = msg;

      
      const parsedFields = {};
      const fieldKeys = Object.keys(fields);

      for (let i = 0; i < fieldKeys.length; i += 2) {
        const key = fields[fieldKeys[i]];
        const value = fields[fieldKeys[i + 1]];
        parsedFields[key] = value;
      }

      console.log("📦 Parsed Fields:", parsedFields);

      // Validate and parse essential fields
      const customerId = parsedFields.customerId;
      const products = safeJSONParse(parsedFields.products, []);
      const totalAmount = normalizeNumeric(
        safeJSONParse(parsedFields.totalAmount),
        0
      );
      const orderReference = parsedFields.orderReference || `order_${uuidv4()}`;
      const timestamp = parsedFields.timestamp
        ? new Date(parseInt(parsedFields.timestamp))
        : new Date();

      // Validate essential fields
      if (!customerId || products.length === 0) {
        console.error("❌ Missing required fields in message:", parsedFields);
        await redisClient.xAck("order_stream", "order_consumer_group", id);
        continue;
      }

      // Fetch user to update orderCount and totalSpent
      const user = await User.findById(customerId);
      if (!user) {
        console.error("❌ User not found for customerId:", customerId);
        await redisClient.xAck("order_stream", "order_consumer_group", id);
        continue;
      }

      // Update user stats
      const currentDate = new Date();

      // Update user statistics
      user.orderCount = (user.orderCount || 0) + 1;
      user.totalSpent = (user.totalSpent || 0) + totalAmount;
      user.totalOrderValue = (user.totalOrderValue || 0) + totalAmount;
      user.lastOrdered = currentDate;
      user.lastActive = currentDate;
      user.orderCreated = currentDate;

      // Set firstPurchaseDate if this is the first order
      if (!user.firstPurchaseDate) {
        user.firstPurchaseDate = currentDate;
      }

      user.orderHistory.push({
        orderId: new mongoose.Types.ObjectId(), 
        amount: totalAmount,
        date: currentDate,
        items: products.map((p) => p.productId),
      });

      await user.save();

     

      const productDetails = await Promise.all(
        products.map(async (p) => {
          const product = await Product.findById(p.productId).select("price");
          return {
            productId: new mongoose.Types.ObjectId(p.productId),
            quantity: normalizeNumeric(p.quantity, 1),
            price: product ? product.price : 0,
          };
        })
      );

      const orderData = {
        customerId,
        products: productDetails,
        totalAmount,
        orderReference,
        status: "PENDING",
        createdAt: timestamp,
        lastPurchaseDate: user.lastOrdered,
        orderCount: user.orderCount,
        totalSpent: user.totalSpent,
      };

      // Save the order to MongoDB
      const savedOrder = await Order.create(orderData);
      console.log("✅ Order saved to DB with ID:", savedOrder._id);

      await redisClient.xAck("order_stream", "order_consumer_group", id);
      console.log("✅ Acknowledged message in Redis with ID:", id);
    } catch (error) {
      console.error(" Error processing message:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  process.exit(0);
});

startConsumer();
