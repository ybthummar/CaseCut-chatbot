# 🚀 Step-by-Step Deployment Guide

This guide walks you through deploying the Legal RAG system from scratch in 30 minutes.

---

## ✅ Pre-Deployment Checklist

Before starting, ensure you have:
- [ ] GitHub account
- [ ] Gmail/Google account (for Groq, Gemini, Railway, Vercel)
- [ ] Git installed on your computer
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Code editor (VS Code recommended)

---

## 📋 STEP-BY-STEP GUIDE

### **PHASE 1: Get Free API Keys** (5 minutes)

#### 1️⃣ Groq API (Primary LLM)
1. Visit: https://console.groq.com
2. Click **Sign Up** → Sign in with Google
3. Go to **API Keys** in left sidebar
4. Click **Create API Key**
5. Name it: `Legal RAG Production`
6. Copy the key → Save to notepad (starts with `gsk_`)
7. ✅ **14,400 requests/day FREE**

#### 2️⃣ Google Gemini API (Backup LLM)
1. Visit: https://aistudio.google.com
2. Sign in with Google
3. Click **Get API Key** (top right)
4. Click **Create API key in new project**
5. Copy the key → Save to notepad
6. ✅ **1M tokens/day FREE**

#### 3️⃣ Qdrant Cloud (Vector Database)
1. Visit: https://cloud.qdrant.io
2. Sign up with Google
3. Click **Create Cluster**
4. Select **Free** tier (1GB forever)
5. Cluster name: `legal-rag-db`
6. Region: Choose closest to you
7. Click **Create**
8. Wait 30 seconds for deployment
9. Click on cluster → **API Keys** tab
10. Copy **Cluster URL** (e.g., `https://abc123.qdrant.io:6333`)
11. Copy **API Key** → Save to notepad
12. ✅ **1GB storage FREE**

---

### **PHASE 2: Local Setup** (10 minutes)

#### 4️⃣ Setup Backend

```powershell
# Navigate to project
cd "d:\SEMESTERS\Projects\CaseCut chatbot"

# Create backend .env file
cd backend
Copy-Item .env.example .env
```

**Edit `backend/.env`** (use Notepad or VS Code):
```env
GROQ_API_KEY=gsk_YOUR_KEY_HERE
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
QDRANT_URL=https://YOUR_CLUSTER.qdrant.io:6333
QDRANT_KEY=YOUR_QDRANT_KEY_HERE
PORT=8000
```

```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies (takes 2-3 minutes)
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed fastapi-0.115.0 uvicorn-0.30.6 ...
```

#### 5️⃣ Setup Frontend

```powershell
# Open new terminal
cd "d:\SEMESTERS\Projects\CaseCut chatbot\frontend"

# Create .env file
Copy-Item .env.example .env

# Install dependencies (takes 1-2 minutes)
npm install
```

**Edit `frontend/.env`**:
```env
VITE_API_URL=http://localhost:8000
```

---

### **PHASE 3: Load Initial Data** (5 minutes)

#### 6️⃣ Add Legal Documents

**Option A: Download Sample PDFs**
```powershell
# Download from Indian Kanoon (example)
# Visit: https://indiankanoon.org/browse/
# Download 3-5 judgment PDFs manually
# Save to: d:\SEMESTERS\Projects\CaseCut chatbot\data\raw\
```

**Option B: Use Test Documents**
- Place any legal PDF files in `data/raw/` folder
- Ensure PDFs are text-based (not scanned images)

#### 7️⃣ Process & Upload to Qdrant

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python app/embeddings.py
```

**Expected output:**
```
✅ Collection created successfully!
✅ Processed judgment_1.pdf: 245 chunks
✅ Processed judgment_2.pdf: 189 chunks
✅ Uploaded 434 embeddings to Qdrant
```

⚠️ **Troubleshooting:**
- **No PDFs found**: Check files are in `data/raw/`
- **Connection error**: Verify QDRANT_URL and QDRANT_KEY in `.env`
- **Collection exists**: Safe to ignore, means already created

---

### **PHASE 4: Test Locally** (5 minutes)

#### 8️⃣ Start Backend

```powershell
# Terminal 1 - Backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Test health endpoint:**
- Open browser: http://localhost:8000/health
- Should see: `{"status":"healthy","services":"groq+qdrant+free"}`

#### 9️⃣ Start Frontend

```powershell
# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.4.2  ready in 234 ms
➜  Local:   http://localhost:3000/
```

#### 🔟 Test the System

1. Open: http://localhost:3000
2. Select role: **Lawyer**
3. Type query: `What are provisions for bail in murder cases?`
4. Click **Send**
5. Should see:
   - 🔄 Loading indicator
   - AI-generated summary
   - 📋 Case citations (3 sources)

✅ **Local system working!**

---

### **PHASE 5: Deploy to Production** (15 minutes)

#### 1️⃣1️⃣ Push to GitHub

```powershell
# In project root
cd "d:\SEMESTERS\Projects\CaseCut chatbot"

git init
git add .
git commit -m "Initial: Free Legal RAG System"

# Create GitHub repo:
# 1. Go to: https://github.com/new
# 2. Name: legal-rag-free
# 3. Keep it Public (or Private if preferred)
# 4. Don't initialize with README
# 5. Click "Create repository"

# Link and push
git remote add origin https://github.com/YOUR_USERNAME/legal-rag-free.git
git branch -M main
git push -u origin main
```

#### 1️⃣2️⃣ Deploy Backend to Railway

**Step 1: Create Railway Project**
1. Visit: https://railway.app
2. **Login with GitHub**
3. Click **New Project**
4. Select **Deploy from GitHub repo**
5. Choose `legal-rag-free` repository
6. Railway auto-detects Dockerfile ✅

