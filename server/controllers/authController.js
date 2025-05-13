
// const User = require('../models/User');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// // Signup Controller
// exports.signup = async (req, res) => {
//   const { name, email, password } = req.body;
  
//   try {
//     // Check if the email already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ error: 'Email already in use' });
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create new user
//     const user = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       loginCount: 0,           // Initial login count
//       visitCount: 0,           // Initial visit count
//       orderCount: 0,           // Initial order count
//       totalSpent: 0,           // Initial total spent
//       totalOrderValue: 0,      // Initial total order value
//       lastActive: Date.now(),  // Set last active to current date/time
//       firstPurchaseDate: null, // Initially null, set on first purchase
//     });

//     res.json({ message: 'User created', user });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// // Login Controller
// exports.login = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Compare password with hashed password
//     if (!(await bcrypt.compare(password, user.password))) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Update the login count and last active date
//     user.loginCount += 1;
//     user.lastActive = Date.now();
//     await user.save();

//     // Generate a JWT token
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

//     res.json({ token, userId: user._id });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// Updated Auth Controller with Fixed Tracking
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Signup Controller
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with all tracking fields properly initialized
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      loginCount: 0,           // Initial login count
      visitCount: 0,           // Initial visit count
      orderCount: 0,           // Initial order count
      totalSpent: 0,           // Initial total spent
      totalOrderValue: 0,      // Initial total order value
      lastActive: Date.now(),  // Set last active to current date/time
      firstPurchaseDate: null, // Initially null, set on first purchase
      orderHistory: [],        // Initialize empty order history array
      isInactive: false,       // User is active by default
      accountCreated: Date.now() // Set account creation date
    });

    res.json({ 
      message: 'User created successfully', 
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      } 
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login Controller
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fix: Update both login count and visit count
    user.loginCount = (user.loginCount || 0) + 1;
    user.visitCount = (user.visitCount || 0) + 1;
    user.lastActive = Date.now();
    
    // Check if user was previously marked as inactive
    if (user.isInactive) {
      user.isInactive = false; // Reactivate user
    }
    
    await user.save();

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      message: 'Login successful',
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Track page visits (optional - implement in your middleware)
exports.trackVisit = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.visitCount = (user.visitCount || 0) + 1;
        user.lastActive = Date.now();
        await user.save();
      }
    }
    next();
  } catch (error) {
    console.error('❌ Visit tracking error:', error);
    next(); // Continue even if tracking fails
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        loginCount: user.loginCount,
        visitCount: user.visitCount,
        orderCount: user.orderCount,
        totalSpent: user.totalSpent,
        lastActive: user.lastActive,
        firstPurchaseDate: user.firstPurchaseDate,
        accountCreated: user.accountCreated
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark User as Inactive (admin function)
exports.markInactive = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isInactive = true;
    await user.save();
    
    res.json({ message: 'User marked as inactive' });
  } catch (error) {
    console.error('❌ Mark inactive error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};