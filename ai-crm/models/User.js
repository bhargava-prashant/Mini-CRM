const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  loginCount: Number,
  visitCount: Number,
  orderCount: Number,
  totalSpent: Number,
  totalOrderValue: Number,
  lastActive: Date,
  isInactive: Boolean,
  accountCreated: Date,
  lastOrdered: Date,
  firstPurchaseDate: Date,
  orderHistory: Array
});

module.exports = mongoose.model('User', UserSchema);