# 🚀 100% FREE Legal RAG System with Twice-Weekly Updates

A completely free Retrieval-Augmented Generation (RAG) system for Indian legal judgments with automatic twice-weekly updates.

## 💰 ZERO-COST TECH STACK (₹0 - ₹2000 max)

| Component | Free Solution | Limit | Cost |
|-----------|--------------|-------|------|
| **Backend Hosting** | Railway.app | $5 credit/month | ₹0 |
| **Vector DB** | Qdrant Cloud | 1GB forever free | ₹0 |
| **LLM API** | Groq (Llama 3.3 70B) | 14,400 req/day | ₹0 |
| **Embedding Model** | Sentence-Transformers | Free (self-hosted) | ₹0 |
| **Frontend Hosting** | Vercel | Unlimited hobby | ₹0 |
| **Authentication** | Firebase Auth | 50K users/month | ₹0 |
| **Database** | Firebase Firestore | 1GB storage | ₹0 |
| **Scheduler** | GitHub Actions | 2000 min/month | ₹0 |

**Total Monthly Cost: ₹0** (stays within free tiers)

---

## 📁 Project Structure

```
legal-rag-free/
├── .github/
│   └── workflows/
│       └── scraper.yml          # Twice-weekly auto-scraper
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI with Groq
│   │   ├── embeddings.py       # Sentence-Transformers
│   │   ├── qdrant_client.py    # Free Qdrant Cloud
│   │   └── scraper.py          # PDF downloader
│   ├── requirements.txt
│   ├── railway.json            # Railway config
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Firebase auth
│   │   ├── lib/
│   │   │   ├── firebase.ts     # Firebase config
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx # Homepage
│   │   │   ├── AboutPage.tsx   # About
│   │   │   ├── LoginPage.tsx   # Login
│   │   │   ├── SignupPage.tsx  # Signup
│   │   │   └── ChatPage.tsx    # Chat UI
│   │   ├── main.tsx            # Entry point
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json           # TypeScript config
│   ├── tailwind.config.js      # Tailwind + theme
│   ├── vite.config.ts
│   ├── vercel.json             # Vercel config
│   ├── SETUP.md                # Frontend setup guide
│   └── .env.example
├── data/
│   ├── raw/                    # PDF storage
│   └── embeddings/             # Metadata
├── .gitignore
└── README.md
```

---

## 🚀 QUICK START (30 Minutes)

### **Step 1: Get Free API Keys** (10 minutes)

#### 1. Groq API (Fastest LLM - Recommended)
- Visit: https://console.groq.com
- Sign up with Google/Email
- Go to **API Keys** → Create new key
- Copy the key (starts with `gsk_...`)
- **Limit**: 14,400 requests/day, 70K tokens/min

#### 2. Google Gemini API (Backup)
- Visit: https://aistudio.google.com
- Click **Get API Key** → Create key
- Copy the key
- **Limit**: 15 requests/min, 1M tokens/day

#### 3. Qdrant Cloud (Vector Database)
- Visit: https://cloud.qdrant.io
- Sign up → **Create Cluster** (Free tier)
- Select **1GB Free Forever** plan
- Copy **Cluster URL** and **API Key** from settings

#### 4. Firebase (Authentication & Firestore)
- Visit: https://console.firebase.google.com
- Create new project → Enable Auth & Firestore
- Get web config from Project Settings
- **Limit**: 50K auth users/month, 1GB storage

---

### **Step 2: Local Setup** (15 minutes)

#### Clone & Setup Backend
```powershell
cd "d:\SEMESTERS\Projects\CaseCut chatbot"

# Backend setup
cd backend
Copy-Item .env.example .env
# Edit .env and add your API keys

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

#### Setup Frontend
```powershell
cd ../frontend
Copy-Item .env.example .env
# Edit .env and add Firebase config + backend URL

# Install dependencies
npm install
```

---

### **Step 3: Initial Data Load** (5 minutes)

```powershell
cd ../backend

