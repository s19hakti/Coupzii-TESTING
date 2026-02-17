# Coupzii Backend Implementation Guide

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Security](#authentication--security)
6. [AI Assistant Integration](#ai-assistant-integration)
7. [Payment Gateway](#payment-gateway)
8. [Deployment Guide](#deployment-guide)
9. [Scalability & Performance](#scalability--performance)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 1. Technology Stack

### Recommended Backend Stack:

**Primary Backend:**
- **Node.js + Express.js** (Fast, scalable, JavaScript-based)
- **Alternative:** Python + FastAPI (Better for AI/ML integration)

**Database:**
- **PostgreSQL** (Primary database for structured data)
- **MongoDB** (For coupon images, logs, analytics)
- **Redis** (Caching layer for performance)

**AI/ML Services:**
- **OpenAI GPT-4** or **Anthropic Claude API** (For AI Assistant)
- **Google Cloud Speech-to-Text** (Voice commands)
- **TensorFlow** (Custom ML models for coupon recommendations)

**Cloud Infrastructure:**
- **AWS** or **Google Cloud Platform** or **Microsoft Azure**
- **AWS S3** (File storage for coupon screenshots)
- **AWS Lambda** (Serverless functions)
- **AWS RDS** (Managed PostgreSQL)
- **AWS ElastiCache** (Redis caching)

**Additional Services:**
- **Twilio** or **Firebase** (SMS/OTP authentication)
- **Stripe** or **Razorpay** (Payment processing)
- **Cloudflare** (CDN and DDoS protection)
- **Socket.io** (Real-time features)
- **Bull Queue** (Background job processing)

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/HTML)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway / Load Balancer                 │
│                    (NGINX / AWS ALB)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Auth Service │ │ User API │ │  Brand API   │
└──────┬───────┘ └────┬─────┘ └──────┬───────┘
       │              │                │
       │         ┌────┴────────────────┴────┐
       │         ▼                           ▼
       │  ┌─────────────┐           ┌──────────────┐
       └─▶│ PostgreSQL  │           │   MongoDB    │
          └─────────────┘           └──────────────┘
                  │                         │
                  └────────┬────────────────┘
                           ▼
                  ┌─────────────────┐
                  │ Redis (Cache)   │
                  └─────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ AI Assistant │  │  Payment     │  │   Storage    │
│   Service    │  │  Gateway     │  │   (S3)       │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 3. Database Schema

### PostgreSQL Tables:

#### Users Table
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(255),
    fcm_token TEXT -- For push notifications
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
```

#### Brands Table
```sql
CREATE TABLE brands (
    brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    logo_url TEXT,
    description TEXT,
    website VARCHAR(255),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    subscription_tier VARCHAR(50) DEFAULT 'basic'
);
```

#### Brand Departments Table
```sql
CREATE TABLE brand_departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(brand_id) ON DELETE CASCADE,
    department_name VARCHAR(100),
    access_level JSONB, -- {upload: true, analytics: true, etc}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Department Users Table
```sql
CREATE TABLE department_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES brand_departments(department_id),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Coupons Table
```sql
CREATE TABLE coupons (
    coupon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    brand_id UUID REFERENCES brands(brand_id),
    owner_user_id UUID REFERENCES users(user_id),
    source VARCHAR(50), -- 'brand', 'user_upload', 'synced', 'purchased'
    
    -- Coupon Details
    coupon_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50), -- 'percentage', 'fixed_amount', 'bogo', 'free_shipping'
    discount_value DECIMAL(10, 2),
    
    -- Conditions
    minimum_order_value DECIMAL(10, 2),
    maximum_discount DECIMAL(10, 2),
    category VARCHAR(100),
    product_ids JSONB, -- Array of applicable products
    
    -- Validity
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Stock & Usage
    total_stock INTEGER,
    remaining_stock INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    
    -- Metadata
    image_url TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Analytics
    total_views INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_redemptions INTEGER DEFAULT 0
);

CREATE INDEX idx_coupons_brand ON coupons(brand_id);
CREATE INDEX idx_coupons_owner ON coupons(owner_user_id);
CREATE INDEX idx_coupons_code ON coupons(coupon_code);
CREATE INDEX idx_coupons_validity ON coupons(valid_from, valid_until);
```

#### User Wallet Table
```sql
CREATE TABLE user_wallet (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES coupons(coupon_id),
    
    source VARCHAR(50), -- 'synced', 'purchased', 'exchanged'
    purchase_price DECIMAL(10, 2),
    
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    
    -- For synced coupons
    screenshot_url TEXT,
    ocr_data JSONB
);

CREATE INDEX idx_wallet_user ON user_wallet(user_id);
CREATE INDEX idx_wallet_coupon ON user_wallet(coupon_id);
```

#### Marketplace Listings Table
```sql
CREATE TABLE marketplace_listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_user_id UUID REFERENCES users(user_id),
    coupon_id UUID REFERENCES coupons(coupon_id),
    
    listing_price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_exchangeable BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP,
    buyer_user_id UUID REFERENCES users(user_id)
);

CREATE INDEX idx_listings_active ON marketplace_listings(is_active);
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_user_id);
```

#### Exchanges Table
```sql
CREATE TABLE exchanges (
    exchange_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_user_id UUID REFERENCES users(user_id),
    recipient_user_id UUID REFERENCES users(user_id),
    
    offered_coupon_id UUID REFERENCES coupons(coupon_id),
    requested_coupon_id UUID REFERENCES coupons(coupon_id),
    
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    
    transaction_type VARCHAR(50), -- 'purchase', 'sale', 'exchange'
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    
    coupon_id UUID REFERENCES coupons(coupon_id),
    payment_gateway VARCHAR(50),
    payment_id VARCHAR(255),
    
    status VARCHAR(50), -- 'pending', 'completed', 'failed', 'refunded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Coupon Analytics Table
```sql
CREATE TABLE coupon_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(coupon_id),
    
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    redemptions INTEGER DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0,
    
    demographics JSONB, -- User demographics
    locations JSONB, -- Geographic data
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_coupon_date ON coupon_analytics(coupon_id, date);
```

#### AI Assistant Conversations Table
```sql
CREATE TABLE ai_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    
    session_id VARCHAR(255),
    messages JSONB, -- Array of {role, content, timestamp}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Notifications Table
```sql
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50), -- 'expiry_alert', 'new_deal', 'exchange_request'
    
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Endpoints

### Authentication APIs

#### POST /api/auth/register/user
```json
{
  "email": "user@example.com",
  "phone": "+91234567890",
  "password": "securePassword123",
  "full_name": "John Doe"
}
```

#### POST /api/auth/register/brand
```json
{
  "brand_name": "ZARA",
  "email": "brand@zara.com",
  "password": "securePassword123",
  "category": "Fashion"
}
```

#### POST /api/auth/login
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "login_type": "user" // or "brand"
}
```

#### POST /api/auth/verify-otp
```json
{
  "user_id": "uuid",
  "otp": "123456"
}
```

#### POST /api/auth/refresh-token
```json
{
  "refresh_token": "token"
}
```

### User APIs

#### GET /api/user/wallet
- Returns all coupons in user's wallet
- Query params: ?source=synced&status=active

#### POST /api/user/wallet/add
```json
{
  "screenshot_url": "s3://bucket/image.jpg",
  "manual_entry": {
    "code": "ZARA50",
    "brand": "ZARA",
    "discount": "50%"
  }
}
```

#### GET /api/user/marketplace
- Returns marketplace listings
- Query params: ?category=fashion&sort=price

#### POST /api/user/marketplace/buy
```json
{
  "listing_id": "uuid",
  "payment_method": "razorpay"
}
```

#### POST /api/user/exchange/request
```json
{
  "recipient_user_id": "uuid",
  "offered_coupon_id": "uuid",
  "requested_coupon_id": "uuid"
}
```

### Brand APIs

#### POST /api/brand/coupon/create
```json
{
  "title": "Summer Sale",
  "coupon_code": "SUMMER50",
  "discount_type": "percentage",
  "discount_value": 50,
  "minimum_order_value": 2999,
  "valid_from": "2026-06-01",
  "valid_until": "2026-08-31",
  "total_stock": 10000
}
```

#### POST /api/brand/coupon/bulk-upload
- Accepts CSV/Excel file
- Validates and creates multiple coupons

#### GET /api/brand/analytics
- Query params: ?start_date=2026-01-01&end_date=2026-12-31

#### GET /api/brand/analytics/product/:product_id
- Returns product-specific analytics

#### GET /api/brand/analytics/export
- Returns Excel file with all analytics

### AI Assistant APIs

#### POST /api/ai/chat
```json
{
  "user_id": "uuid",
  "message": "Find ZARA coupons",
  "context": {
    "current_cart": [...],
    "location": "Mumbai"
  }
}
```

#### POST /api/ai/voice
- Accepts audio file
- Returns transcription and response

#### POST /api/ai/analyze-cart
```json
{
  "user_id": "uuid",
  "cart_items": [
    {"product_id": "123", "price": 2500}
  ]
}
```

---

## 5. Authentication & Security

### JWT Token Implementation

```javascript
// Node.js Example
const jwt = require('jsonwebtoken');

