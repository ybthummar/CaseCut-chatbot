# 📊 Cost Monitoring & Usage Tracking

Monitor your free tier usage to ensure you stay within limits.

---

## 📈 Daily Monitoring Checklist

### Every Day
- [ ] Check Groq API usage
- [ ] Monitor Railway credit balance
- [ ] Review frontend traffic on Vercel

### Weekly
- [ ] Check Qdrant storage usage
- [ ] Review GitHub Actions minutes
- [ ] Verify scraper is running successfully

### Monthly
- [ ] Full cost audit
- [ ] Plan for scaling if needed
- [ ] Archive old data if Qdrant approaching 1GB

---

## 🔍 How to Monitor Each Service

### 1. Groq API (Primary LLM)

**Dashboard**: https://console.groq.com/usage

**Free Tier Limits:**
- 14,400 requests/day
- 70,000 tokens/minute
- Resets daily at midnight UTC

**Monitor:**
```
Current Usage:  X / 14,400 requests
Token Usage:    X / 70,000 per minute
```

**Alert Thresholds:**
- ⚠️ Yellow: >10,000 requests/day (70% usage)
- 🔴 Red: >13,000 requests/day (90% usage)

**Actions if hitting limits:**
1. Auto-fallback to Gemini is already configured
2. Increase `k` parameter to reduce queries
3. Cache popular queries

---

### 2. Railway (Backend Hosting)

**Dashboard**: https://railway.app/dashboard

**Free Tier:**
- $5 credit/month
- ~512MB RAM
- Resets monthly

**Monitor:**
```
Balance: $X.XX / $5.00
Usage:   XX% this month
Reset:   XX days
```

**Cost per hour:** ~$0.007/hour for 512MB RAM
**Monthly estimate:** ~$5 (uses full credit)

**Alert Thresholds:**
- ⚠️ Yellow: $4.00 spent (80%)
- 🔴 Red: $4.50 spent (90%)

**Actions if hitting limits:**
1. Switch to Render.com (750 free hours/month)
2. Use Railway only for production, local for dev
3. Implement API caching to reduce compute

---

### 3. Qdrant Cloud (Vector Database)

**Dashboard**: https://cloud.qdrant.io

**Free Tier:**
- 1GB storage
- Unlimited requests
- Forever free

**Monitor:**
```
Storage: XXX MB / 1000 MB (XX%)
Vectors: XX,XXX stored
Collections: 1
```

**Storage Estimates:**
- 384 dimensions × 4 bytes = ~1.5KB per vector
- 1GB = ~650,000 vectors
- Average PDF (10 pages) = ~50 chunks = 75KB

**→ Can store ~13,000 PDFs before hitting limit**

**Alert Thresholds:**
- ⚠️ Yellow: 800MB (80%)
- 🔴 Red: 950MB (95%)

**Actions if approaching limit:**
1. Delete old/irrelevant cases:
   ```python
   from qdrant_client import QdrantClient
   client = QdrantClient(url=..., api_key=...)
   client.delete(
       collection_name="legal_cases",
       points_selector=FilterSelector(filter=...)
   )
   ```
2. Increase chunk size (500 → 1000 chars)
3. Upgrade to paid plan ($25/month for 100GB)

---

### 4. Google Gemini API (Backup LLM)

**Dashboard**: https://aistudio.google.com/app/apikey

**Free Tier:**
- 15 requests/minute
- 1 million tokens/day
- Forever free (as of Feb 2026)

**Usage:**
- Only triggers when Groq fails
- Typically <5% of total requests

**Monitor:**
- Check daily token usage in AI Studio
- Review error logs for Groq < > Gemini switches

---

### 5. Vercel (Frontend Hosting)

**Dashboard**: https://vercel.com/dashboard

**Hobby Plan (Free):**
- 100GB bandwidth/month
- Unlimited requests
- Unlimited deployments

**Monitor:**
```
Bandwidth: XX GB / 100 GB
Requests:  XX,XXX this month
```

**Typical Usage:**
- Frontend: ~100KB per page load
- Can serve **1 million page views/month** easily

**Alert Thresholds:**
- ⚠️ Yellow: 80GB (upgrade warning)
- 🔴 Red: 95GB (consider Pro plan)

**Actions if hitting limits:**
1. Optimize bundle size: `npm run build -- --analyze`
2. Implement CDN caching
3. Upgrade to Pro ($20/month) for 1TB bandwidth

---

### 6. GitHub Actions (Auto-Scraper)

**Dashboard**: Repo → **Settings** → **Billing**

**Free Tier:**
- 2,000 minutes/month (Linux runners)
- Resets monthly

**Current Usage:**
- Runs: **Twice weekly** (Monday & Thursday)
- Duration: ~5 minutes per run
- Monthly: 8 runs × 5 min = **40 minutes** (2% of free tier)

