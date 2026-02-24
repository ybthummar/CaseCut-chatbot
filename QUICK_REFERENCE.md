# 🚀 Quick Reference Card

One-page cheat sheet for the Legal RAG system.

---

## 📦 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite | Fast dev, modern |
| Backend | FastAPI | Fast Python API |
| LLM | Groq (Llama 3.3) | 300+ tok/sec, free |
| Embeddings | Sentence-Transformers | Local, no API |
| Vector DB | Qdrant Cloud | 1GB free |
| Hosting | Railway + Vercel | Free tiers |
| Scheduler | GitHub Actions | 2000 min/month |

**Total Cost: ₹0/month**

---

## ⚡ Quick Commands

### First-Time Setup
```powershell
.\setup.ps1
notepad backend\.env  # Add API keys
```

### Development
```powershell
.\start.ps1  # Starts both frontend & backend
```

### Manual Start
```powershell
# Terminal 1: Backend
cd backend; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend; npm run dev
```

### Add New PDFs
```powershell
# 1. Add PDFs to data/raw/
# 2. Process:
cd backend; .\venv\Scripts\Activate.ps1
python app/embeddings.py
```

### Deploy
```powershell
# Backend (Railway)
git push origin main  # Auto-deploys

# Frontend (Vercel)
cd frontend; vercel --prod
```

---

## 🔑 API Keys (Get Free)

| Service | URL | What to Copy |
|---------|-----|--------------|
| **Groq** | console.groq.com | API Key (starts with `gsk_`) |
| **Gemini** | aistudio.google.com | API Key |
| **Qdrant** | cloud.qdrant.io | Cluster URL + API Key |

---

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI endpoints
│   │   ├── embeddings.py    # Process PDFs
│   │   └── scraper.py       # Download judgments
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                 # ⚠️ Add API keys here
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   └── App.css
│   ├── package.json
│   └── .env                 # API URL
│
├── data/
│   ├── raw/                 # Put PDFs here
│   └── embeddings/
│
├── .github/workflows/
│   └── scraper.yml          # Auto-scraper (Mon & Thu 2 AM)
│
└── README.md
```

---

## 🔌 API Endpoints

### POST /query
Search cases and get AI summary
```json
{
  "query": "What are bail provisions?",
  "role": "lawyer",  // lawyer | judge | student
  "k": 5            // number of cases to retrieve
}
```

### GET /health
Check if services are running
```json
{"status": "healthy", "services": "groq+qdrant+free"}
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Backend won't start** | Check `.env` has all keys |
| **Frontend can't connect** | Verify `VITE_API_URL` in frontend/.env |
| **No search results** | Run `python app/embeddings.py` first |
| **Qdrant errors** | Test connection: `python -c "from qdrant_client import QdrantClient; ..."` |
| **GitHub Actions fail** | Check secrets: QDRANT_URL, QDRANT_KEY |
| **Groq rate limit** | Auto-switches to Gemini (check logs) |

---

## 📊 Free Tier Limits

| Service | Daily Limit | Monthly Limit |
|---------|-------------|---------------|
| Groq | 14,400 requests | ~430K |
| Gemini | 15 req/min | 1M tokens |
| Railway | - | $5 credit |
| Qdrant | ∞ | 1GB storage |
| Vercel | ∞ | 100GB bandwidth |
| GitHub Actions | - | 2000 minutes |

**All services reset monthly except Qdrant (forever free 1GB)**

---

## 🎯 Common Tasks

### Check Backend Health
```powershell
curl http://localhost:8000/health
# Or: https://your-app.railway.app/health
```

### Test Query Locally
```powershell
curl -X POST http://localhost:8000/query `
  -H "Content-Type: application/json" `
  -d '{\"query\":\"Test\",\"k\":3}'
```

### View Logs (Railway)
- Railway Dashboard → Your Service → **Logs** tab

### View Qdrant Data
```python
from qdrant_client import QdrantClient
import os

client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_KEY"))
collection = client.get_collection("legal_cases")
print(f"Vectors: {collection.vectors_count}")
```

### Trigger GitHub Scraper Manually
- GitHub → **Actions** → **Scrape Judgments** → **Run workflow**

---

## 🔐 Environment Variables

### Backend (.env)
```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...
QDRANT_URL=https://...qdrant.io:6333
QDRANT_KEY=...
PORT=8000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
# Or production: https://your-app.railway.app
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Overview & full setup guide |
| **DEPLOYMENT_GUIDE.md** | Step-by-step deployment (30 min) |
| **TESTING_GUIDE.md** | Test all components |
| **COST_MONITORING.md** | Track free tier usage |
| **QUICK_REFERENCE.md** | This file - quick commands |

---

## 🌐 URLs to Bookmark

### Development
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Health: http://localhost:8000/health

### Production (after deployment)
- Backend: https://your-app.railway.app
- Frontend: https://your-app.vercel.app

### Dashboards
- Railway: https://railway.app/dashboard
- Vercel: https://vercel.com/dashboard
- Groq: https://console.groq.com/usage
- Qdrant: https://cloud.qdrant.io
- GitHub Actions: Your repo → Actions tab

---

## 🚀 Deployment Checklist

#### Pre-Deploy
- [ ] Get all 3 API keys (Groq, Gemini, Qdrant)
- [ ] Test locally (`.\start.ps1`)
- [ ] Add at least 3 PDFs to `data/raw/`
- [ ] Run `python app/embeddings.py`
- [ ] Commit to GitHub

#### Railway Backend
- [ ] Connect GitHub repo
- [ ] Add env vars (4 keys)
- [ ] Generate domain
- [ ] Test `/health` endpoint

#### Vercel Frontend
- [ ] Update `VITE_API_URL` to Railway domain
- [ ] Run `vercel --prod`
- [ ] Add env var in Vercel dashboard
- [ ] Test frontend loads

#### GitHub Actions
- [ ] Add secrets: QDRANT_URL, QDRANT_KEY
- [ ] Manual trigger test
- [ ] Verify scheduled runs (Mon & Thu 2 AM)

---

## 💡 Pro Tips

1. **Speed up responses:** Reduce `k` from 5 to 3
2. **Save Groq credits:** Implement query caching
3. **Monitor usage:** Check dashboards weekly
4. **Backup data:** Export Qdrant collection monthly
5. **Improve results:** Add more PDFs regularly
6. **Test changes:** Always test locally before deploy
7. **Check logs:** Railway logs show all errors
8. **Customize prompts:** Edit `backend/app/main.py`

---

## 📞 Get Help

- **Docs:** Read `README.md` or `DEPLOYMENT_GUIDE.md`
- **Errors:** Check `TESTING_GUIDE.md` troubleshooting
- **Costs:** Review `COST_MONITORING.md`
- **GitHub Issues:** Open issue with error logs

---

## ⭐ Success Criteria

System is working correctly when:
- ✅ `/health` returns 200 OK
- ✅ Frontend loads without errors
- ✅ Queries return results in <10 seconds
- ✅ Case citations show in responses
- ✅ GitHub Actions runs successfully
- ✅ All costs remain ₹0

---

**🎉 You're all set! Happy coding!**

**Key Remember:**
- Development: `.\start.ps1`
- Add PDFs: `data/raw/` → `python app/embeddings.py`
- Deploy: `git push` (Railway auto-deploys)
- Monitor: Check dashboards weekly
