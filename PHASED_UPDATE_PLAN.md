# FitMentor Project - Phased Update Plan
**Date:** 2026-05-23  
**Status:** Ready for User Review & Approval

---

## Overview

This plan outlines **5 phases** to address all issues found in the FitMentor project review. Each phase is:
- **Specific**: Clear before/after state
- **Reversible**: Can be rolled back if needed
- **Sequential**: Later phases depend on earlier ones
- **Non-breaking**: No feature changes, only structural improvements

---

## ⚠️ PREREQUISITES

Before executing ANY phase, you MUST:

1. **Backup current state**:
   ```bash
   git branch backup-before-cleanup
   git branch backup-security-keys
   ```

2. **Rotate API keys immediately** (DO THIS NOW if you haven't):
   - Log into Cohere dashboard → regenerate API key
   - Log into Supabase → regenerate service role key
   - Update `.env` with new keys locally only (don't commit)

3. **Verify all remotes**: `git remote -v`

---

## PHASE 1: CRITICAL SECURITY FIXES
**Estimated Time**: 30-45 minutes  
**Risk Level**: LOW (but important)  
**Breaking Changes**: None  
**Post-Phase State**: API keys safe, sensitive data removed from git

### 1.1 Remove .env from Git History

**Before**:
```
.env (committed with live API keys)
↓
Anyone with git access can see keys
```

**After**:
```
.env (local only, not in git)
.env.example (template with placeholders)
↓
Keys safe, new developers know what vars are needed
```

**Steps** (IN ORDER):
1. Review `.env` for all secrets:
   ```bash
   cat .env
   ```
   Expected vars: `COHERE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

2. Create `.env.example` as template:
   ```bash
   cp .env .env.example
   # Edit .env.example: replace all secret values with PLACEHOLDER
   ```
   Example:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   COHERE_API_KEY=your_cohere_api_key_here
   VITE_CHATBOT_API_URL=http://127.0.0.1:8000
   # ... etc
   ```

3. Remove `.env` from git history:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from git (sensitive keys)"
   ```

4. Add to `.gitignore` (if not already there):
   ```
   .env
   .env.local
   *.env
   ```

5. Commit:
   ```bash
   git add .gitignore
   git commit -m "Add .env to .gitignore"
   ```

6. **Optional but recommended**: Use `git filter-repo` to remove from history:
   ```bash
   # WARNING: This rewrites git history, affects all collaborators
   # Only do if keys were highly sensitive
   git filter-repo --path .env --invert-paths
   ```

**Verification**:
- `.env` is not in `git status`
- `.env.example` shows all needed variables
- `.gitignore` contains `.env`

---

### 1.2 Update .gitignore with All Cache Files

**Before**:
```
.gitignore (missing several patterns)
→ Python cache, node_modules still tracked
```

**After**:
```
.gitignore (complete)
→ All cache/build/sensitive files ignored
```

**Steps**:
1. View current `.gitignore`:
   ```bash
   cat .gitignore
   ```

2. Ensure these patterns exist (add if missing):
   ```
   # Python
   __pycache__/
   *.py[cod]
   *$py.class
   *.so
   .Python
   .venv/
   venv/
   env/
   ENV/
   .env
   .env.local
   
   # Node
   node_modules/
   npm-debug.log
   yarn-debug.log
   yarn-error.log
   
   # Build artifacts
   dist/
   build/
   *.index
   *.index.json
   
   # IDE
   .vscode/
   .idea/
   *.swp
   *.swo
   *~
   
   # OS
   .DS_Store
   Thumbs.db
   
   # Temp/Debug
   auth-state.json
   chat_payload.json
   session_payload.json
   payload.json
   *_manifest.json
   
   # Cache
   .vite/
   .cache/
   ```

3. Commit:
   ```bash
   git add .gitignore
   git commit -m "Update .gitignore with all cache patterns"
   ```

**Verification**:
- All patterns added to `.gitignore`
- No new warnings from `git status`

---

### 1.3 Remove Python Cache Files from Git

**Before**:
```
chatbot/__pycache__/ (10+ .pyc files in git)
model2/__pycache__/ (in git)
↓
Repository bloated, committed bytecode
```

**After**:
```
chatbot/__pycache__/ (local only, not in git)
model2/__pycache__/ (local only, not in git)
↓
Clean repository, cache generated locally
```

**Steps**:
1. Remove from git:
   ```bash
   git rm --cached -r chatbot/__pycache__/
   git rm --cached -r model2/__pycache__/
   git rm --cached -r "chatbot/__pycache__/*"
   git rm --cached -r "model2/__pycache__/*"
   ```

2. Verify:
   ```bash
   git status
   ```
   Should show `.pycache/` as deleted

3. Commit:
   ```bash
   git commit -m "Remove Python cache files from git"
   ```

**Verification**:
- `git log --name-status` shows cache files as deleted
- `.gitignore` includes `__pycache__/`

---

### 1.4 Remove Virtual Environment from Git

**Before**:
```
.venv/ (entire directory in git, 100M+)
↓
Repository huge, platform-specific
```

**After**:
```
.venv/ (local only, created by `python -m venv .venv`)
↓
Clean repository, regenerated per machine
```

**Steps**:
1. Remove from git:
   ```bash
   git rm --cached -r .venv/
   ```

2. Verify size reduction:
   ```bash
   git status
   ```

3. Commit:
   ```bash
   git commit -m "Remove .venv from git"
   ```

4. Document in `README.md`:
   ```markdown
   ### Setup Backend
   
   1. Create virtual environment:
      ```bash
      python -m venv .venv
      source .venv/bin/activate  # On Windows: .venv\Scripts\activate
      ```
   
   2. Install dependencies:
      ```bash
      pip install -r chatbot/requirements.txt
      ```
   ```

**Verification**:
- `.venv/` not in `git status`
- `.gitignore` includes `.venv/`

---

## PHASE 2: REMOVE BUILD ARTIFACTS & UNNECESSARY FILES
**Estimated Time**: 20 minutes  
**Risk Level**: LOW (safe to delete)  
**Breaking Changes**: None  
**Post-Phase State**: Repository clean of generated files

### 2.1 Remove Build Artifacts (FAISS Index)

**Before**:
```
fitmentor.index (28.7 KB) - in git
fitmentor.index.json (8.9 KB) - in git
↓
Build artifacts versioned, regenerated each build
```

**After**:
```
fitmentor.index (generated locally)
fitmentor.index.json (generated locally)
.gitignore includes *.index, *.index.json
↓
Clean repository, auto-regenerated on startup
```

**Steps**:
1. Remove from git:
   ```bash
   git rm --cached fitmentor.index
   git rm --cached fitmentor.index.json
   ```

2. Add to `.gitignore` (ensure included from Phase 1.2):
   ```
   *.index
   *.index.json
   ```

3. Commit:
   ```bash
   git commit -m "Remove FAISS index artifacts from git"
   ```

**Verification**:
- Files deleted from git but still exist locally
- `.gitignore` includes patterns

---

### 2.2 Remove Debug/Temp Files

**Before**:
```
auth-state.json (3.8 KB) - debug data
chat_payload.json - test fixture
session_payload.json - test fixture
payload.json - test fixture
↓
Debug files in production repo
```

**After**:
```
These files moved to tests/ or .gitignore
↓
Production repo clean
```

**Steps**:
1. Check what these files contain:
   ```bash
   head -20 auth-state.json
   head -20 chat_payload.json
   ```

2. If they're test fixtures, move to `tests/fixtures/`:
   ```bash
   mkdir -p tests/fixtures/
   git mv chat_payload.json tests/fixtures/
   git mv session_payload.json tests/fixtures/
   git mv payload.json tests/fixtures/
   ```

3. If they're debug files, remove:
   ```bash
   git rm --cached auth-state.json
   ```

4. Add to `.gitignore`:
   ```
   auth-state.json
   *_payload.json
   ```

5. Commit:
   ```bash
   git commit -m "Move test fixtures and remove debug files"
   ```

**Verification**:
- Files removed from git (but may still exist locally)
- New `tests/fixtures/` directory created if applicable

---

### 2.3 Remove Manifest Files (Optional)

**Before**:
```
site_sync_manifest.json (37.6 KB) - auto-generated
spa_ingestion_manifest.json (7.1 KB) - auto-generated
↓
Auto-generated metadata in git (redundant)
```

**After**:
```
These files in .gitignore (regenerated by scripts)
↓
Smaller repository, manifests auto-generated
```

**Steps**:
1. Verify these are auto-generated (check chatbot/ingestion*.py):
   ```bash
   grep -n "site_sync_manifest\|spa_ingestion_manifest" chatbot/ingestion*.py
   ```

2. If auto-generated, add to `.gitignore`:
   ```
   *_manifest.json
   ```

3. Remove from git:
   ```bash
   git rm --cached "*_manifest.json"
   ```

4. Commit:
   ```bash
   git commit -m "Remove auto-generated manifest files from git"
   ```

**Verification**:
- Manifest files not in `git status`
- Pattern added to `.gitignore`

---

### 2.4 Delete Malformed/Unused Files

**Before**:
```
"pip install pandas sqlalchemy psycopg2-b.py" - Malformed name
check_tables.py - Unused utility at root
query_exercises.py - Unused utility at root
↓
Root directory cluttered, invalid filename
```

**After**:
```
These files either:
- Deleted (if unused)
- Moved to scripts/ (if useful)
↓
Clean repository, utilities organized
```

**Steps**:
1. Decide on each file:
   ```bash
   # Check what check_tables.py does
   head -30 check_tables.py
   
   # Check what query_exercises.py does
   head -30 query_exercises.py
   ```

2. For each file:
   - If useful: move to `scripts/`
   - If not used: delete from git
   
   Example:
   ```bash
   # Option A: Move to scripts
   mkdir -p scripts
   git mv check_tables.py scripts/
   git mv query_exercises.py scripts/
   
   # Option B: Delete if unused
   git rm check_tables.py
   git rm query_exercises.py
   ```

3. Delete malformed file:
   ```bash
   git rm "pip install pandas sqlalchemy psycopg2-b.py"
   ```

4. If you created `scripts/`, add README:
   ```bash
   # Create scripts/README.md explaining each script
   ```

5. Commit:
   ```bash
   git commit -m "Clean up root directory: organize utilities and remove malformed files"
   ```

**Verification**:
- Root directory clean (`git ls-files | grep -E "\.py$|scripts/" `)
- Utilities organized or removed

---

## PHASE 3: REORGANIZE BACKEND STRUCTURE
**Estimated Time**: 45-60 minutes  
**Risk Level**: MEDIUM (requires updating imports)  
**Breaking Changes**: None (internal reorganization)  
**Post-Phase State**: Backend organized with `routes/` subdirectory

### 3.1 Create Backend Routes Structure

**Before**:
```
chatbot/
├── main.py (1000+ lines with all routers)
├── chat.py (chat router)
├── user.py (user router)
├── recommendation.py (recommendation router)
├── model2_router.py (model2 router)
└── [core modules]

↓ Problem: main.py is huge, routes not visually separated
```

**After**:
```
chatbot/
├── main.py (FastAPI setup only, ~200 lines)
├── routes/
│   ├── __init__.py
│   ├── chat.py (chat router)
│   ├── user.py (user router)
│   ├── recommendation.py (recommendation router)
│   └── model2.py (model2 router)
├── core/
│   ├── engine.py (RAG engine)
│   ├── context_builder.py
│   ├── vector_store.py
│   └── cache_layer.py
├── services/
│   ├── supabase_client.py
│   └── ingestion.py
└── [other modules]

↓ Benefit: Clean separation, easier to scale, import clarity
```

**Steps**:

1. Create new directories:
   ```bash
   mkdir -p chatbot/routes
   mkdir -p chatbot/core
   mkdir -p chatbot/services
   ```

2. Move router files to `routes/`:
   ```bash
   git mv chatbot/chat.py chatbot/routes/chat.py
   git mv chatbot/user.py chatbot/routes/user.py
   git mv chatbot/recommendation.py chatbot/routes/recommendation.py
   git mv chatbot/model2_router.py chatbot/routes/model2.py
   ```

3. Move core modules to `core/`:
   ```bash
   git mv chatbot/engine.py chatbot/core/engine.py
   git mv chatbot/context_builder.py chatbot/core/context_builder.py
   git mv chatbot/vector_store.py chatbot/core/vector_store.py
   git mv chatbot/cache_layer.py chatbot/core/cache_layer.py
   git mv chatbot/router.py chatbot/core/router.py
   ```

4. Move service modules to `services/`:
   ```bash
   git mv chatbot/supabase_client.py chatbot/services/supabase_client.py
   git mv chatbot/ingestion.py chatbot/services/ingestion.py
   git mv chatbot/ingestion_spa.py chatbot/services/ingestion_spa.py
   ```

5. Create `__init__.py` files:
   ```bash
   touch chatbot/routes/__init__.py
   touch chatbot/core/__init__.py
   touch chatbot/services/__init__.py
   ```

6. Update imports in `main.py`:
   ```python
   # OLD:
   from chat import router as chat_router
   from user import router as user_router
   
   # NEW:
   from routes.chat import router as chat_router
   from routes.user import router as user_router
   from routes.recommendation import router as rec_router
   from routes.model2 import router as model2_router
   
   from core.engine import RAGEngine
   from services.supabase_client import SupabaseClient
   ```

7. Update imports in routes (if any cross-imports):
   ```python
   # Example in routes/chat.py
   # OLD: from engine import RAGEngine
   # NEW: from core.engine import RAGEngine
   ```

8. Test imports:
   ```bash
   cd chatbot && python -c "import main; print('Imports OK')"
   ```

9. Commit:
   ```bash
   git commit -m "Refactor backend: organize routes, core, and services into subdirectories"
   ```

**Verification**:
- All routers load in FastAPI (no import errors)
- API endpoints still work: `GET /api/health`, `POST /chat`, etc.
- Backend starts without errors: `python chatbot/main.py`

---

### 3.2 Add Type Hints to Backend Functions (Optional)

**Before**:
```python
def get_user(user_id):
    return db.query(...)

async def chat(message):
    return engine.process(message)
```

**After**:
```python
from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    id: str
    name: str

def get_user(user_id: str) -> User:
    return db.query(...)

async def chat(message: str) -> dict:
    return engine.process(message)
```

**Effort**: Can do this incrementally (not required for Phase 3)

---

## PHASE 4: IMPROVE FRONTEND & DOCUMENTATION
**Estimated Time**: 60 minutes  
**Risk Level**: LOW  
**Breaking Changes**: None  
**Post-Phase State**: Better documentation, cleaner config

### 4.1 Consolidate Documentation

**Before**:
```
Root level:
- CHATBOT_UPGRADE_DONE.md
- INBODY_DEFAULTS_GUIDE.md
- UPDATE_TYPES.md
- apply-migration-commands.md

chatbot/:
- README.md
- OPTIMIZATION_GUIDE.md
- SETUP_PERFORMANCE.md

model2/:
- COMPLETE_SUMMARY.md
- CHECKLIST.md
- DAILY_WORKFLOW.md

↓ Scattered, hard to find
```

**After**:
```
docs/
├── README.md (Quick start, links to other docs)
├── SETUP.md (Installation & environment)
├── ARCHITECTURE.md (Project structure)
├── API.md (Backend API reference)
├── FRONTEND.md (Frontend setup & structure)
├── ML_PIPELINE.md (ML/Model2 documentation)
├── DATABASE.md (Supabase/migrations)
├── OPTIMIZATION.md (Performance tips)
├── DEPLOYMENT.md (Production deployment)
└── TROUBLESHOOTING.md (Common issues)

↓ Organized, easy to navigate
```

**Steps**:

1. Create docs folder:
   ```bash
   mkdir -p docs
   ```

2. Create README.md (index):
   ```markdown
   # FitMentor Documentation
   
   - [Setup](SETUP.md) - Environment setup & dependencies
   - [Architecture](ARCHITECTURE.md) - Project structure & tech stack
   - [Frontend](FRONTEND.md) - React app overview
   - [Backend API](API.md) - FastAPI endpoints
   - [ML Pipeline](ML_PIPELINE.md) - Workout generator
   - [Database](DATABASE.md) - Supabase setup
   - [Performance](OPTIMIZATION.md) - Optimization tips
   - [Deployment](DEPLOYMENT.md) - Production setup
   - [Troubleshooting](TROUBLESHOOTING.md) - Common issues
   ```

3. Migrate existing docs:
   - Copy relevant content from scattered docs
   - Move to `docs/`
   - Keep originals or delete them

4. Create or update each section

5. Commit:
   ```bash
   git add docs/
   git commit -m "Add consolidated documentation in docs/ directory"
   ```

**Verification**:
- `docs/` directory exists with all documentation
- Links in README work
- Coverage of setup, architecture, API, deployment

---

### 4.2 Fix ESLint Configuration

**Before**:
```javascript
"@typescript-eslint/no-unused-vars": "off",  // DISABLED!
```

**After**:
```javascript
"@typescript-eslint/no-unused-vars": [
  "warn",
  { argsIgnorePattern: "^_" }  // Allow unused if prefixed with _
],
```

**Steps**:

1. Find unused variables:
   ```bash
   npm run lint
   ```

2. Either remove them or prefix with `_`:
   ```typescript
   // Before
   const unused = value;
   
   // After
   const _unused = value;  // Intentionally unused
   ```

3. Update eslint.config.js:
   ```javascript
   "@typescript-eslint/no-unused-vars": [
     "warn",
     {
       argsIgnorePattern: "^_",
       varsIgnorePattern: "^_",
     },
   ],
   ```

4. Run linter:
   ```bash
   npm run lint
   ```

5. Commit:
   ```bash
   git commit -m "Enable unused variable detection in ESLint"
   ```

---

### 4.3 Add .env.example Documentation

**Steps**:

1. Add comments to `.env.example`:
   ```bash
   # Frontend - Supabase
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
   
   # Backend - Supabase (Admin)
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   
   # LLM - Cohere
   COHERE_API_KEY=your_key_here
   
   # Backend URL
   VITE_CHATBOT_API_URL=http://127.0.0.1:8000
   
   # Server config
   HOST=127.0.0.1
   PORT=8000
   
   # LLM Config
   LLM_MODEL=command-a-03-2025
   EMBED_MODEL=embed-english-v3.0
   FAISS_INDEX_PATH=./fitmentor.index
   ```

2. Create `.env.local` for local development (template):
   ```bash
   # Copy .env.example to .env.local and fill in your keys
   cp .env.example .env.local
   ```

3. Add to `SETUP.md`:
   ```markdown
   ### Environment Setup
   
   1. Copy template:
      ```bash
      cp .env.example .env.local
      ```
   
   2. Fill in your API keys
   3. Never commit .env files
   ```

---

## PHASE 5: ADD INFRASTRUCTURE (CI/CD, TESTS, OPTIONAL)
**Estimated Time**: 2-4 hours (optional, can defer)  
**Risk Level**: LOW  
**Breaking Changes**: None  
**Post-Phase State**: Production-ready with CI/CD

### 5.1 Add GitHub Actions CI/CD (Optional)

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run type-check

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
```

---

### 5.2 Add Pre-commit Hooks (Optional)

Install `husky`:
```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-commit "npm run type-check"
```

Prevents committing broken code.

---

### 5.3 Add Testing Framework (Optional)

Frontend:
```bash
npm install --save-dev vitest @testing-library/react
```

Backend:
```bash
pip install pytest pytest-asyncio
```

---

## EXECUTION CHECKLIST

Use this to track progress:

### Phase 1: Security Fixes ☐
- ☐ 1.1 Remove .env from git
- ☐ 1.2 Update .gitignore
- ☐ 1.3 Remove Python cache files
- ☐ 1.4 Remove .venv from git

### Phase 2: Remove Artifacts ☐
- ☐ 2.1 Remove FAISS index files
- ☐ 2.2 Remove debug/temp files
- ☐ 2.3 Remove manifest files (optional)
- ☐ 2.4 Delete malformed files

### Phase 3: Backend Reorganization ☐
- ☐ 3.1 Create routes/ structure
- ☐ 3.1 Move routers to routes/
- ☐ 3.1 Move core modules
- ☐ 3.1 Move service modules
- ☐ 3.1 Update all imports
- ☐ 3.1 Test backend starts correctly

### Phase 4: Documentation & Frontend ☐
- ☐ 4.1 Create docs/ directory
- ☐ 4.1 Consolidate documentation
- ☐ 4.2 Fix ESLint configuration
- ☐ 4.3 Update .env.example

### Phase 5: Infrastructure (Optional) ☐
- ☐ 5.1 Add GitHub Actions (optional)
- ☐ 5.2 Add pre-commit hooks (optional)
- ☐ 5.3 Add testing framework (optional)

---

## ROLLBACK PROCEDURE

If something breaks during Phase X:

1. **Immediately stop**: Don't continue to next phase
2. **Identify the problem**:
   ```bash
   git diff HEAD~1
   git status
   ```

3. **Rollback to last known good**:
   ```bash
   git reset --hard HEAD~1  # Undo last commit
   git checkout backup-before-cleanup  # Or restore from backup branch
   ```

4. **Investigate**: Run `npm run dev` or `python chatbot/main.py` to test

5. **Fix & Retry**: Address issue and commit again

---

## SUMMARY

| Phase | Duration | Commits | Difficulty | Status |
|-------|----------|---------|------------|--------|
| 1: Security | 30-45 min | 4-5 | Easy | Critical |
| 2: Cleanup | 20 min | 4-5 | Easy | High |
| 3: Backend Org | 45-60 min | 1 | Medium | Medium |
| 4: Docs | 60 min | 2-3 | Easy | Medium |
| 5: Infrastructure | 2-4 hours | 3-5 | Hard | Optional |

**Total Timeline**: 3-4 hours (Phases 1-4), +2-4 hours if doing Phase 5

---

## NEXT STEPS

1. ✅ **Review this plan** - Understand all phases
2. ⏳ **Approve phases** - Tell me which ones you want to execute
3. ⏳ **Execute sequentially** - I'll run each phase step-by-step
4. ⏳ **Verify after each** - Test that nothing broke
5. ⏳ **Final commit** - Clean up and push to main

---

**Ready to proceed? Please confirm:**
- Which phases do you want to execute? (1, 2, 3, 4, or all?)
- Any modifications to the plan?
- Any concerns before starting Phase 1?
