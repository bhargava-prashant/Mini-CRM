
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer', // Assuming you have a Customer model
    required: true
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // Reference to Product model
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  orderReference: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastPurchaseDate: { // Optional: Tracks the last purchase date
    type: Date,
    default: null
  },
  orderCount: { // Tracks the number of orders placed by the customer
    type: Number,
    default: 0
  },
  totalSpent: { // Tracks the total amount spent by the customer
    type: Number,
    default: 0
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

// Create an index for faster querying
orderSchema.index({ orderReference: 1 });
orderSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
