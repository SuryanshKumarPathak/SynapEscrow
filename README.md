# 🚀 SynapEscrow - AI-Powered Autonomous Payment System

An intelligent escrow platform with AI-driven milestone generation, automatic payment release, and autonomous freelancer-employer matching.

## 🎯 Key Features

### ✅ **Automatic Payment Release**
- Milestones automatically trigger payment when 100% completed
- No manual intervention needed
- Transparent payment history tracking
- UPI/Razorpay payment gateway integration

### 🤖 **AI Milestone Generation**
- Gemini AI generates structured project milestones
- Automatic payout percentage calculation
- Realistic time estimates based on complexity
- Professional project title generation

### 💼 **Dashboard System**
- **Employer Dashboard**: Post projects, track payments, manage freelancers
- **Freelancer Dashboard**: View available projects, track earnings, auto-payment status
- Real-time milestone completion tracking
- Payment history visibility

### 🏦 **Smart Features**
- Escrow budget locking on project posting
- Automatic freelancer profile management
- UPI integration for Indian market
- MongoDB persistence for all data

---

## 📂 Project Structure

```
SynapEscrow/
├── backend-ai/              # AI Service & Escrow Logic (Port 4000)
│   ├── controllers/         # Route handlers
│   ├── services/            # Business logic (AI, payments, escrow)
│   ├── routes/              # API endpoints
│   └── index.js             # Server entry
│
├── web-app/                 # Full-stack App (Ports 3000 & 5000)
│   ├── backend/             # Express API Server
│   │   ├── controllers/     # Project, user, payment logic
│   │   ├── models/          # MongoDB schemas
│   │   ├── services/        # Payment & milestone services
│   │   └── server.js        # Backend entry
│   │
│   └── frontend/            # Next.js React Dashboard
│       ├── src/app/dashboard/
│       │   ├── employer/    # Employer interface
│       │   └── freelancer/  # Freelancer interface
│       └── services/        # API client services
│
└── package.json             # Root npm scripts (concurrently)
```

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account (free tier available)
- Gemini API key (free)
- Razorpay account (optional - simulated for testing)

### **Installation**

1. **Clone Repository**
```bash
git clone https://github.com/SuryanshKumarPathak/SynapEscrow.git
cd SynapEscrow
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment Variables**

Create `.env` files in each service:

**`backend-ai/.env`**
```
PORT=4000
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

**`web-app/backend/.env`**
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

**`web-app/frontend/.env.local`**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:4000/api
```

4. **Start All Services**
```bash
npm run dev
```

This launches:
- **Backend API**: http://localhost:5000
- **Frontend Dashboard**: http://localhost:3000
- **AI Service**: http://localhost:4000

---

## 💾 API Endpoints

### **Projects**
- `POST /api/projects` - Create project with milestones
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/milestones/progress` - Record milestone completion (triggers auto-payment)

### **AI Service**
- `POST /api/generate-milestones` - Generate AI milestones
- `POST /api/create-payment` - Create Razorpay order

### **User Management**
- `POST /api/auth/register` - User signup
- `POST /api/auth/login` - User login
- `PUT /api/profile` - Update profile & UPI details

---

## 🤖 How Auto-Payment Works

1. **Project Posted** → Employer funds escrow
2. **Milestone Progress** → Freelancer submits work
3. **100% Completion** → AI verifies completion
4. **Automatic Release** → Payment sent to freelancer UPI
5. **History Logged** → Transaction recorded in MongoDB

```
Employer Posts → Escrow Locked → Work Submitted → AI Verify → Auto-Payment
```

---

## 📊 Testing Auto-Payment

```bash
node test-autopay.js
```

Output:
```
✅ AUTO-PAYMENT TRIGGERED!
Status: processing
Transaction ID: PAYOUT-69b511e2-Testing-1773476756472
Amount: ₹10,000
```

---

## 🌐 Free Deployment Options

### **Option 1: Render.com (Recommended)**

**Frontend Deployment:**
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repo
5. Set Build Command: `npm install && npm run build`
6. Set Start Command: `npm run start`
7. Add Environment Variables
8. Deploy ✅

**Backend Deployment (Same Process)**
- Build: `npm install`
- Start: `node server.js`

**Cost**: Free tier (auto-sleeps after 15 min inactivity)

---

### **Option 2: Vercel (Next.js Frontend Only)**

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import project
4. Vercel auto-detects Next.js
5. Add environment variables
6. Deploy ✅

**Cost**: Free forever (with some limits)

---

### **Option 3: Railway.app**

1. Connect GitHub repo at [railway.app](https://railway.app)
2. Auto-detects Node.js
3. Set environment variables
4. Deploy ✅

**Cost**: $5/month free credit (generous free tier)

---

### **Option 4: Heroku (Classic but Limited Free)**

Heroku ended free tier in 2022. Use **Render** or **Railway** instead.

---

## 📋 Deployment Checklist

- [ ] Update MongoDB connection string (production URI)
- [ ] Set production Razorpay credentials
- [ ] Update CORS URLs in backend
- [ ] Set proper environment variables
- [ ] Update frontend API URLs to production backend
- [ ] Test all payment flows
- [ ] Enable HTTPS (automatic on Render/Vercel)
- [ ] Set up database backups

---

## 🧪 Testing Workflow

### **Local Testing**
```bash
# 1. Start all services
npm run dev

# 2. In another terminal, test auto-payment
node test-autopay.js

# 3. Visit frontend
open http://localhost:3000
```

### **Production Testing (Render)**
```bash
# Logs visible in Render dashboard
# Test endpoints: https://your-app.onrender.com/api/projects
```

---

## 📚 Tech Stack

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- Razorpay SDK
- Google Generative AI (Gemini)

**Frontend**
- Next.js 14
- React
- Tailwind CSS
- TanStack Query

**Infrastructure**
- Git + GitHub
- Render/Vercel/Railway for hosting
- MongoDB Atlas (free tier)

---

## 🔒 Security Notes

- 🔑 Never commit `.env` files
- 🛡️ CORS configured for production domains
- 💳 Razorpay keys stored server-side only
- 🔐 MongoDB authentication enabled
- ✅ Input validation on all APIs

---

## 🐛 Troubleshooting

### Ports Already in Use
```bash
# Kill process on port 3000/5000/4000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### MongoDB Connection Failed
- Check MONGO_URI in `.env`
- Whitelist your IP in MongoDB Atlas
- Verify authentication credentials

### AI Generation Timing Out
- Check Gemini API key validity
- Rate limits on free tier (60 RPM)
- Add retry logic for production

### Payment Not Triggering
- Verify Razorpay keys
- Check milestone completion value = 100
- Ensure freelancer has UPI in profile

---

## 📞 Support & Contribution

- **Issues**: Report bugs on GitHub
- **PRs**: Welcome! Follow conventional commits
- **Contact**: [GitHub Profile](https://github.com/SuryanshKumarPathak)

---

## 📄 License

MIT License - Feel free to use for personal/commercial projects

---

## 🎓 Learning Resources

- [Express.js Docs](https://expressjs.com/)
- [Next.js Guide](https://nextjs.org/docs)
- [MongoDB University](https://university.mongodb.com/)
- [Razorpay Integration](https://razorpay.com/docs/)
- [Render Deployment](https://render.com/docs)

---

**Made with ❤️ by IIT Roorkee Development Team**

**🚀 Happy Deploying!**
