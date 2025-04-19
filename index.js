const express = require("express");
const cors = require("cors");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Admin = require("./models/Admin");
const Product = require("./models/Product");
const Order = require("./models/Order");

// Import DB connection
const connectDB = require("./config/db");

// Update CORS configuration to allow credentials and specific origins
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Make sure uploads directory exists
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads", { recursive: true });
  console.log("Created uploads directory");
}

// Apply CORS with proper options
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from uploads directory with proper CORS headers
app.use("/uploads", (req, res, next) => {
  // Add CORS headers
  res.header("Access-Control-Allow-Origin", corsOptions.origin);
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
  next();
}, express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// Initialize database with dummy data
const initDb = async () => {
  try {
    // Insert dummy admin if none exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const admin = new Admin({
        email: "admin@agrofix.com",
        password: "admin123" // Will be hashed by pre-save hook
      });
      await admin.save();
      console.log("Dummy admin created");
    }

    // Insert 10 dummy products if none exist
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const dummyProducts = [
        { name: "Tomato", price: 25, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986180/tomatoes-canva_ljqvzv.jpg" },
        { name: "Potato", price: 20, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986269/iiygg5i1zwp6mfimdvdc.jpg" },
        { name: "Onion", price: 30, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986294/d3ni2knizsuzso04ilox.jpg" },
        { name: "Carrot", price: 35, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986319/mz2upk8znsiwjum9fp5r.jpg" },
        { name: "Capsicum", price: 40, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986348/dx4qwkgsfyroaaes0k7a.jpg" },
        { name: "Cabbage", price: 28, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986371/fwtlthg9aynepm6xmwz4.jpg" },
        { name: "Broccoli", price: 50, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986394/ac44psjg0yhdtzqbavad.jpg" },
        { name: "Spinach", price: 15, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986401/olorj4bnd6uabdj0c2uv.jpg" },
        { name: "Apple", price: 100, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986438/cu6yo2hpe82sk1ng041x.jpg" },
        { name: "Banana", price: 60, image_url: "https://res.cloudinary.com/di9qg5ka6/image/upload/v1744986447/quusjerp9p8k5stjykb3.jpg" },
      ];
      await Product.insertMany(dummyProducts);
      console.log("Dummy products created");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

initDb();

// Multer setup for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Make sure the directory exists
    if (!fs.existsSync("./uploads")) {
      fs.mkdirSync("./uploads", { recursive: true });
    }
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware to check admin token
const authenticate = (req, res, next) => {
  let token = req.headers["authorization"];
  
  console.log("Auth headers received:", req.headers);
  
  // Handle different token formats (with/without Bearer prefix)
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }
  
  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.adminId = decoded.id;
    console.log(`Authenticated admin: ${req.adminId}`);
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Admin login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin) return res.status(401).send("Admin not found");
    
    const valid = await admin.comparePassword(password);
    if (!valid) return res.status(403).send("Invalid credentials");
    
    const token = jwt.sign({ id: admin._id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Error during login");
  }
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
});

// Add product (admin only)
app.post("/api/products", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { name, price } = req.body;
    // Store full URL path including /uploads/ prefix
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    console.log(`Creating product: ${name}, price: ${price}, image: ${image_url}`);
    
    const product = new Product({
      name,
      price,
      image_url
    });
    
    await product.save();
    
    // Log the created product for debugging
    console.log(`Product created successfully: ${product._id}, image: ${product.image_url}`);
    
    res.json(product);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Failed to add product");
  }
});

// Place new order
app.post("/api/orders", async (req, res) => {
  try {
    const { buyer_name, buyer_contact, delivery_address, items } = req.body;
    
    const order = new Order({
      buyer_name,
      buyer_contact,
      delivery_address,
      items,
      status: "Pending"
    });
    
    await order.save();
    res.json({ id: order._id });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Failed to place order");
  }
});

// Get order by ID
app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id);
    
    if (!order) return res.status(404).send("Order not found");
    
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("Error fetching order");
  }
});

// Admin: get all orders
app.get("/api/orders", authenticate, async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Failed to fetch orders");
  }
});

// Admin: update order status (support both PUT and PATCH)
app.put("/api/orders/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    
    console.log(`[PUT] Updating order status: ID=${id}, New Status=${status}, Admin=${req.adminId}`);
    console.log("Request body:", req.body);
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    // Validate status value
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`,
        validStatuses
      });
    }
    
    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!order) {
      console.log(`Order not found: ${id}`);
      return res.status(404).json({ message: "Order not found" });
    }
    
    console.log(`Order status updated successfully: ${order._id}, New status: ${order.status}`);
    
    // Return the updated order with a success message
    res.json({ 
      message: "Order status updated successfully", 
      order,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ 
      message: `Failed to update order: ${error.message}`,
      error: error.toString()
    });
  }
});

// Support PATCH method for backward compatibility
app.patch("/api/orders/:id/status", authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    
    console.log(`[PATCH] Updating order status: ID=${id}, New Status=${status}, Admin=${req.adminId}`);
    console.log("Request body:", req.body);
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    // Validate status value
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`,
        validStatuses
      });
    }
    
    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!order) {
      console.log(`Order not found: ${id}`);
      return res.status(404).json({ message: "Order not found" });
    }
    
    console.log(`Order status updated successfully via PATCH: ${order._id}, New status: ${order.status}`);
    
    // Return the updated order with a success message
    res.json({ 
      message: "Order status updated successfully", 
      order,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ 
      message: `Failed to update order: ${error.message}`,
      error: error.toString()
    });
  }
});

// Admin: delete a product
app.delete("/api/products/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndDelete(id);
    
    if (!product) return res.status(404).send("Product not found");
    
    // Delete associated image file if it exists
    if (product.image_url && product.image_url.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, product.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    res.send("Product deleted");
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send("Failed to delete product");
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`)); 