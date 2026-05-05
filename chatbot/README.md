# FitMentor AI — Production Hybrid RAG System v4.0

## What Changed vs Your Previous System

| Area | Before (v3.x) | Now (v4.0) |
|---|---|---|
| Architecture | Flat monolith (`app.py`) | Modular, phase-separated |
| Supabase role | Passive storage | Active RAG retrieval source |
| Knowledge retrieval | Not connected | FAISS + Cohere multilingual |
| Routing | Keyword matching | Intent-aware Query Router |
| RAG | None (hardcoded responses) | True Hybrid RAG Engine |
| Context | Hardcoded defaults (82.3kg) | Dynamic from Supabase per user |
| Embeddings | English only | Multilingual (Arabic + English) |
| API | Single `/api/chat` | `/chat` + `/user` + `/recommendation` |

---

## Project Structure

```
fitmentor/
├── app/
│   ├── main.py                   # FastAPI entry point + lifespan
│   ├── api/
│   │   ├── chat.py               # POST /api/chat  (Phase 6)
│   │   ├── user.py               # GET  /api/user/{id}/*  (Phase 6)
│   │   └── recommendation.py     # POST /api/recommendation  (Phase 6)
│   ├── core/
│   │   ├── supabase_client.py    # Supabase async fetchers  (Phase 2)
│   │   ├── context_builder.py    # Structured → LLM context  (Phase 2)
│   │   └── vector_store.py       # FAISS + CohereEmbedder  (Phase 3)
│   └── rag/
│       ├── router.py             # Query Router  (Phase 5)
│       ├── engine.py             # Hybrid RAG Engine  (Phase 4)
│       └── ingestion.py          # Website knowledge pipeline  (Phase 3)
├── web/
│   └── FitMentorChat.jsx         # React chat component  (Phase 7)
├── .env.example
└── requirements.txt
```

---

## 8-Phase Breakdown

### Phase 1 — System Architecture ✅
**Data flow:**
```
User → FastAPI → Query Router → {Supabase, FAISS, or both}
     ↓
Context Builder + Prompt Assembler → Cohere LLM → Response
```
**Key design decisions:**
- Supabase = primary structured retrieval source (not just DB)
- FAISS = semantic vector search for website content
- Router decides retrieval mode per query (never hardcoded)
- All modules are independently testable

---

### Phase 2 — Supabase RAG Integration ✅
**Files:** `app/core/supabase_client.py`, `app/core/context_builder.py`

Supabase tables used:
- `profiles` → name, age, gender, height, activity level
- `inbody_scans` → weight, body fat %, muscle mass, BMR, InBody score
- `goals` → active goal type, target, deadline, progress
- `workout_sessions` → date, type, duration, calories

**Context Builder output example:**
```
## 👤 User Profile
Name: Ahmed Hassan
Age: 28 years
Height: 178 cm

## 📊 InBody Analysis
Weight: 82.3 kg
Body Fat: 27.1% (Above Average)
Skeletal Muscle Mass: 23.0 kg
Basal Metabolic Rate: 1842 kcal/day
InBody Score: 68/100

## 🎯 Fitness Goals
- Fat Loss: target 20% body fat by 2025-09-01 [12% complete]

## 🏋️ Recent Workouts
- 2026-05-02: Strength Training (65 min), 420 kcal burned
```

---

### Phase 3 — Website Knowledge Pipeline ✅
**File:** `app/rag/ingestion.py`, `app/core/vector_store.py`

**Chunking strategy (semantic, not naive):**
1. Split on paragraph boundaries (not arbitrary word count)
2. Merge short paragraphs until ~280 words
3. 40-word overlap between chunks for context continuity

**Run ingestion:**
```bash
python -m app.rag.ingestion --urls \
  https://fitmentor.com/articles \
  https://fitmentor.com/faq \
  https://fitmentor.com/guides
```

**Crawl the whole site automatically:**
```bash
python -m app.rag.ingestion --crawl-site https://fitmentor.com --max-pages 100
```

