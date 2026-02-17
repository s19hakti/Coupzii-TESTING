# 🎫 Coupzii - QUICK START GUIDE

## 📁 What You Have

You now have a **COMPLETE, PRODUCTION-READY** Coupzii deployment package!

### Package Contents:

1. **Full Backend** (Node.js + Express)
   - ✅ All API endpoints implemented
   - ✅ Authentication & JWT
   - ✅ Database integration (PostgreSQL)
   - ✅ Redis caching
   - ✅ Payment gateway (Razorpay)
   - ✅ AI Assistant (OpenAI)
   - ✅ File upload (AWS S3)
   - ✅ Email & SMS services

2. **Complete Frontend**
   - ✅ Beautiful responsive website
   - ✅ User & Brand dashboards
   - ✅ Marketplace
   - ✅ AI chat interface
   - ✅ Wallet management

3. **Database Schema**
   - ✅ All tables created
   - ✅ Indexes optimized
   - ✅ Relationships defined

4. **Docker Setup**
   - ✅ Dockerfile
   - ✅ docker-compose.yml
   - ✅ One-command deployment

5. **Documentation**
   - ✅ Complete README
   - ✅ API documentation
   - ✅ Deployment guides
   - ✅ Troubleshooting

---

## 🚀 DEPLOY IN 3 STEPS (Literally 5 Minutes!)

### Step 1: Extract the Package
```bash
# If you have the .tar.gz file:
tar -xzf coupzii-complete-deployment.tar.gz
cd coupzii-deployment

# Or just navigate to the folder:
cd coupzii-deployment
```

### Step 2: Configure (30 seconds)
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit with your favorite editor
nano backend/.env   # or vim, code, etc.
```

**Minimum configuration needed:**
```env
JWT_SECRET=put-any-random-long-string-here
```

That's it! Everything else has defaults.

### Step 3: Deploy!
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**DONE! 🎉**

---

## 🌐 Access Your Application

### Backend API
- URL: http://localhost:3000
- Health Check: http://localhost:3000/health
- API Docs: See README.md for all endpoints

### Frontend Website
1. Open a browser
2. Navigate to `frontend/index.html`
3. Or serve it:
```bash
cd frontend
python3 -m http.server 8080
# Visit http://localhost:8080
```

### Database
- Host: localhost
- Port: 5432
- Database: coupzii
- Username: admin
- Password: coupzii2024

---

## 🧪 Test It Out!

### 1. Check if backend is running:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "uptime": 123.45,
  "timestamp": 1707912345678,
  "status": "OK",
  "environment": "production"
}
```

### 2. Register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123",
    "full_name": "Test User",
    "phone": "+911234567890"
  }'
```

### 3. Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123",
    "login_type": "user"
  }'
```

You'll get back a JWT token! 🎉

---

## 🌍 Deploy to Production

### Option 1: Free Hosting (Render.com)

1. Create account at https://render.com
2. New Web Service → Connect GitHub
3. Settings:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
4. Add environment variables
5. Create PostgreSQL database (free)
6. Deploy!

### Option 2: AWS EC2

1. Launch Ubuntu instance
2. SSH into it
3. Run:
```bash
git clone your-repo
cd coupzii-deployment
./scripts/deploy.sh
```

### Option 3: DigitalOcean

1. Create Droplet (Ubuntu)
2. SSH and deploy:
```bash
curl -fsSL https://get.docker.com | sh
git clone your-repo
cd coupzii-deployment
./scripts/deploy.sh
```

---

## 📱 What Works Out of the Box

✅ **User Registration & Login**
- Email + password authentication
- JWT tokens
- OTP verification (if SMS configured)

✅ **User Wallet**
- Add coupons manually
- Upload screenshots
- View all coupons
- Track usage

✅ **Marketplace**
- List coupons for sale
- Browse available coupons
- Buy coupons (with payment)

✅ **Brand Dashboard**
- Create coupons
- Bulk upload (CSV/Excel)
- View analytics
- Track performance

✅ **AI Assistant**
- Chat interface
- Coupon recommendations
- Cart analysis

✅ **Payments**
- Razorpay integration
- Transaction tracking

---

## ⚙️ Optional Configurations

### Add Email Service (for OTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Add SMS Service (Twilio)
```env
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Add Payment Gateway
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret
```

### Add AI Assistant
```env
OPENAI_API_KEY=sk-xxxxx
```

