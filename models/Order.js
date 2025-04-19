const mongoose = require('mongoose');

// Schema for items in the order
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  name: String,
  price: Number,
  quantity: Number
});

const orderSchema = new mongoose.Schema({
  buyer_name: {
    type: String,
    required: true
  },
  buyer_contact: {
    type: String,
    required: true
  },
  delivery_address: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 