# Testing Guide

Comprehensive testing instructions for the Legal RAG system.

---

## 🧪 Testing Checklist

### ✅ Phase 1: Local Backend Testing

#### 1. Health Check
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

# In another terminal or browser
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "services": "groq+qdrant+free"
}
```

#### 2. Test Embeddings
```powershell
python app/embeddings.py
```

**Expected Output:**
```
✅ Collection created successfully!
✅ Processed judgment_1.pdf: 245 chunks
✅ Uploaded 245 embeddings to Qdrant
```

**Verify in Qdrant:**
```python
from qdrant_client import QdrantClient
import os

client = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_KEY"))
collection = client.get_collection("legal_cases")
print(f"Vectors stored: {collection.vectors_count}")
```

#### 3. Test Query Endpoint
```powershell
# Using curl
curl -X POST http://localhost:8000/query `
  -H "Content-Type: application/json" `
  -d '{\"query\": \"What are bail provisions?\", \"role\": \"lawyer\", \"k\": 3}'
```

**Or use Python:**
```python
import requests

response = requests.post(
    "http://localhost:8000/query",
    json={"query": "What are bail provisions?", "role": "lawyer", "k": 3}
)
print(response.json())
```

**Expected Response Structure:**
```json
{
  "cases": [
    {"id": "12345", "text": "Case excerpt..."},
    {"id": "12346", "text": "Case excerpt..."},
    {"id": "12347", "text": "Case excerpt..."}
  ],
  "summary": "AI-generated summary about bail provisions...",
  "source": "groq"
}
```

---

### ✅ Phase 2: Frontend Testing

#### 1. Basic UI Load
```powershell
cd frontend
npm run dev
```

Open http://localhost:3000

**Check:**
- [ ] Page loads without errors
- [ ] Header shows "⚖️ Legal RAG Assistant"
- [ ] Role selector visible (Lawyer/Judge/Student)
- [ ] Input field placeholder shows
- [ ] Send button visible

#### 2. Test Query Flow

**Test Case 1: Simple Query**
1. Select role: **Lawyer**
2. Enter: "Explain IPC Section 302"
3. Click Send
4. Verify:
   - [ ] Loading indicator appears
   - [ ] User message shows in chat
   - [ ] Bot response appears within 5 seconds
   - [ ] Response includes summary
   - [ ] Case sources expandable

**Test Case 2: Role-Specific Query**
1. Select role: **Student**
2. Enter: "What is the difference between IPC 302 and 304?"
3. Verify response is educational in tone

**Test Case 3: Complex Query**
1. Select role: **Judge**
2. Enter: "Recent precedents on anticipatory bail in dowry cases"
3. Verify:
   - [ ] Response cites multiple cases
   - [ ] Summary is judicial in tone

#### 3. Error Handling

**Test Case 4: Empty Query**
1. Leave input empty
2. Click Send
3. Verify: Nothing happens (blocked by frontend)

**Test Case 5: Backend Offline**
1. Stop backend server
2. Enter query and send
3. Verify: Error message appears

**Test Case 6: Invalid API Response**
- Simulate by breaking backend temporarily
- Check graceful error handling

---

### ✅ Phase 3: Integration Testing

#### 1. End-to-End Flow
```
User Query → Frontend → Backend API → Embeddings → Qdrant → LLM → Response
```

**Test with monitoring:**
```powershell
# Terminal 1: Backend with verbose logging
uvicorn app.main:app --log-level debug

# Terminal 2: Frontend
npm run dev

# Terminal 3: Monitor logs
Get-Content -Path "backend\logs.txt" -Wait
```

#### 2. LLM Fallback Testing

**Test Groq → Gemini Fallback:**
```python
# Temporarily break Groq in backend/app/main.py
# groq_client = Groq(api_key="invalid_key")

# Send query, should see fallback to Gemini
# Check logs for: "Falling back to Gemini..."
```

#### 3. Qdrant Connection Testing

**Test with different `k` values:**
```python
test_cases = [
    {"k": 1, "expected_cases": 1},
    {"k": 5, "expected_cases": 5},
    {"k": 10, "expected_cases": 10},
]

for test in test_cases:
    response = requests.post(
        "http://localhost:8000/query",
        json={"query": "Test query", "k": test["k"]}
    )
    assert len(response.json()["cases"]) == test["expected_cases"]
```

---

### ✅ Phase 4: Production Testing

#### 1. Railway Backend
```powershell
# Test deployed backend
$RAILWAY_URL = "https://your-app.railway.app"

curl "$RAILWAY_URL/health"

curl -X POST "$RAILWAY_URL/query" `
  -H "Content-Type: application/json" `
  -d '{\"query\": \"Test\", \"k\": 3}'
```

#### 2. Vercel Frontend
1. Open production URL: https://your-app.vercel.app
2. Run same UI tests as local
3. Check browser console for errors (F12)
4. Test on different devices:
   - [ ] Desktop Chrome
   - [ ] Desktop Firefox
   - [ ] Mobile Chrome
   - [ ] Mobile Safari

#### 3. Cross-Origin Testing
- Ensure CORS is properly configured
- Frontend can call Railway backend from Vercel domain
- Check browser Network tab (F12 → Network)

---

### ✅ Phase 5: Load Testing