// Generate Token
function generateToken(user) {
  const payload = {
    user_id: user.user_id,
    email: user.email,
    type: 'user' // or 'brand'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
}

// Middleware to verify token
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}
```

### Password Hashing

```javascript
const bcrypt = require('bcrypt');

// Hash password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Verify password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### OTP Implementation

```javascript
// Using Twilio
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

async function sendOTP(phone, otp) {
  await client.messages.create({
    body: `Your Coupzii verification code is: ${otp}`,
    from: '+1234567890',
    to: phone
  });
}

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

### Security Best Practices

1. **HTTPS Only** - Enforce SSL/TLS
2. **Rate Limiting** - Prevent brute force attacks
3. **Input Validation** - Sanitize all inputs
4. **SQL Injection Prevention** - Use parameterized queries
5. **CORS Configuration** - Whitelist allowed origins
6. **API Key Rotation** - Regular rotation of secrets
7. **Data Encryption** - Encrypt sensitive data at rest

```javascript
// Rate Limiting Example
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 6. AI Assistant Integration

### OpenAI Integration

```javascript
const OpenAI = require('openai');
const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function getAIResponse(userMessage, userContext) {
  const systemPrompt = `You are Coupzii's AI shopping assistant. 
  You help users find the best coupons and maximize their savings.
  
  User's wallet contains: ${JSON.stringify(userContext.wallet)}
  Current cart: ${JSON.stringify(userContext.cart)}
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    max_tokens: 500,
    temperature: 0.7
  });
  
  return response.choices[0].message.content;
}
```

### Voice Recognition

```javascript
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