### Add File Storage (AWS S3)
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret
S3_BUCKET_NAME=coupzii-uploads
```

---

## 🔧 Useful Commands

### View Logs
```bash
cd docker
docker-compose logs -f          # All logs
docker-compose logs -f backend  # Backend only
```

### Restart Services
```bash
docker-compose restart
docker-compose restart backend  # Backend only
```

### Stop Everything
```bash
docker-compose down
```

### Start Again
```bash
docker-compose up -d
```

### Access Database
```bash
docker exec -it docker_postgres_1 psql -U admin -d coupzii
```

---

## 🐛 Troubleshooting

### "Port 3000 already in use"
```bash
lsof -i :3000
kill -9 <PID>
```

### "Database connection failed"
```bash
docker-compose restart postgres
docker-compose logs postgres
```

### "Permission denied"
```bash
chmod +x scripts/deploy.sh
```

---

## 📂 Project Structure

```
coupzii-deployment/
├── backend/                 # Backend server
│   ├── server.js           # Main entry point
│   ├── package.json        # Dependencies
│   ├── routes/             # API routes
│   ├── middleware/         # Auth, validation
│   ├── services/           # External services
│   └── config/             # Database, Redis
├── frontend/               # Website
│   └── index.html          # Main website file
├── database/               # Database
│   └── schema.sql          # PostgreSQL schema
├── docker/                 # Docker
│   ├── Dockerfile          # Backend container
│   └── docker-compose.yml  # All services
└── scripts/                # Deployment
    └── deploy.sh           # One-click deploy
```

---

## 📊 What's Included in Backend

### Routes (routes/)
- ✅ auth.js - User/Brand registration, login, OTP
- ✅ user.js - Wallet, marketplace, profile
- ✅ brand.js - Coupon creation, analytics
- ✅ coupon.js - Coupon operations
- ✅ marketplace.js - Listings
- ✅ ai.js - AI assistant
- ✅ payment.js - Payment processing
- ✅ analytics.js - Statistics

### Middleware (middleware/)
- ✅ auth.js - JWT verification
- ✅ validation.js - Input validation
- ✅ errorHandler.js - Error handling

### Services (services/)
- ✅ sms.js - SMS/OTP sending
- ✅ email.js - Email sending
- ✅ storage.js - File uploads (S3)

### Config (config/)
- ✅ database.js - PostgreSQL connection
- ✅ redis.js - Redis caching

---

## 🎯 Next Steps

### 1. Test Everything (10 minutes)
- Register user
- Login
- Add coupon to wallet
- Create brand account
- Upload coupon as brand
- Test marketplace
- Try payment (test mode)

### 2. Configure Optional Services (as needed)
- Email (for OTP)
- SMS (for OTP)
- Payment (Razorpay)
- AI (OpenAI)
- Storage (AWS S3)

### 3. Deploy to Production
- Choose hosting provider
- Set up domain
- Configure SSL
- Set environment variables
- Deploy!

### 4. Launch
- Marketing
- User acquisition
- Monitor & improve

---

## 💡 Tips

1. **Start Simple**: Deploy locally first, test everything, then go to production

2. **Environment Variables**: Don't commit .env file to git! Keep secrets secret.

3. **Backups**: Set up automatic database backups before going live

4. **Monitoring**: Add error tracking (Sentry) and uptime monitoring

5. **Scaling**: Start small, scale as you grow

---

## 🆘 Need Help?

1. **Check the documentation**
   - README.md (general info)
   - DEPLOYMENT_GUIDE.md (detailed deployment)
   - backend-implementation-guide.md (technical details)

2. **Common issues are documented** in the troubleshooting sections

3. **Test locally first** before deploying to production

4. **Use Docker** - it makes everything consistent

---

## 🎉 You're Ready!

Everything is set up and ready to go. Just follow the 3 steps above and you'll have Coupzii running in minutes!

**Remember:**
- The backend is fully functional
- The frontend is connected
- Database schema is created
- Docker makes deployment easy
- Documentation covers everything

**Good luck with your launch! 🚀**

---

## 📞 Support

If you need any changes or have questions about the deployment:
1. Check the documentation
2. Review the code comments
3. Test locally first
4. Deploy to production

**The entire system is production-ready and waiting for you to configure and deploy!**

---

Made with ❤️ for Coupzii
