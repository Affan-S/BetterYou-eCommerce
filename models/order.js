const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  recieverName: {
    type: String,
    required: true
  },
  cart: {
    totalQty: {
      type: Number,
      default: 0,
      required: true,
    },
    totalCost: {
      type: Number,
      default: 0,
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        qty: {
          type: Number,
          default: 0,
        },
        price: {
          type: Number,
          default: 0,
        },
        title: {
          type: String,
        },
      },
    ],
  },
  address: {
    type: String,
    required: true,
  },
  paymentMethod:{
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
    maxlength: 11,
    minlength: 11
  },
  paymentId: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  Delivered: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Order", orderSchema);