This mode now prefers `sitemap.xml` and `robots.txt` discovery first, then falls back to internal link crawling if no sitemap is available. It ingests page content so the chatbot can answer questions about the whole website.

**Embedding model:** `embed-multilingual-v3.0` — supports Arabic + English

---

### Phase 4 — Hybrid RAG Engine ✅
**File:** `app/rag/engine.py`

Pipeline per query:
1. **Retrieve** from applicable sources (Supabase, FAISS, or both)
2. **Merge** — for hybrid: top 3 vector docs + full structured context
3. **Assemble** — build final prompt with structured sections
4. **Generate** — Cohere `command-r-plus` with grounded documents

---

### Phase 5 — Query Router ✅
**File:** `app/rag/router.py`

| Input pattern | Route | Example |
|---|---|---|
| "my weight", "my goals", "my inbody" | `supabase_only` | "What's my body fat %" |
| "what is", "how does", "explain" | `vector_only` | "What is progressive overload?" |
| "plan for me", "what should I eat" | `hybrid` | "Design a diet for my goals" |
| No user_id provided | `vector_only` | Anonymous users |
| Off-fitness topics | `off_topic` | "What's the weather?" |

Supports both Arabic and English keyword patterns.

---

### Phase 6 — FastAPI Production Backend ✅
**Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Main RAG chat |
| GET | `/api/user/{id}/profile` | User profile from Supabase |
| GET | `/api/user/{id}/inbody` | Latest InBody scan |
| GET | `/api/user/{id}/goals` | Active goals |
| GET | `/api/user/{id}/workouts` | Recent workout history |
| GET | `/api/user/{id}/context` | Debug: full context block |
| POST | `/api/recommendation` | Personalized AI recommendation |
| GET | `/api/health` | Health check + system status |

**Chat response shape:**
```json
{
  "answer": "Based on your 27.1% body fat...",
  "sources": ["Supabase User Data", "https://fitmentor.com/fat-loss"],
  "routing_mode": "hybrid",
  "structured_context_used": true,
  "vector_docs_used": 3,
  "confidence": 0.88,
  "follow_up_questions": ["Shall I create a weekly plan?", "Want macro targets?"],
  "session_id": "uuid"
}
```

---

### Phase 7 — Frontend Integration ✅
**File:** `web/FitMentorChat.jsx`

Features:
- Routing badge shows which retrieval path was used (Hybrid / Personal / Knowledge)
- Follow-up question chips clickable → auto-sends to chat
- Supabase connection indicator when `userId` prop is set
- Dark theme, streaming-ready
- Props: `userId` (optional, enables Supabase context)

**Usage:**
```jsx
<FitMentorChat userId={currentUser?.id} />
```

---

### Phase 8 — Optimization (Next Steps)

| Area | Technique | Expected Gain |
|---|---|---|
| Retrieval accuracy | Reranking with Cohere Rerank API | +15–25% relevance |
| Latency | Cache frequent vector queries (Redis) | -40% p50 |
| Embeddings | Fine-tune embed model on fitness corpus | +10% semantic match |
| Chunking | Experiment with 150-word chunks for dense technical content | Better precision |
| Supabase | Add pgvector for native vector queries (hybrid DB) | Reduce FAISS ops |

---

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env: add SUPABASE_URL, SUPABASE_ANON_KEY, COHERE_API_KEY

# 3. Ingest website knowledge
python -m app.rag.ingestion --urls https://your-fitmentor-site.com/articles

# 4. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Key Design Principles

1. **Supabase is a retrieval source, not just storage** — every user interaction pulls fresh structured context
2. **Router decides everything** — never hardcode retrieval mode; the router reads the query
3. **Multilingual from day one** — `embed-multilingual-v3.0` handles Arabic + English natively
4. **Context is structured, not flattened** — `StructuredContext` keeps sections separate for selective injection
5. **Graceful degradation** — if Supabase is down, vector-only still works; if vector store is empty, Supabase-only still works
