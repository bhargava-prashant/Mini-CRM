

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,

  // Tracking fields
  loginCount: { type: Number, default: 0 },
  visitCount: { type: Number, default: 0 },
  orderCount: { // Tracks the total number of orders placed by the user
    type: Number,
    default: 0
  },
  totalSpent: { // Tracks the total amount spent by the user
    type: Number,
    default: 0
  },
  totalOrderValue: { // Tracks the total value of orders (can be used for analysis)
    type: Number,
    default: 0
  },
  lastActive: { type: Date, default: Date.now },
  lastOrdered: { type: Date, default: Date.now },
  firstPurchaseDate: { // Tracks the date of the user's first purchase
    type: Date,
    default: Date.now
  },

  // Order history
  orderHistory: [
    {
      orderId: mongoose.Schema.Types.ObjectId,
      amount: Number,
      date: { type: Date, default: Date.now },
      items: [String],
    }
  ],

  // Additional fields
  isInactive: { type: Boolean, default: false },
  accountCreated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