**Step 2: Configure Environment**
1. Click on service → **Variables** tab
2. Click **+ New Variable** for each:
   ```
   GROQ_API_KEY = gsk_your_key_here
   GEMINI_API_KEY = your_gemini_key_here
   QDRANT_URL = https://your-cluster.qdrant.io:6333
   QDRANT_KEY = your_qdrant_key_here
   ```
3. Click **Deploy** in top right

**Step 3: Get Public URL**
1. Wait 2-3 minutes for build
2. Go to **Settings** → **Networking**
3. Click **Generate Domain**
4. Copy URL (e.g., `legal-rag-production.up.railway.app`)
5. Test: `https://YOUR_DOMAIN.railway.app/health`

✅ **Should return:** `{"status":"healthy",...}`

#### 1️⃣3️⃣ Deploy Frontend to Vercel

**Step 1: Update Frontend Config**
```powershell
cd frontend
# Edit .env
VITE_API_URL=https://YOUR_RAILWAY_DOMAIN.railway.app
```

**Step 2: Deploy**
```powershell
npm install -g vercel
vercel login
# Follow browser authentication

vercel --prod
```

**Prompts:**
```
? Set up and deploy "frontend"? Y
? Which scope? [Your account]
? Link to existing project? N
? What's your project's name? legal-rag-frontend
? In which directory is your code located? ./
? Want to override settings? N
```

**Step 3: Configure Environment**
- Vercel dashboard → Project → **Settings** → **Environment Variables**
- Add: `VITE_API_URL` = `https://YOUR_RAILWAY_DOMAIN.railway.app`
- Redeploy: **Deployments** → Click **...** → **Redeploy**

**Copy production URL:** `https://legal-rag-frontend.vercel.app`

#### 1️⃣4️⃣ Setup Automated Updates

**GitHub Actions Configuration:**
```powershell
# Already configured in .github/workflows/scraper.yml
```

**Add Secrets:**
1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** (twice):
   - Name: `QDRANT_URL`, Value: Your Qdrant URL
   - Name: `QDRANT_KEY`, Value: Your Qdrant key

**Test Workflow:**
1. Go to **Actions** tab
2. Click **Scrape Judgments Twice Weekly**
3. Click **Run workflow** → **Run workflow**
4. Wait 1-2 minutes
5. Check if run succeeds ✅

**Schedule:** Runs automatically **Monday & Thursday 2 AM IST**

---

## 🎉 DEPLOYMENT COMPLETE!

### ✅ Success Verification

Check these URLs:

1. **Backend Health**
   - URL: `https://YOUR_APP.railway.app/health`
   - Should return: `{"status":"healthy","services":"groq+qdrant+free"}`

2. **Frontend**
   - URL: `https://legal-rag-frontend.vercel.app`
   - Should load chat interface

3. **Test Query**
   - Go to frontend URL
   - Ask: "Explain IPC Section 420"
   - Should get AI response with case citations

### 📊 Monitor Your Free Tiers

| Service | Check Usage |
|---------|-------------|
| Railway | https://railway.app/dashboard → See $5 balance |
| Groq | https://console.groq.com/usage |
| Qdrant | https://cloud.qdrant.io → Storage graph |
| Vercel | https://vercel.com/dashboard → Bandwidth |
| GitHub Actions | Repo → Actions → Check minutes used |

---

## 🐛 Common Issues & Fixes

### Issue 1: Backend deployment fails
**Error:** `No Dockerfile found`
**Fix:**
```powershell
# Ensure Dockerfile is in backend/ folder
ls backend/Dockerfile

# Update railway.json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  }
}
```

### Issue 2: Frontend can't connect to backend
**Error:** `Network Error` in frontend
**Fix:**
1. Check `frontend/.env`: `VITE_API_URL=https://CORRECT_RAILWAY_URL`
2. Check Railway logs for errors
3. Verify `/health` endpoint works
4. Redeploy frontend: `vercel --prod`

### Issue 3: Qdrant connection timeout
**Error:** `Connection timeout`
**Fix:**
```python
# Test locally first
python
>>> from qdrant_client import QdrantClient
>>> client = QdrantClient(url="YOUR_URL", api_key="YOUR_KEY")
>>> client.get_collections()  # Should not error
```

### Issue 4: GitHub Actions failing
**Error:** Workflow run fails
**Fix:**
1. Check secrets are set: `QDRANT_URL`, `QDRANT_KEY`
2. Ensure `data/raw/` has PDFs committed
3. Check logs in Actions tab

---

## 📞 Support Resources

- **Railway Docs**: https://docs.railway.com
- **Vercel Docs**: https://vercel.com/docs
- **Groq API**: https://console.groq.com/docs
- **Qdrant Docs**: https://qdrant.tech/documentation

---

## 🎯 Next Steps After Deployment

1. **Add More Legal Cases**
   - Download 50-100 judgments
   - Run `python app/embeddings.py` locally
   - Or wait for GitHub Actions to auto-scrape

2. **Customize for Use Case**
   - Edit prompts in `backend/app/main.py`
   - Add specific legal domains (family law, corporate, etc.)

3. **Share with Users**
   - Send frontend URL to lawyers/students
   - No login required!

4. **Monitor Usage**
   - Check Railway credits weekly
   - Monitor Qdrant storage (1GB limit)

---

**🎉 Congratulations! Your free Legal RAG system is live!**

**Total Time Spent:** ~30 minutes  
**Total Cost:** ₹0 (100% free)  
**Deployment Status:** ✅ Production Ready