async function transcribeAudio(audioBuffer) {
  const audio = {
    content: audioBuffer.toString('base64')
  };
  
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
  };
  
  const request = {
    audio: audio,
    config: config,
  };
  
  const [response] = await client.recognize(request);
  return response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
}
```

### Cart Analysis Algorithm

```javascript
async function analyzeCouponForCart(userId, cartItems) {
  // 1. Get user's wallet coupons
  const walletCoupons = await getUserWalletCoupons(userId);
  
  // 2. Get marketplace coupons
  const marketplaceCoupons = await getMarketplaceCoupons();
  
  // 3. Calculate savings for each coupon
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  
  const couponAnalysis = [...walletCoupons, ...marketplaceCoupons].map(coupon => {
    let savings = 0;
    
    // Check if cart meets minimum order value
    if (cartTotal < coupon.minimum_order_value) {
      return { coupon, applicable: false, reason: 'Minimum order not met' };
    }
    
    // Calculate savings
    if (coupon.discount_type === 'percentage') {
      savings = (cartTotal * coupon.discount_value) / 100;
      if (coupon.maximum_discount) {
        savings = Math.min(savings, coupon.maximum_discount);
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      savings = coupon.discount_value;
    }
    
    return {
      coupon,
      applicable: true,
      savings,
      finalPrice: cartTotal - savings
    };
  });
  
  // 4. Sort by maximum savings
  return couponAnalysis
    .filter(c => c.applicable)
    .sort((a, b) => b.savings - a.savings);
}
```

---

## 7. Payment Gateway Integration

### Razorpay Integration (for India)

```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
async function createPaymentOrder(amount, userId, couponId) {
  const options = {
    amount: amount * 100, // amount in paise
    currency: 'INR',
    receipt: `coupon_${couponId}_${Date.now()}`,
    notes: {
      user_id: userId,
      coupon_id: couponId
    }
  };
  
  const order = await razorpay.orders.create(options);
  return order;
}

// Verify payment
function verifyPayment(orderId, paymentId, signature) {
  const crypto = require('crypto');
  const body = orderId + '|' + paymentId;
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

// Webhook handler
app.post('/api/payment/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  
  const isValid = razorpay.webhooks.validateWebhookSignature(
    JSON.stringify(req.body),
    signature,
    secret
  );
  
  if (isValid) {
    const event = req.body.event;
    
    if (event === 'payment.captured') {
      // Update transaction status
      await updateTransactionStatus(req.body.payload.payment.entity.id, 'completed');
      // Transfer coupon to buyer
      await transferCouponToBuyer(req.body);
    }
    
    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ error: 'Invalid signature' });
  }
});
```

---

## 8. Deployment Guide

### Step 1: Set Up Cloud Infrastructure

#### AWS Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS
aws configure
```

