const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  name: String,
  segmentId: mongoose.Schema.Types.ObjectId,
  audienceSize: Number,
  sentCount: Number,
  failedCount: Number,
  status: String,
  createdAt: Date
});

module.exports = mongoose.model('Campaign', CampaignSchema);