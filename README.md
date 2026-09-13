# EncoderX Store — Full-Stack E-Commerce Platform
> **Program:** EncoderX Remote Internship (Batch 02)  
> **Track:** Full Stack Web Development  
> **Task 2:** Mini E-Commerce Platform with RBAC, Cart Preservation, Atomic Stock Deductions, and Admin Analytics  

[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express-4.21-blue.svg)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Database-SQLite%20ACID-orange.svg)](https://sqlite.org)
[![RBAC](https://img.shields.io/badge/Security-RBAC%20JWT-purple.svg)](https://jwt.io)
[![License](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)

---

## 🌟 Executive Summary

**EncoderX Store** is an enterprise-grade, high-performance full-stack e-commerce web application engineered to demonstrate advanced web development competencies. The system connects a dynamic product catalog, state-preserved shopping cart, transactional inventory deduction workflow, relational database architecture, and a privileged administrative dashboard guarded by **Role-Based Access Control (RBAC)**.

---

## ✨ Core Features & Technical Highlights

### 1. Database & Relational Model Architecture (Step 1)
- **ACID-Compliant Relational Database**: Built with SQLite persistent storage with WAL mode enabled.
- **Relational Tables**:
  - `users`: Identity management with bcrypt password hashing and role enumeration (`customer` vs `admin`).
  - `products`: Catalog items with title, rich description, unit price, stock count, category, rating, and image URL.
  - `orders`: Customer billing, shipping destination, itemized totals, tax, shipping fees, and order fulfillment status.
  - `order_items`: Relational line items linking orders to catalog items with price snapshots and quantity checks.
- **Entity Relationship Diagram**: See [`docs/ERD.md`](docs/ERD.md) for the complete schema diagram, cardinalities, delete behavior, and modeling notes.
- **Foreign Key Enforcement & Cascading Rules**: Database integrity maintained via foreign key constraints.

### 2. Product Catalog & Persistent Shopping Cart (Step 2)
- **Live Filtering**: Instant filtering by category tabs (*Audio*, *Computing*, *Gaming*, *Electronics*, *Wearables*, *Accessories*).
- **Multi-criteria Sorting**: Sort by *Price: Low to High*, *Price: High to Low*, *Name: A-Z*, *Name: Z-A*, *Highest Rated*, and *Newest Arrivals*.
- **Live Debounced Search**: 350ms debounced search scanning both product titles and descriptions.
- **Client-Side State Preservation**: Cart data, item quantities, and applied promo codes survive browser reloads and tab closures using `localStorage`.
- **Intelligent Stock Boundaries**: Incremental quantity controls (+ / -) automatically enforce live inventory caps.
- **Dynamic Free Shipping Meter**: Interactive visual progress bar indicating remaining spend needed to unlock free shipping.

### 3. Dynamic Checkout Workflow & Atomic Stock Reduction (Step 3)
- **Atomic Database Transactions**: Checkout operations execute inside atomic transactions (`BEGIN TRANSACTION ... COMMIT / ROLLBACK`).
- **Oversell Prevention**: Real-time validation checks inventory before processing; if requested quantity exceeds current stock, the order is safely rejected.
- **Server-Side Financial Calculations**: Subtotal, 8% sales tax, and shipping fees are computed strictly on the backend to prevent client tampering.
- **Promo Coupon System**: Supports discount promo codes (`ENCODERX10` for 10% off, `LAUNCH20` for 20% off, `FREESHIP`).
- **Simulated Payment Gateway**: Card formatting (16 digits with space grouping), expiry date formatting (`MM/YY`), and CVV validation.
- **Immediate Visual Receipt**: Confirmation modal showcasing unique tracking number (`ORD-XXXXXX-XXX`), items breakdown, and estimated delivery.

### 4. Admin Dashboard & Role-Based Access Control (Step 4)
- **RBAC Security Guard**: Admin endpoints and UI views require valid JWT tokens with `role === 'admin'`. Unauthorized regular users or unauthenticated visitors are blocked with `401 Unauthorized` or `403 Forbidden`.
- **Live Business KPIs**:
   - Total Store Revenue (PKR)
  - Total Orders Processed
  - Active Catalog Items Count
  - Low Stock & Out-of-Stock Warnings
- **Product Inventory CRUD**:
  - Create new products dynamically with validation.
  - Update existing products (title, price, stock, category, specs).
  - Delete products with safe database unlinking.
- **Order Management & Fulfillment**:
  - View full customer order history and itemized receipts.
  - Update order status (*Processing* -> *Shipped* -> *Delivered* -> *Cancelled*).

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** v20.x or higher (tested on Node v25.2)
- **npm** v10.x or higher

### Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Farhan-176/Ecommerce-Platfrom.git
   cd Ecommerce-Platfrom
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Seed Database with Sample Data**:
   ```bash
   npm run seed
   ```

4. **Start the Application**:
   ```bash
   npm start
   ```
   *For live reloading during development:*
   ```bash
   npm run dev
   ```

5. **Open in Browser**:
   - Storefront: [http://localhost:3000](http://localhost:3000)
   - Admin Panel: [http://localhost:3000/#admin](http://localhost:3000/#admin)

---

## 🔑 Pre-Configured Demo Credentials

The platform includes 1-click login buttons in the Sign In modal for testing:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@store.com` | `admin123` | Full Store Management, Analytics, Product CRUD, Order Status |
| **Customer** | `customer@store.com` | `customer123` | Catalog Browsing, Cart, Checkout, Order History |

---

## 🧪 Automated Testing

Execute the comprehensive automated test suite verifying database integrity, catalog pagination, atomic stock deductions, oversell protection, and RBAC:

```bash
npm test
```

### Test Suite Output Preview:
```text
🧪 Starting Full-Stack E-Commerce Platform Test Suite...
🌱 Initializing database schema...
👤 Seeding default users (Admin & Customer)...
📦 Seeding curated product catalog...
📡 Test server running on port 3099

--- 1. Testing Authentication & RBAC ---
✅ Customer login verified
✅ Admin login verified
✅ RBAC check: Unauthenticated rejected (401)
✅ RBAC check: Regular customer forbidden from admin stats (403)
✅ RBAC check: Admin authorized (200), totalRevenue: $693.75

--- 2. Testing Product Catalog, Filters, and Pagination ---
✅ Pagination verified: Page 1 of 3 (16 total items)
✅ Category filtering verified: Found 3 Audio items
✅ Search verified: Found "Apple MacBook Pro 16" M3 Max"
✅ Price sorting (Low to High) verified

--- 3. Testing Checkout & Atomic Inventory Deduction ---
ℹ️ Target Product #64 initial stock: 7
✅ Order placed successfully: ORD-313649-439, Total: $756.22
✅ Inventory deduction verified: Stock updated from 7 -> 5
✅ Oversell protection verified: Checkout blocked for insufficient inventory

--- 4. Testing Admin Product CRUD & Order Status Management ---
✅ Admin Product Created: ID 65 - EncoderX Dev Hoodie Pro
✅ Admin Product Updated: Price -> $75.00, Stock -> 42
✅ Admin Product Deleted successfully
✅ Deletion verified: Product not found in catalog (404)
✅ Admin Order #7 Status updated to "Shipped"

🎉 ALL BACKEND & DATABASE TESTS PASSED WITH 100% SUCCESS!
```

---

## 📁 Repository Structure

```text
ECOMMERCE PLATFORM/
├── docs/
│   ├── API_DOCUMENTATION.md      # Full REST API documentation & schemas
│   └── SUBMISSION_PACKAGE.md     # LinkedIn post copy, demo video script, checklist
├── public/
│   ├── css/
│   │   └── style.css             # Vanilla CSS design system & glassmorphism UI
│   ├── js/
│   │   ├── admin.js              # Protected Admin Dashboard & Product CRUD
│   │   ├── api.js                # Fetch API client & toast notifications
│   │   ├── auth.js               # Auth modal, demo logins, and RBAC guards
│   │   ├── cart.js               # Cart drawer, quantity controls & promo logic
│   │   ├── catalog.js            # Product catalog, filters, sort & pagination
│   │   ├── checkout.js           # Multi-step checkout validation & submission
│   │   ├── main.js               # Application coordinator & routing
│   │   └── state.js              # Reactive state manager with LocalStorage
│   └── index.html                # Accessible, semantic single-page application
├── server/
│   ├── db/
│   │   ├── database.js           # SQLite DatabaseSync wrapper & transaction helper
│   │   ├── schema.sql            # Relational database schema with constraints
│   │   └── seed.js               # Database seeding routine
│   ├── middleware/
│   │   └── auth.js               # JWT verification & RBAC authorization middleware
│   ├── routes/
│   │   ├── adminRoutes.js        # Admin analytics, order status & product CRUD
│   │   ├── authRoutes.js         # User registration, login, and profile verification
│   │   ├── orderRoutes.js        # Checkout processing & atomic stock deduction
│   │   └── productRoutes.js      # Public catalog, filters, search & pagination
│   ├── app.js                    # Express app configuration & static assets
│   └── server.js                 # Server entry point
├── tests/
│   └── test_api.js               # Automated integration test suite
├── .gitignore                    # Git ignore file
├── package.json                  # Project dependencies and npm scripts
└── README.md                     # Project documentation
```

---

## 📜 Evaluation Criteria Coverage

| Criteria | Weight | Implementation Details |
| :--- | :---: | :--- |
| **Cart & Checkout Logic** | **25%** | Persistent `localStorage` cart, item steppers, live subtotal/tax/shipping calculations, promo code discounts, and atomic stock deductions. |
| **Admin Panel & Role Security** | **25%** | JWT authentication, role guards (`401`/`403`), total revenue analytics, order histories, status updates, and dynamic product CRUD. |
| **Product Filtering & Querying** | **20%** | Category tabs, multi-column search, 6 sorting modes, in-stock toggle, and server-side pagination with page selectors. |
| **Clean Architecture & DB Sync** | **15%** | Strict separation of concerns (routes, middleware, db layer), true ACID transactions, foreign key integrity, and zero native compilation headaches. |
| **UI Design & Presentation** | **15%** | Midnight glassmorphism aesthetic, typography (*Outfit* & *Plus Jakarta Sans*), responsive layout, and interactive micro-animations. |

---

## 👨‍💻 Author & Internship Details
- **Intern:** Full Stack Engineering Intern
- **Cohort:** EncoderX Remote Internship Batch 02
- **Track:** Full Stack Development (Week 02)
