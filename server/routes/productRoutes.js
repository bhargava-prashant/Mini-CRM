const router = require('express').Router();
const auth = require('../middleware/auth');
const { seedProducts, getProducts } = require('../controllers/productController');

router.post('/seed', auth, seedProducts);
router.get('/', getProducts);

module.exports = router;