**Monitor:**
```bash
# Check last run
gh run list --limit 5

# View usage
gh api /repos/YOUR_USERNAME/legal-rag-free/actions/billing/usage
```

**Alert Thresholds:**
- ⚠️ Yellow: 1,500 minutes (75%)
- 🔴 Red: 1,900 minutes (95%)

**Actions if hitting limits:**
1. Reduce run frequency (weekly instead of twice-weekly)
2. Optimize scraper to run faster
3. Use in-app scheduler (APScheduler)

---

## 📊 Monthly Cost Report Template

```
====================================
   LEGAL RAG - MONTHLY COST REPORT
   Month: February 2026
====================================

☁️ INFRASTRUCTURE
├─ Railway:       $4.89 / $5.00 (98%)  ✅
├─ Qdrant:        423 MB / 1 GB (42%)  ✅
├─ Vercel:        12 GB / 100 GB (12%) ✅
└─ GitHub:        40 min / 2000 min    ✅

🤖 AI SERVICES
├─ Groq:          8,234 / 14,400 req   ✅
├─ Gemini:        421 / 1M tokens      ✅
└─ Embeddings:    Local (Free)         ✅

📈 USAGE STATS
├─ Total Queries: 8,234
├─ Avg/Day:       274
├─ New Cases:     45 PDFs added
└─ Storage:       +52 MB

💰 TOTAL COST:    ₹0 (100% Free)

🎯 STATUS:        All within limits ✅

⚠️  ALERTS:       None

📝 NOTES:
- Railway credit auto-renews Mar 1
- Qdrant has 58% capacity remaining
- Groq usage well below daily limit
```

---

## 🚨 Alert System Setup

### Option 1: Manual Monitoring
Create a weekly calendar reminder:
- **Every Monday**: Check all dashboards
- **Use this checklist**

### Option 2: Automated Alerts (Advanced)

**Create monitoring script:**

```python
# monitor.py
import os
import requests
from groq import Groq
from qdrant_client import QdrantClient

def check_services():
    alerts = []
    
    # Check Qdrant storage
    qdrant = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_KEY"))
    collection = qdrant.get_collection("legal_cases")
    storage_mb = collection.vectors_count * 1.5 / 1024  # Rough estimate
    
    if storage_mb > 800:
        alerts.append(f"⚠️ Qdrant storage: {storage_mb:.0f}MB / 1000MB")
    
    # Check Railway (via API if available)
    # Check Groq usage
    # etc.
    
    if alerts:
        print("\n🚨 ALERTS:\n" + "\n".join(alerts))
        # Optional: Send email/webhook notification
    else:
        print("✅ All services healthy")

if __name__ == "__main__":
    check_services()
```

**Run weekly via GitHub Actions:**

```yaml
# .github/workflows/monitor.yml
name: Monitor Services
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday 9 AM
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install groq qdrant-client
      - run: python monitor.py
        env:
          QDRANT_URL: ${{ secrets.QDRANT_URL }}
          QDRANT_KEY: ${{ secrets.QDRANT_KEY }}
```

---

## 💡 Optimization Tips

### Reduce Groq API Usage
```python
# Add caching in backend/app/main.py
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_query(query: str):
    # Query logic here
    pass
```

### Reduce Railway Compute
- Use smaller embedding model: `all-MiniLM-L6-v2` (current) vs `all-mpnet-base-v2`
- Implement request rate limiting
- Cache Qdrant search results

### Reduce Qdrant Storage
```python
# Increase chunk size to reduce vector count
chunks = [text[i:i+1000] for i in range(0, len(text), 1000)]  # Was 500
```

---

## 📞 Getting Help

If you exceed free tiers:

1. **Railway**
   - Switch to Render.com (750 free hours)
   - Or upgrade Railway: $5/month for more credit

2. **Qdrant**
   - Archive old cases
   - Or upgrade: $25/month for 100GB

3. **Groq**
   - Switch to Gemini as primary
   - Or use Together AI (also free)

4. **Still need help?**
   - Open GitHub issue with usage stats
   - Community can suggest optimizations

---

## 🎯 Target Monthly Costs

**Current Setup:**
- Target: ₹0/month
- Maximum: ₹2000/month (if all services need upgrade)

**If Scaling to 1000+ users:**
- Railway → Render Pro: $85/month (₹7000)
- Qdrant → 10GB tier: $50/month (₹4000)
- Total: ~₹11,000/month

**Break-even:** Need ~50 paid users at ₹200/month

---

**💡 Pro Tip:** The free tier is designed for **low-to-medium traffic** (10-50 queries/day). Perfect for:
- Personal legal research
- Small law firm (2-5 lawyers)
- Student projects
- MVP/prototype

For production scaling, budget ₹5000-10000/month for reliable paid tiers.