#### Create RDS Database

```bash
# Create PostgreSQL instance
aws rds create-db-instance \
    --db-instance-identifier coupzii-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --master-username admin \
    --master-user-password YourSecurePassword \
    --allocated-storage 20
```

#### Create S3 Bucket

```bash
aws s3 mb s3://coupzii-uploads
aws s3api put-public-access-block \
    --bucket coupzii-uploads \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true"
```

### Step 2: Deploy Backend

#### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/coupzii
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=coupzii
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=securepass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

#### Deploy to AWS ECS

```bash
# Build and push Docker image
docker build -t coupzii-api .
docker tag coupzii-api:latest 123456789.dkr.ecr.region.amazonaws.com/coupzii-api:latest
docker push 123456789.dkr.ecr.region.amazonaws.com/coupzii-api:latest

# Create ECS cluster
aws ecs create-cluster --cluster-name coupzii-cluster

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
    --cluster coupzii-cluster \
    --service-name coupzii-api \
    --task-definition coupzii-api \
    --desired-count 2 \
    --launch-type FARGATE
```

### Step 3: Set Up Load Balancer

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
    --name coupzii-alb \
    --subnets subnet-12345 subnet-67890 \
    --security-groups sg-12345

# Create target group
aws elbv2 create-target-group \
    --name coupzii-targets \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-12345
```

### Step 4: Configure Domain & SSL

```bash
# Request SSL certificate
aws acm request-certificate \
    --domain-name coupzii.com \
    --subject-alternative-names www.coupzii.com \
    --validation-method DNS

# Create Route53 hosted zone
aws route53 create-hosted-zone --name coupzii.com
```

### Step 5: Environment Variables

```bash
# .env file
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/coupzii
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=24h

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=coupzii-uploads

# Payment
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=secret_xxxxx
RAZORPAY_WEBHOOK_SECRET=webhook_secret

# AI Services
OPENAI_API_KEY=sk-xxxxx
GOOGLE_CLOUD_PROJECT_ID=project-id

# SMS/OTP
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=token
TWILIO_PHONE_NUMBER=+1234567890

# Email
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@coupzii.com
```

---

## 9. Scalability & Performance

### Caching Strategy

```javascript
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

// Cache marketplace listings
async function getMarketplaceCoupons(category) {
  const cacheKey = `marketplace:${category}`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // If not in cache, query database
  const coupons = await db.query(
    'SELECT * FROM marketplace_listings WHERE category = $1',
    [category]
  );
  
  // Store in cache for 5 minutes
  await client.setEx(cacheKey, 300, JSON.stringify(coupons));
  
  return coupons;
}
```

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_coupons_valid_active ON coupons(is_active, valid_until) 
WHERE is_active = true;

CREATE INDEX idx_wallet_user_active ON user_wallet(user_id, is_used) 
WHERE is_used = false;

-- Partitioning analytics table by date
CREATE TABLE coupon_analytics_2026 PARTITION OF coupon_analytics
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### Load Balancing

```nginx
# nginx.conf
upstream coupzii_backend {
    least_conn;
    server backend1.coupzii.com:3000;
    server backend2.coupzii.com:3000;
    server backend3.coupzii.com:3000;
}

