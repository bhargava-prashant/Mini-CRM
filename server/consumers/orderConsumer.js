const client = require('../config/redis');
const Order = require('../models/Order');
const Product = require('../models/Product');

const consumeOrders = async () => {
  while (true) {
    const res = await client.xRead(
      { key: 'order_stream', id: '$' },
      { COUNT: 1, BLOCK: 5000 }
    );

    if (res) {
      const [stream] = res;
      const [[id, data]] = stream.messages;

      const customerId = JSON.parse(data.customerId);
      const products = JSON.parse(data.products);

      let total = 0;
      for (let p of products) {
        const prod = await Product.findById(p.productId);
        total += prod.price * p.quantity;
      }

      await Order.create({ customerId, products, totalAmount: total });
    }
  }
};

consumeOrders();