# 1. Add PDF files to data/raw/ folder
# (Download from Indian Kanoon, Supreme Court, etc.)

# 2. Create Qdrant collection and upload embeddings
python app/embeddings.py
```

**Sample output:**
```
✅ Collection created successfully!
✅ Processed judgment_1.pdf: 245 chunks
✅ Processed judgment_2.pdf: 189 chunks
✅ Uploaded 434 embeddings to Qdrant
```

---

### **Step 4: Test Locally** (5 minutes)

#### Start Backend
```powershell
# In backend directory with venv activated
uvicorn app.main:app --reload
```
Backend runs at: http://localhost:8000

#### Start Frontend (new terminal)
```powershell
cd frontend
npm run dev
```
Frontend runs at: http://localhost:3000

**Test the system:**
1. Open http://localhost:3000
2. Select role (Lawyer/Judge/Student)
3. Ask: "Recent bail provisions under IPC Section 302"
4. See RAG-powered response with case citations!

---

### **Step 5: Deploy Backend to Railway** (10 minutes)

#### Option A: GitHub Integration (Recommended)
1. Push code to GitHub:
```powershell
git init
git add .
git commit -m "Initial commit: Legal RAG system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/legal-rag-free.git
git push -u origin main
```

2. Deploy on Railway:
   - Visit: https://railway.app
   - **New Project** → **Deploy from GitHub**
   - Select your repository
   - Railway auto-detects Dockerfile

3. Add Environment Variables:
   - Go to **Variables** tab
   - Add all keys from `backend/.env`:
     ```
     GROQ_API_KEY=gsk_...
     GEMINI_API_KEY=...
     QDRANT_URL=https://...qdrant.io:6333
     QDRANT_KEY=...
     ```

4. Generate Domain:
   - Go to **Settings** → **Networking**
   - **Generate Domain** → Copy URL (e.g., `legal-rag-production.up.railway.app`)

#### Option B: Railway CLI
```powershell
npm i -g @railway/cli
railway login
railway init
railway up
```

---

### **Step 6: Deploy Frontend to Vercel** (5 minutes)

1. Update frontend environment:
```powershell
cd frontend
# Edit .env
VITE_API_URL=https://your-railway-domain.railway.app
```

2. Deploy:
```powershell
npm install -g vercel
vercel --prod
```

3. Follow prompts:
   - Link to existing project? **No**
   - Project name: `legal-rag-frontend`
   - Directory: `frontend`
   - Override settings? **No**

4. Vercel will:
   - Build your project
   - Deploy to production
   - Give you a URL: `https://legal-rag-frontend.vercel.app`

---

### **Step 7: Setup GitHub Actions** (5 minutes)

1. Go to GitHub → **Settings** → **Secrets and variables** → **Actions**

2. Add secrets:
   - `QDRANT_URL`
   - `QDRANT_KEY`

3. The workflow (`.github/workflows/scraper.yml`) will:
   - Run **Monday & Thursday at 2 AM IST**
   - Scrape new judgments
   - Process and upload to Qdrant
   - Auto-commit new data

4. Manual trigger:
   - **Actions** tab → **Scrape Judgments Twice Weekly** → **Run workflow**

---

## 📚 API Documentation

### Backend Endpoints

#### **POST /query**
Search legal cases and get AI summary.

**Request:**
```json
{
  "query": "What are the bail provisions under IPC 302?",
  "role": "lawyer",
  "k": 5
}
```

**Response:**
```json
{
  "cases": [
    {
      "id": "12345",
      "text": "In the matter of X vs State... bail conditions..."
    }
  ],
  "summary": "Under IPC Section 302 (murder), bail is typically non-bailable...",
  "source": "groq"
}
```

#### **GET /health**
Check service status.

**Response:**
```json
{
  "status": "healthy",
  "services": "groq+qdrant+free"
}
```

---

## 🔧 Development

### Backend Development
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```powershell
cd frontend
npm run dev
```