#### Basic Load Test
```python
# load_test.py
import requests
import concurrent.futures
import time

def send_query(i):
    start = time.time()
    response = requests.post(
        "http://localhost:8000/query",
        json={"query": f"Test query {i}", "k": 3},
        timeout=30
    )
    duration = time.time() - start
    return response.status_code, duration

# Test with 10 concurrent requests
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(send_query, i) for i in range(10)]
    results = [f.result() for f in futures]

print(f"Success rate: {sum(1 for r in results if r[0] == 200)}/10")
print(f"Avg duration: {sum(r[1] for r in results)/len(results):.2f}s")
```

**Expected:**
- Success rate: 10/10
- Avg duration: <5 seconds

#### Groq Rate Limit Test
```python
# Test approaching daily limit (14,400 requests)
# Don't actually run this fully unless testing fallback!

for i in range(100):  # Test with 100 instead of 14,400
    response = requests.post("http://localhost:8000/query", json={"query": "test", "k": 1})
    if response.status_code == 429:
        print(f"Rate limited at request {i}")
        break
```

---

### ✅ Phase 6: GitHub Actions Testing

#### 1. Manual Workflow Trigger
1. Go to GitHub → **Actions** tab
2. Select **Scrape Judgments Twice Weekly**
3. Click **Run workflow**
4. Monitor logs

**Check:**
- [ ] Python dependencies install
- [ ] Scraper runs without errors
- [ ] Embeddings process successfully
- [ ] Commit & push succeeds

#### 2. Scheduled Run
Wait until Monday or Thursday 2 AM IST, then check:
- [ ] Workflow triggered automatically
- [ ] New data committed
- [ ] No errors in logs

---

## 🧪 Test Data

### Sample Legal Queries

**Constitutional Law:**
- "Article 21 right to life precedents"
- "Basic structure doctrine cases"
- "Fundamental rights vs Directive Principles"

**Criminal Law:**
- "IPC Section 302 murder vs 304 culpable homicide"
- "Bail provisions in NDPS cases"
- "Appeal process in Sessions Court"

**Civil Law:**
- "Specific performance of contract cases"
- "Damages calculation in breach"
- "Property dispute resolution"

**Family Law:**
- "Maintenance under Section 125 CrPC"
- "Custody of minor children"
- "Irretrievable breakdown of marriage"

### Edge Cases

**Long Query (500+ words):**
```
I am a lawyer representing a client who has been accused of murder under IPC Section 302. 
The prosecution's case is based on circumstantial evidence including CCTV footage showing 
my client near the scene... [continue for 500 words] What are the chances of bail?
```

**Multi-Language (Hindi words):**
```
What is the विधिक position on दहेज (dowry) cases?
```

**Typos:**
```
Whatt is IPC Sectin 420 abot?
```

---

## 📊 Performance Benchmarks

### Response Time Targets

| Operation | Target | Acceptable | Poor |
|-----------|--------|------------|------|
| Health check | <100ms | <500ms | >1s |
| Embedding generation | <2s | <5s | >10s |
| Qdrant search | <500ms | <2s | >5s |
| LLM response (Groq) | <3s | <10s | >20s |
| End-to-end query | <5s | <15s | >30s |

### Resource Usage Targets

| Metric | Target | Max |
|--------|--------|-----|
| Backend RAM | <300MB | <512MB |
| Backend CPU | <20% | <50% |
| Frontend bundle | <500KB | <1MB |
| Qdrant query time | <500ms | <2s |

---

## 🐛 Common Test Failures & Fixes

### Issue 1: "Collection not found"
**Cause:** Qdrant collection not created
**Fix:**
```powershell
python backend/app/embeddings.py
```

### Issue 2: "CORS error" in frontend
**Cause:** Backend not allowing frontend origin
**Fix:** Verify in `backend/app/main.py`:
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])
```

### Issue 3: "No such file or directory: data/raw"
**Cause:** Data directory doesn't exist
**Fix:**
```powershell
New-Item -ItemType Directory -Path "data\raw" -Force
```

### Issue 4: Timeout on query
**Cause:** Groq API slow or rate limited
**Check:**
- Groq dashboard for rate limits
- Try with smaller `k` value
- Check fallback to Gemini works

---

## ✅ Test Completion Checklist

Before considering the system "production ready":

- [ ] All backend endpoints respond correctly
- [ ] Frontend loads and displays properly
- [ ] Queries return relevant results
- [ ] Error handling works gracefully
- [ ] Railway deployment accessible
- [ ] Vercel frontend accessible
- [ ] GitHub Actions runs successfully
- [ ] Load test passes (10 concurrent queries)
- [ ] Response times under 5 seconds average
- [ ] All test cases documented pass
- [ ] CORS configured correctly
- [ ] API keys valid and not exposed
- [ ] Qdrant has indexed data
- [ ] Fallback LLM works

---

## 📝 Test Report Template

```markdown
# Test Report - YYYY-MM-DD

## Environment
- Backend: [Local / Railway]
- Frontend: [Local / Vercel]
- Tester: [Your Name]

## Test Results

### Backend Tests
- Health Check: ✅ PASS
- Embeddings: ✅ PASS  
- Query Endpoint: ✅ PASS

### Frontend Tests
- UI Load: ✅ PASS
- Query Flow: ✅ PASS
- Error Handling: ✅ PASS

### Integration Tests
- End-to-End: ✅ PASS
- LLM Fallback: ✅ PASS
- Qdrant Connection: ✅ PASS

### Performance
- Avg Response Time: 4.2s ✅
- Success Rate: 100% ✅
- Memory Usage: 287MB ✅

## Issues Found
1. None

## Recommendations
- System ready for production

## Next Steps
- Deploy to production
- Monitor for 1 week
```

---

**🎯 Target: All tests passing before production deployment!**
