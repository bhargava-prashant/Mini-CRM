const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios'); 
const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ==========================
// Schema Definitions
// ==========================
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  loginCount: { type: Number, default: 0 },
  visitCount: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalOrderValue: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  lastOrdered: { type: Date, default: Date.now },
  firstPurchaseDate: { type: Date, default: Date.now },
  orderHistory: [
    {
      orderId: mongoose.Schema.Types.ObjectId,
      amount: Number,
      date: { type: Date, default: Date.now },
      items: [String],
    }
  ],
  isInactive: { type: Boolean, default: false },
  accountCreated: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  orderReference: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  lastPurchaseDate: { type: Date, default: null },
  orderCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 }
}, {
  timestamps: true
});

const segmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rules: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  segmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Segment', required: true },
  audienceSize: { type: Number, required: true },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'scheduled', 'sent', 'failed'], default: 'draft' },
  createdAt: { type: Date, default: Date.now }
});

// ==========================
// Additional Schema Definitions
// ==========================
const communicationLogSchema = new mongoose.Schema({
  campaignId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campaign', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['QUEUED', 'SENT', 'FAILED'], 
    default: 'QUEUED' 
  },
  deliveryAttempts: { type: Number, default: 0 },
  sentAt: Date,
  failedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const messageQueueSchema = new mongoose.Schema({
  communicationLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunicationLog',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  processingAttempts: { type: Number, default: 0 },
  lastProcessedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const batchUpdateQueueSchema = new mongoose.Schema({
  communicationLogIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunicationLog'
  }],
  status: {
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED'],
    default: 'PENDING'
  },
  batchSize: { type: Number, default: 0 },
  updatedStatus: { 
    type: String, 
    enum: ['SENT', 'FAILED'], 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

// ==========================
// Models
// ==========================
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Segment = mongoose.model('Segment', segmentSchema);
const Campaign = mongoose.model('Campaign', campaignSchema);


const CommunicationLog = mongoose.model('CommunicationLog', communicationLogSchema);
const MessageQueue = mongoose.model('MessageQueue', messageQueueSchema);
const BatchUpdateQueue = mongoose.model('BatchUpdateQueue', batchUpdateQueueSchema);

// ==========================
// ==========================
// Helper: Build MongoDB Query from Rules
// ==========================
function buildMongoQuery(rules) {
  if (!rules || !rules.conditions) return {};

  const conditions = [];

  for (const condition of rules.conditions) {
    if (condition.type === 'condition') {
      let query = {};

      switch (condition.operator) {
        case 'greaterThan':
          query[condition.field] = { $gt: parseFloat(condition.value) };
          break;
        case 'lessThan':
          query[condition.field] = { $lt: parseFloat(condition.value) };
          break;
        case 'equals':
          if (condition.field === 'lastActive') {
            const daysAgo = parseInt(condition.value);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            query[condition.field] = {
              $gte: date,
              $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
            };
          } else {
            query[condition.field] = parseFloat(condition.value);
          }
          break;
        case 'notEquals':
          query[condition.field] = { $ne: parseFloat(condition.value) };
          break;
      }

      conditions.push(query);
    } else if (condition.type === 'group') {
      conditions.push(buildMongoQuery(condition));
    }
  }

  return rules.operator === 'AND'
    ? { $and: conditions }
    : { $or: conditions };
}

async function populateCommunicationLogsAndQueue() {
  const campaigns = await Campaign.find({ status: 'draft' }).populate('segmentId');

  for (const campaign of campaigns) {
    const rules = campaign.segmentId.rules;
    const mongoQuery = buildMongoQuery(rules);
    const matchedUsers = await User.find(mongoQuery);

    for (const user of matchedUsers) {
      // Insert into CommunicationLog
      const log = await CommunicationLog.create({
        campaignId: campaign._id,
        userId: user._id,
        message: `Hello ${user.name}, welcome!`, // or use template logic
        status: 'QUEUED'
      });

      // Insert into MessageQueue
      await MessageQueue.create({
        communicationLogId: log._id,
        status: 'PENDING',
        createdAt: new Date()
      });
    }

    // Optionally update campaign status
    campaign.audienceSize = matchedUsers.length;
    campaign.status = 'scheduled';
    await campaign.save();
  }

  console.log('✅ Populated communication logs and message queue.');
}


// ==========================
// Dummy Vendor API Service
// ==========================
const vendorApiService = {
  sendMessage: async (userId, message) => {
    // Simulate API call latency
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // 90% success rate
    const isSuccess = Math.random() < 0.9;
    
    return {
      success: isSuccess,
      messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date(),
      error: isSuccess ? null : 'Delivery failed - recipient unavailable'
    };
  },

  // The real vendor would call our callback API when message is delivered
  simulateDeliveryCallback: async (callbackUrl, messageData) => {
    try {
      await axios.post(callbackUrl, messageData);
      return true;
    } catch (error) {
      console.error('Error simulating callback:', error);
      return false;
    }
  }
};

// ==========================
// Message Queue Consumer
// ==========================
async function processMessageQueue() {
  try {
    // Find pending messages to process, limit batch size
    const pendingMessages = await MessageQueue.find({ status: 'PENDING' })
      .limit(50)
      .sort({ createdAt: 1 });

    if (pendingMessages.length === 0) {
      return;
    }

    console.log(`Processing ${pendingMessages.length} pending messages`);
    
    // Mark messages as processing
    const messageIds = pendingMessages.map(msg => msg._id);
    await MessageQueue.updateMany(
      { _id: { $in: messageIds } },
      { 
        $set: { status: 'PROCESSING', lastProcessedAt: new Date() },
        $inc: { processingAttempts: 1 }
      }
    );

    // Process each message
    for (const queueItem of pendingMessages) {
      try {
        // Get communication log entry
        const commLog = await CommunicationLog.findById(queueItem.communicationLogId)
          .populate('userId');
        
        if (!commLog) {
          console.error(`Communication log not found for id: ${queueItem.communicationLogId}`);
          await MessageQueue.updateOne(
            { _id: queueItem._id },
            { $set: { status: 'FAILED' } }
          );
          continue;
        }

        // Skip if already sent or failed
        if (commLog.status !== 'QUEUED') {
          await MessageQueue.updateOne({ _id: queueItem._id }, { $set: { status: 'COMPLETED' } });
          continue;
        }

        // Generate personalized message
        const personalizedMessage = commLog.message.replace('{name}', commLog.userId.name || 'Customer');

        // Send message via vendor API
        const result = await vendorApiService.sendMessage(commLog.userId._id, personalizedMessage);

        // Create batch update queue entry based on result
        const updateStatus = result.success ? 'SENT' : 'FAILED';
        await addToBatchUpdateQueue(commLog._id, updateStatus);

        // Simulate vendor's callback to our delivery receipt API
        // In a real scenario, the vendor would call this API directly
        setTimeout(() => {
          vendorApiService.simulateDeliveryCallback(
            `${process.env.BASE_URL || 'http://localhost:5001'}/api/delivery-receipt`,
            {
              communicationLogId: commLog._id,
              status: updateStatus,
              vendorMessageId: result.messageId,
              timestamp: result.timestamp
            }
          );
        }, 500 + Math.random() * 1000);

        // Mark queue item as completed
        await MessageQueue.updateOne({ _id: queueItem._id }, { $set: { status: 'COMPLETED' } });
      } catch (error) {
        console.error(`Error processing message queue item ${queueItem._id}:`, error);
        
        // Mark as failed if too many attempts
        if (queueItem.processingAttempts >= 3) {
          await MessageQueue.updateOne(
            { _id: queueItem._id },
            { $set: { status: 'FAILED' } }
          );
        } else {
          // Reset to pending for retry
          await MessageQueue.updateOne(
            { _id: queueItem._id },
            { $set: { status: 'PENDING' } }
          );
        }
      }
    }
  } catch (error) {
    console.error('Error in message queue processor:', error);
  }
}

// ==========================
// Batch Update Queue Helper
// ==========================
async function addToBatchUpdateQueue(communicationLogId, status) {
  try {
    // Find an existing batch that hasn't been processed yet
    const existingBatch = await BatchUpdateQueue.findOne({
      status: 'PENDING',
      updatedStatus: status,
      batchSize: { $lt: 100 } // Max batch size
    });

    if (existingBatch) {
      // Add to existing batch
      await BatchUpdateQueue.updateOne(
        { _id: existingBatch._id },
        { 
          $push: { communicationLogIds: communicationLogId },
          $inc: { batchSize: 1 }
        }
      );
    } else {
      // Create new batch
      await BatchUpdateQueue.create({
        communicationLogIds: [communicationLogId],
        batchSize: 1,
        updatedStatus: status
      });
    }
  } catch (error) {
    console.error('Error adding to batch update queue:', error);
  }
}

// ==========================
// Batch Update Processor
// ==========================
async function processBatchUpdates() {
  try {
    // Find pending batch updates
    const pendingBatches = await BatchUpdateQueue.find({ status: 'PENDING' })
      .limit(5);

    if (pendingBatches.length === 0) {
      return;
    }

    console.log(`Processing ${pendingBatches.length} batch updates`);

    for (const batch of pendingBatches) {
      try {
        // Mark batch as processing
        await BatchUpdateQueue.updateOne(
          { _id: batch._id },
          { $set: { status: 'PROCESSING' } }
        );

        const updateFields = {
          status: batch.updatedStatus
        };

        // Add appropriate timestamp based on status
        if (batch.updatedStatus === 'SENT') {
          updateFields.sentAt = new Date();
        } else if (batch.updatedStatus === 'FAILED') {
          updateFields.failedAt = new Date();
        }

        // Update all communication logs in batch
        await CommunicationLog.updateMany(
          { _id: { $in: batch.communicationLogIds } },
          { $set: updateFields }
        );

        // Mark batch as completed
        await BatchUpdateQueue.updateOne(
          { _id: batch._id },
          { $set: { status: 'COMPLETED' } }
        );

        // Update campaign stats
        if (batch.communicationLogIds.length > 0) {
          const sampleCommLog = await CommunicationLog.findById(batch.communicationLogIds[0]);
          if (sampleCommLog) {
            const updateField = batch.updatedStatus === 'SENT' ? 'sentCount' : 'failedCount';
            await Campaign.updateOne(
              { _id: sampleCommLog.campaignId },
              { $inc: { [updateField]: batch.communicationLogIds.length } }
            );
          }
        }
      } catch (error) {
        console.error(`Error processing batch ${batch._id}:`, error);
        
        // Reset to pending for retry
        await BatchUpdateQueue.updateOne(
          { _id: batch._id },
          { $set: { status: 'PENDING' } }
        );
      }
    }
  } catch (error) {
    console.error('Error in batch update processor:', error);
  }
}

// ==========================
// Schedule Queue Processors
// ==========================
// Run the message processor every 5 seconds
setInterval(processMessageQueue, 5000);

// Run the batch update processor every 10 seconds
setInterval(processBatchUpdates, 10000);












// ==========================
// API Routes
// ==========================




// 🔹 Preview audience size
app.post('/api/audience/preview', async (req, res) => {
  try {
    const { rules } = req.body;
    const query = buildMongoQuery(rules);
    const userCount = await User.countDocuments(query);
    res.json({ size: userCount });
  } catch (err) {
    console.error('Error calculating audience size:', err);
    res.status(500).json({ error: 'Failed to calculate audience size' });
  }
});

// 🔹 Create a segment
app.post('/api/segments', async (req, res) => {
  try {
    const { name, rules } = req.body;
    const segment = new Segment({ name, rules });
    await segment.save();
    res.status(201).json(segment);
  } catch (err) {
    console.error('Error creating segment:', err);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// // 🔹 Create a campaign from database data
// app.post('/api/campaigns', async (req, res) => {
//   try {
//     const { name, segmentId } = req.body;

//     const segment = await Segment.findById(segmentId);
//     if (!segment) return res.status(404).json({ error: 'Segment not found' });

//     const query = buildMongoQuery(segment.rules);
//     const matchingUsers = await User.find(query).select('_id');
//     const matchedUserIds = matchingUsers.map(u => u._id);

//     const sentCount = Math.floor(matchedUserIds.length * 0.95);
//     const failedCount = matchedUserIds.length - sentCount;

//     const campaign = new Campaign({
//       name,
//       segmentId,
//       audienceSize: matchedUserIds.length,
//       status: 'sent',
//       sentCount,
//       failedCount
//     });

//     await campaign.save();
//     res.status(201).json(campaign);
//   } catch (err) {
//     console.error('Error creating campaign:', err);
//     res.status(500).json({ error: 'Failed to create campaign' });
//   }
// });

//🔹 Get all campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .populate('segmentId', 'name')
      .exec();
    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// 🔹 Generate sample data
app.post('/api/generate-sample-data', async (req, res) => {
  try {
    await User.deleteMany({});
    const sampleUsers = [];

    for (let i = 1; i <= 100; i++) {
      const totalSpent = Math.floor(Math.random() * 5000);
      const orderCount = Math.floor(Math.random() * 20);
      const visitCount = Math.floor(Math.random() * 50) + orderCount;
      const loginCount = Math.floor(Math.random() * 30) + visitCount / 2;
      const daysSinceLastActive = Math.floor(Math.random() * 60) + 1;
      const lastActive = new Date();
      lastActive.setDate(lastActive.getDate() - daysSinceLastActive);

      sampleUsers.push({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: 'password123',
        totalSpent,
        orderCount,
        visitCount,
        loginCount,
        lastActive,
        accountCreated: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      });
    }

    await User.insertMany(sampleUsers);
    res.json({ message: 'Sample data generated', count: sampleUsers.length });
  } catch (err) {
    console.error('Error generating sample data:', err);
    res.status(500).json({ error: 'Failed to generate sample data' });
  }
});





// 🔹 Enhanced campaign creation with message delivery
app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, segmentId, audienceSize, messageTemplate } = req.body;
    const template = messageTemplate || "Hi {name}, here's 10% off on your next order!";

    const segment = await Segment.findById(segmentId);
    if (!segment) return res.status(404).json({ error: 'Segment not found' });
    const query = buildMongoQuery(segment.rules);
    const matchingUsers = await User.find(query);
    const matchedUserIds = matchingUsers.map(u => u._id);

    // Create campaign
    const campaign = new Campaign({
      name,
      segmentId,
      audienceSize: matchedUserIds.length,
      status: 'sent'
    });

    await campaign.save();

    // Get users matching segment
   
    // const matchingUsers = await User.find(query);

    // Create communication logs and message queue entries
    const commLogDocs = [];
    const queueDocs = [];

    for (const user of matchingUsers) {
      const commLog = new CommunicationLog({
        campaignId: campaign._id,
        userId: user._id,
        message: template,
        status: 'QUEUED'
      });

      commLogDocs.push(commLog);

      const queueItem = new MessageQueue({
        communicationLogId: commLog._id
      });

      queueDocs.push(queueItem);
    }

    // Populate communication logs and queues for draft campaigns
    await populateCommunicationLogsAndQueue();

    // Bulk insert logs
    const insertedLogs = await CommunicationLog.insertMany(commLogDocs);

    // Update queue docs with inserted log ids
    for (let i = 0; i < insertedLogs.length; i++) {
      queueDocs[i].communicationLogId = insertedLogs[i]._id;
    }

    // Bulk insert queue items
    await MessageQueue.insertMany(queueDocs);

    res.status(201).json(campaign);
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// 🔹 Delivery receipt API (called by vendor)
app.post('/api/delivery-receipt', async (req, res) => {
  try {
    const { communicationLogId, status, vendorMessageId, timestamp } = req.body;
    
    // Validate required fields
    if (!communicationLogId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if communication log exists
    const commLog = await CommunicationLog.findById(communicationLogId);
    if (!commLog) {
      return res.status(404).json({ error: 'Communication log not found' });
    }
    
    // Add to batch update queue
    await addToBatchUpdateQueue(communicationLogId, status);
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error processing delivery receipt:', err);
    res.status(500).json({ error: 'Failed to process delivery receipt' });
  }
});

// 🔹 Get campaign delivery stats
app.get('/api/campaigns/:id/stats', async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Get counts by status
    const sentCount = await CommunicationLog.countDocuments({
      campaignId,
      status: 'SENT'
    });
    
    const failedCount = await CommunicationLog.countDocuments({
      campaignId,
      status: 'FAILED'
    });
    
    const queuedCount = await CommunicationLog.countDocuments({
      campaignId,
      status: 'QUEUED'
    });
    
    res.json({
      total: campaign.audienceSize,
      sent: sentCount,
      failed: failedCount,
      queued: queuedCount
    });
    
  } catch (err) {
    console.error('Error fetching campaign stats:', err);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
});


// ==========================
// Start Server
// ==========================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
