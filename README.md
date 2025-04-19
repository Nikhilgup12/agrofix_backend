# AgroFix Backend API

This repository contains the backend API for the AgroFix vegetable delivery application.

## Features

- User authentication (admin login)
- Product management (CRUD operations)
- Order management and tracking
- File uploads for product images
- RESTful API endpoints

## Tech Stack

- Node.js
- Express.js
- MongoDB/Mongoose
- JWT Authentication
- Multer for file uploads

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/Nikhilgup12/agrofix_backend.git
   cd agrofix_backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/agrofix
   JWT_SECRET=your_jwt_secret
   ```

4. Start the development server:
   ```
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add a new product (admin only)
- `DELETE /api/products/:id` - Delete a product (admin only)

### Orders
- `POST /api/orders` - Place a new order
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders` - Get all orders (admin only)
- `PUT /api/orders/:id` - Update order status (admin only)
- `PATCH /api/orders/:id/status` - Update order status (alternative endpoint)

## Project Structure

```
├── config/         # Database configuration
├── models/         # Mongoose models
├── uploads/        # Product image uploads
├── index.js        # Main server file
├── package.json    # Project dependencies
└── .env            # Environment variables (not tracked by git)
```

## Development

This project uses:
- ES6 syntax
- Express middleware for request handling
- Mongoose for MongoDB interaction
- Multer for handling file uploads
- JWT for secure authentication

## License

[MIT](https://choosealicense.com/licenses/mit/)
