const router = require('express').Router();
const auth = require('../middleware/auth');
const { placeOrder, checkOrderStatus } = require('../controllers/orderController');

// Place a new order (authenticated route)
router.post('/', auth, placeOrder);

// Check order status (authenticated route)
router.get('/:orderReference', auth, checkOrderStatus);

module.exports = router;