### Add New Legal Documents
```powershell
# 1. Add PDFs to data/raw/
Copy-Item "path/to/judgment.pdf" "data/raw/"

# 2. Process and upload
python backend/app/embeddings.py
```

### Test Scraper
```powershell
python backend/app/scraper.py
```

---

## 📊 Monitoring & Limits

### Check Usage
- **Railway**: https://railway.app/dashboard (shows $5 balance)
- **Groq**: https://console.groq.com/usage
- **Qdrant**: https://cloud.qdrant.io (storage usage)
- **GitHub Actions**: Repo → Actions → Check run minutes

### Free Tier Limits
| Service | Limit | Reset Period |
|---------|-------|--------------|
| Groq | 14,400 requests/day | Daily |
| Gemini | 15 requests/min | Per minute |
| Railway | $5 credit (~500MB RAM) | Monthly |
| Qdrant | 1GB storage | Forever |
| GitHub Actions | 2000 minutes | Monthly |
| Vercel | Unlimited deploys | Forever |

### If Limits Hit
1. **Railway $5 exhausted** → Switch to Render.com (750 free hours/month)
2. **Groq rate limit** → Auto-fallback to Gemini (built-in)
3. **Qdrant 1GB full** → Archive old cases or upgrade to $25/month

---

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Check environment variables
cat backend/.env

# Reinstall dependencies
pip install -r backend/requirements.txt
```

### Frontend can't connect to backend
```powershell
# Check frontend/.env
cat frontend/.env

# Should point to Railway URL
VITE_API_URL=https://your-app.railway.app
```

### Qdrant connection error
```python
# Test connection
python
>>> from qdrant_client import QdrantClient
>>> import os
>>> client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_KEY"))
>>> client.get_collections()
```

### GitHub Actions failing
- Check secrets are set correctly
- Verify `data/raw/` has PDFs
- Check Actions tab for error logs

---

## 🎯 Features

✅ **100% Free** - All services have generous free tiers  
✅ **Lightning Fast** - Groq serves Llama 3.3 70B at 300+ tokens/sec  
✅ **Auto-Updates** - GitHub Actions scrapes twice weekly  
✅ **Role-Based** - Customized responses for lawyers, judges, students  
✅ **Fallback LLM** - Auto-switches to Gemini if Groq fails  
✅ **Vector Search** - Qdrant Cloud for semantic search  
✅ **Modern UI** - Clean React frontend with case citations  
✅ **Easy Deploy** - One-click Railway + Vercel deployment  

---

## 📖 Resources

### Free API Documentation
- **Groq**: https://console.groq.com/docs
- **Gemini**: https://ai.google.dev/docs
- **Qdrant**: https://qdrant.tech/documentation
- **Railway**: https://docs.railway.com
- **Vercel**: https://vercel.com/docs

### Legal Data Sources
- **Indian Kanoon**: https://indiankanoon.org
- **Supreme Court of India**: https://main.sci.gov.in/judgments
- **High Courts**: https://districts.ecourts.gov.in/

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature-name`
5. Open a Pull Request

---

## 📄 License

MIT License - Free to use for educational and commercial purposes.

---

## 🎉 Success Metrics

After deployment, you should see:
- ✅ Backend health check: `https://your-app.railway.app/health`
- ✅ Frontend accessible: `https://your-app.vercel.app`
- ✅ GitHub Actions running twice weekly
- ✅ Queries returning relevant cases with AI summaries
- ✅ **Total cost: ₹0/month**

---

## 🚀 Next Steps

1. **Add More Data**: Download more judgments from legal databases
2. **Customize Prompts**: Edit `backend/app/main.py` for specialized legal analysis
3. **Improve Scraper**: Add more sources in `backend/app/scraper.py`
4. **Analytics**: Add Google Analytics to track usage
5. **Share**: Deploy and share with legal professionals!

---

**Built with ❤️ for the Indian Legal Community**

**Questions?** Open an issue on GitHub!