server {
    listen 80;
    server_name coupzii.com;

    location / {
        proxy_pass http://coupzii_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Background Jobs

```javascript
const Bull = require('bull');
const expiryQueue = new Bull('coupon-expiry-check');

// Add job to check expired coupons
expiryQueue.add('check-expiry', {}, {
  repeat: { cron: '0 0 * * *' } // Daily at midnight
});

// Process job
expiryQueue.process('check-expiry', async (job) => {
  const expiredCoupons = await db.query(
    'SELECT * FROM coupons WHERE valid_until < NOW() AND is_active = true'
  );
  
  for (const coupon of expiredCoupons) {
    // Mark as inactive
    await db.query(
      'UPDATE coupons SET is_active = false WHERE coupon_id = $1',
      [coupon.coupon_id]
    );
    
    // Notify users
    await notifyUsersOfExpiry(coupon.coupon_id);
  }
});
```

---

## 10. Monitoring & Maintenance

### Application Monitoring

```javascript
// Install: npm install @sentry/node
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Error tracking
app.use(Sentry.Handlers.errorHandler());
```

### Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log API requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    user_id: req.user?.user_id
  });
  next();
});
```

### Health Checks

```javascript
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    services: {}
  };
  
  // Check database
  try {
    await db.query('SELECT 1');
    health.services.database = 'OK';
  } catch (err) {
    health.services.database = 'DOWN';
    health.status = 'DEGRADED';
  }
  
  // Check Redis
  try {
    await client.ping();
    health.services.redis = 'OK';
  } catch (err) {
    health.services.redis = 'DOWN';
    health.status = 'DEGRADED';
  }
  
  res.json(health);
});
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily database backup

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="coupzii_backup_${TIMESTAMP}.sql"

# Dump database
pg_dump -h localhost -U admin coupzii > "${BACKUP_DIR}/${FILENAME}"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://coupzii-backups/${FILENAME}"

# Keep only last 30 days locally
find ${BACKUP_DIR} -name "*.sql" -mtime +30 -delete

echo "Backup completed: ${FILENAME}"
```

---

## Next Steps for Production

### 1. Testing
- Unit tests with Jest
- Integration tests
- Load testing with Apache JMeter
- Security testing with OWASP ZAP

### 2. CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
      - name: Build Docker image
        run: docker build -t coupzii-api .
      - name: Deploy to AWS
        run: |
          aws ecs update-service --cluster coupzii --service api --force-new-deployment
```

### 3. Compliance
- GDPR compliance for EU users
- PCI DSS for payment data
- SOC 2 certification
- Privacy policy and terms of service

### 4. Performance Optimization
- CDN setup with CloudFlare
- Image optimization
- Database query optimization
- API response caching

---

## Cost Estimation (Monthly)

### Basic Setup (1000 users)
- AWS EC2 (t3.medium x 2): $60
- RDS (db.t3.medium): $100
- S3 Storage (10GB): $2
- CloudFront CDN: $10
- OpenAI API: $50
- Razorpay (2.5% + ₹3): Variable
- **Total: ~$222/month + transaction fees**

### Medium Scale (50,000 users)
- AWS ECS Fargate: $300
- RDS (db.m5.large): $300
- ElastiCache Redis: $50
- S3 Storage (100GB): $20
- CloudFront CDN: $100
- OpenAI API: $500
- **Total: ~$1,270/month + transaction fees**

### Large Scale (500,000+ users)
- Auto-scaling infrastructure: $2000+
- Multi-region deployment: $1000+
- Advanced monitoring: $200
- DDoS protection: $500
- **Total: ~$5,000-10,000/month**

---

## Support & Maintenance

For any questions or issues during implementation, please contact:
- Technical Support: tech@coupzii.com
- Documentation: https://docs.coupzii.com

---

**Last Updated:** February 14, 2026
**Version:** 1.0.0