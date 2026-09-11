# REST API Endpoint Documentation
> **EncoderX Remote Internship — Task 2: E-Commerce Platform**  
> Base URL: `http://localhost:3000/api`

---

## 1. Authentication Endpoints

### 1.1 Register Customer Account
- **Endpoint:** `POST /api/auth/register`
- **Access:** Public
- **Description:** Registers a new user account with default role `customer`.

#### Request Body:
```json
{
  "name": "Jane Developer",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Account registered successfully.",
  "user": {
    "id": 3,
    "name": "Jane Developer",
    "email": "jane@example.com",
    "role": "customer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.2 User Login (Admin / Customer)
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Description:** Authenticates credentials and returns a signed JSON Web Token (JWT).

#### Request Body:
```json
{
  "email": "admin@store.com",
  "password": "admin123"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Welcome back, Store Administrator!",
  "user": {
    "id": 1,
    "name": "Store Administrator",
    "email": "admin@store.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.3 Get Current User Profile
- **Endpoint:** `GET /api/auth/me`
- **Access:** Authenticated (`Bearer <token>`)
- **Headers:** `Authorization: Bearer <token>`

#### Response (`200 OK`):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Store Administrator",
    "email": "admin@store.com",
    "role": "admin",
    "created_at": "2026-09-11 15:20:00"
  }
}
```

---

## 2. Product Catalog Endpoints

### 2.1 List Products (Filtered, Sorted & Paginated)
- **Endpoint:** `GET /api/products`
- **Access:** Public
- **Query Parameters:**
  | Parameter | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `category` | string | `'all'` | Filter products by category (e.g. `Audio`, `Computing`) |
  | `search` | string | `''` | Search keyword matching name or description |
  | `sort` | string | `'newest'` | Sort order: `price_asc`, `price_desc`, `name_asc`, `name_desc`, `rating`, `newest` |
  | `page` | integer | `1` | Page number |
  | `limit` | integer | `8` | Products per page (max 50) |
  | `inStockOnly` | boolean | `false` | Filter out items with stock count = 0 |

#### Sample Request:
`GET /api/products?category=Audio&sort=price_asc&page=1&limit=4`

#### Response (`200 OK`):
```json
{
  "success": true,
  "products": [
    {
      "id": 11,
      "name": "Noise-Isolating True Wireless Earbuds",
      "description": "Spatial audio with dynamic head tracking...",
      "price": 199.95,
      "image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
      "category": "Audio",
      "stock_count": 30,
      "rating": 4.8,
      "created_at": "2026-09-11 15:20:00"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 4,
    "totalPages": 1
  }
}
```

---

### 2.2 Get Unique Categories
- **Endpoint:** `GET /api/products/categories`
- **Access:** Public

#### Response (`200 OK`):
```json
{
  "success": true,
  "categories": [
    { "category": "Accessories", "count": 3 },
    { "category": "Audio", "count": 3 },
    { "category": "Computing", "count": 4 },
    { "category": "Electronics", "count": 2 },
    { "category": "Gaming", "count": 3 },
    { "category": "Wearables", "count": 2 }
  ]
}
```

---

### 2.3 Get Single Product Details
- **Endpoint:** `GET /api/products/:id`
- **Access:** Public

#### Response (`200 OK`):
```json
{
  "success": true,
  "product": {
    "id": 1,
    "name": "Sony WH-1000XM5 Noise-Cancelling Headphones",
    "description": "Industry-leading noise cancellation...",
    "price": 398.00,
    "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    "category": "Audio",
    "stock_count": 18,
    "rating": 4.9,
    "created_at": "2026-09-11 15:20:00"
  }
}
```

---

## 3. Order & Checkout Processing

### 3.1 Checkout and Place Order (Atomic Transaction)
- **Endpoint:** `POST /api/orders/checkout`
- **Access:** Public / Optional Auth (`Bearer <token>`)
- **Description:** Verifies stock availability, deducts inventory atomically, records order and items, applies discounts, calculates tax and shipping.

#### Request Body:
```json
{
  "items": [
    { "productId": 1, "quantity": 1 }
  ],
  "customerName": "Farhan Siddiqui",
  "customerEmail": "customer@store.com",
  "shippingAddress": "124 Innovation Avenue",
  "city": "San Jose",
  "state": "CA",
  "zipCode": "95112",
  "phone": "+1 555-0199",
  "paymentMethod": "Credit Card",
  "paymentDetails": {
    "cardNumber": "4111 2222 3333 4444",
    "cardExpiry": "12/28",
    "cardCvv": "789"
  },
  "promoCode": "ENCODERX10"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Order placed successfully! Thank you for your purchase.",
  "order": {
    "orderId": 3,
    "orderNumber": "ORD-313649-439",
    "customerName": "Farhan Siddiqui",
    "customerEmail": "customer@store.com",
    "subtotal": 398.00,
    "discount": 39.80,
    "tax": 28.66,
    "shippingFee": 0.00,
    "totalPrice": 386.86,
    "items": [
      {
        "productId": 1,
        "productName": "Sony WH-1000XM5 Noise-Cancelling Headphones",
        "unitPrice": 398.00,
        "quantity": 1,
        "subtotal": 398.00
      }
    ]
  }
}
```

#### Error Response (`400 Bad Request` — Insufficient Stock):
```json
{
  "success": false,
  "error": "Insufficient stock for \"Sony WH-1000XM5 Noise-Cancelling Headphones\". Available: 18, Requested: 999."
}
```

---

## 4. Protected Administration Endpoints (RBAC)
*All admin endpoints require `Authorization: Bearer <token>` with `role: "admin"`. Requests without credentials return `401 Unauthorized`; requests from non-admin users return `403 Forbidden`.*

### 4.1 Get Store Analytics & KPIs
- **Endpoint:** `GET /api/admin/stats`
- **Access:** Administrator

#### Response (`200 OK`):
```json
{
  "success": true,
  "stats": {
    "totalRevenue": 1080.61,
    "totalOrders": 3,
    "totalProducts": 16,
    "totalCustomers": 1,
    "lowStockCount": 3,
    "outOfStockCount": 1,
    "categoryStats": [
      { "category": "Audio", "revenue": 796.00, "unitsSold": 2 },
      { "category": "Accessories", "revenue": 159.00, "unitsSold": 1 }
    ],
    "topProducts": [ ... ],
    "recentOrders": [ ... ]
  }
}
```

---

### 4.2 List Customer Orders
- **Endpoint:** `GET /api/admin/orders`
- **Access:** Administrator
- **Query Parameters:** `status` (`'all'`, `'Processing'`, `'Shipped'`, `'Delivered'`, `'Cancelled'`), `search`

#### Response (`200 OK`):
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "order_number": "ORD-89421",
      "customer_name": "Farhan Siddiqui",
      "customer_email": "customer@store.com",
      "shipping_address": "124 Tech Valley Road",
      "city": "San Jose",
      "state": "CA",
      "zip_code": "95112",
      "subtotal": 398.00,
      "tax": 31.84,
      "shipping_fee": 0.00,
      "total_price": 429.84,
      "order_status": "Delivered",
      "created_at": "2026-09-08 15:20:00",
      "items": [ ... ]
    }
  ]
}
```

---

### 4.3 Update Order Status
- **Endpoint:** `PATCH /api/admin/orders/:id/status`
- **Access:** Administrator

#### Request Body:
```json
{
  "status": "Shipped"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Order #1 status updated to Shipped."
}
```

---

### 4.4 Create Product Dynamically
- **Endpoint:** `POST /api/admin/products`
- **Access:** Administrator

#### Request Body:
```json
{
  "name": "EncoderX Dev Mechanical Numpad",
  "description": "CNC milled aluminum casing with wireless multi-device Bluetooth.",
  "price": 69.99,
  "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80",
  "category": "Accessories",
  "stock_count": 35,
  "rating": 4.9
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Product created successfully!",
  "product": {
    "id": 17,
    "name": "EncoderX Dev Mechanical Numpad",
    "price": 69.99,
    "stock_count": 35,
    "category": "Accessories"
  }
}
```

---

### 4.5 Update Existing Product
- **Endpoint:** `PUT /api/admin/products/:id`
- **Access:** Administrator

#### Request Body:
```json
{
  "price": 59.99,
  "stock_count": 50
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Product updated successfully!",
  "product": {
    "id": 17,
    "price": 59.99,
    "stock_count": 50
  }
}
```

---

### 4.6 Delete Product
- **Endpoint:** `DELETE /api/admin/products/:id`
- **Access:** Administrator

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Product \"EncoderX Dev Mechanical Numpad\" has been deleted from inventory."
}
```
