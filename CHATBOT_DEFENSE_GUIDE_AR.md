# FitMentor Chatbot Defense Guide

## 1. What The Chatbot Is In This Codebase

The implemented chatbot is a production-style Hybrid RAG assistant for fitness and nutrition.

It is not a generic chatbot and it is not a classic tool-calling agent. In the current code, the "agent" behavior is implemented as a controlled pipeline:

User message -> Query Router -> Supabase context and/or FAISS retrieval -> LangChain prompt -> Cohere LLM -> API response.

The system is designed to answer:

1. Personal fitness questions using the user's real data from Supabase.
2. General fitness or app-usage questions using a FAISS vector knowledge base.
3. Personalized advice by combining both sources.
4. Off-topic questions with a controlled refusal.

Important clarification for defense:

There is no autonomous agent loop that chooses tools dynamically. The code uses deterministic routing and internal retrieval functions. This makes the system easier to control, debug, and evaluate.

---

## 2. Chatbot Entry Point

### Backend entry point

File:

`chatbot/main.py`

Important parts:

1. Creates the FastAPI app.
2. Loads environment variables from `.env`.
3. Configures CORS.
4. Initializes the FAISS vector store on startup.
5. Warms up the RAG engine if `COHERE_API_KEY` exists.
6. Registers API routers:
   1. `/api/chat`
   2. `/api/user`
   3. `/api/recommendation`
   4. `/api/model2`
7. Provides `/api/health`.

### Main chatbot endpoint

File:

`chatbot/chat.py`

Function:

`chat(req: ChatRequest)`

Route:

`POST /api/chat`

This is the main endpoint that receives the user question, routes it, retrieves data, calls the RAG engine, and returns the final answer.

### Frontend entry point

File:

`src/components/ai/AIAssistantView.tsx`

Important function:

`sendMessage(query: string)`

This function:

1. Adds the user message to the UI.
2. Creates or selects a conversation.
3. Saves the user message through backend conversation APIs.
4. Sends the question to `POST /api/chat`.
5. Reads the streaming Server-Sent Events response.
6. Displays the assistant answer.
7. Saves the assistant message.

---

## 3. Main Modules And Responsibilities

### `main.py`

Responsibility:

FastAPI application bootstrap.

Connects to:

1. `chat.py` for chat APIs.
2. `user.py` for user data APIs.
3. `recommendation.py` for recommendation APIs.
4. `model2_router.py` for workout generation APIs.
5. `vector_store.py` to load FAISS.
6. `engine.py` to warm up the RAG engine.
7. `ingestion.py` and `ingestion_spa.py` for optional startup knowledge sync.

Important functions/classes:

1. `lifespan(app)`: startup and shutdown logic.
2. `health()`: returns system status, vector store size, and LLM provider.

---

### `chat.py`

Responsibility:

Main chat API and chat history API.

What it does:

1. Defines request/response models.
2. Handles conversations and messages.
3. Uses Supabase for persistent chat history when configured.
4. Falls back to in-memory dictionaries if Supabase is unavailable.
5. Receives user questions through `POST /api/chat`.
6. Calls the Query Router.
7. Builds Supabase structured context when needed.
8. Calls the RAG engine.
9. Supports streaming responses through Server-Sent Events.

Important classes:

1. `ChatRequest`
2. `ChatResponse`
3. `ConversationCreateRequest`
4. `MessageCreateRequest`

Important functions:

1. `list_conversations`
2. `create_conversation`
3. `update_conversation`
4. `delete_conversation`
5. `list_messages`
6. `create_message`
7. `chat`
8. `_sse`

Important note:

The frontend sends `conversation_id` in the chat request body, but `ChatRequest` does not define `conversation_id`. So the LLM response generation does not use previous chat messages from that conversation.

---

### `router.py`

Responsibility:

Classifies the user query and chooses the retrieval strategy.

Retrieval modes:

1. `SUPABASE_ONLY`: personal questions.
2. `VECTOR_ONLY`: general knowledge or app/page content questions.
3. `HYBRID`: personal advice requiring both user data and knowledge.
4. `OFF_TOPIC`: outside the fitness domain.

Important classes:

1. `RetrievalMode`
2. `RoutingDecision`

Important functions:

1. `route_query(query, user_id)`
2. `_score(text, signals)`

How it decides:

It uses keyword signal lists:

1. `_PERSONAL_SIGNALS`
2. `_KNOWLEDGE_SIGNALS`
3. `_HYBRID_SIGNALS`
4. `_SITE_CONTENT_SIGNALS`
5. `_OFF_TOPIC_SIGNALS`
6. `_FITNESS_DOMAIN`

Important behavior:

If there is no `user_id`, the router returns `VECTOR_ONLY`, because the system cannot safely fetch personal user data.

---

### `context_builder.py`

Responsibility:

Builds a structured user context from Supabase data and formats it for the LLM prompt.

Connects to:

`supabase_client.py`

Important class:

`StructuredContext`

Important functions:

1. `build_user_context(user_id)`
2. `build_context_from_profile(profile, user_id)`
3. `StructuredContext.as_full_context()`
4. `StructuredContext.as_compact()`

Data sections it can build:

1. User profile
2. InBody/body measurements
3. InBody results
4. Coach plan
5. Workout plans
6. Meal plans
7. Meal items
8. Meal check-ins
9. Meals
10. Workouts
11. Workout sessions
12. Exercise sets
13. Exercise library
14. Food library
15. Social activity
16. Direct messages
17. Database coverage summary

Memory-related note:

This context includes fitness history and direct messages if they exist in Supabase. It does not include previous chatbot messages from `chatbot_messages`.

---

### `engine.py`

Responsibility:

The main Hybrid RAG engine.

What it does:

1. Initializes the Cohere chat model through LangChain.
2. Initializes the Cohere embedder.
3. Loads the FAISS vector store singleton.
4. Retrieves vector documents when the route requires it.
5. Merges structured Supabase context and vector documents.
6. Builds the prompt.
7. Calls the LLM.
8. Cleans the final answer.
9. Generates follow-up questions.
10. Caches full RAG responses.
11. Supports streaming generation.

Important class:

`HybridRAGEngine`

Important dataclass:

`RAGResult`

Important functions:

1. `generate`
2. `stream_generate`
3. `_get_formatted_context`
4. `_fallback_answer`
5. `_generate_followups`
6. `get_rag_engine`

Actual LLM model used:

The code uses `ChatCohere` with:

`model=os.getenv("LLM_MODEL", "command-a-03-2025")`

So the default model in the actual implementation is:

`command-a-03-2025`

Important note:

Some documentation in the repo mentions older models like `command-r-plus`, but the actual code default is `command-a-03-2025`.

---

### `vector_store.py`

Responsibility:

Manages FAISS vector search and Cohere embeddings.

Important classes:

1. `VectorStoreManager`
2. `CohereEmbedder`

Vector database:

FAISS using:

`faiss.IndexFlatIP`

Embedding model:

`os.getenv("EMBED_MODEL", "embed-multilingual-v3.0")`

Default embedding model:

`embed-multilingual-v3.0`

Embedding dimension:

`1024`

Important files created/loaded:

1. `fitmentor.index`
2. `fitmentor.index.json`

Important functions:

1. `VectorStoreManager.get_instance`
2. `add`
3. `add_unique`
4. `remove_where`
5. `remove_by_source`
6. `rebuild`
7. `search`
8. `save`
9. `_load_if_exists`
10. `CohereEmbedder.embed_documents`
11. `CohereEmbedder.embed_documents_cached`
12. `CohereEmbedder.embed_query_cached`

---

### `ingestion.py`

Responsibility:

Builds the website knowledge base for RAG.

What it does:

1. Crawls pages or reads supplied URLs.
2. Extracts page text with BeautifulSoup.
3. Removes layout elements like nav, footer, script, style, header, aside.
4. Chunks text semantically.
5. Embeds chunks with Cohere.
6. Stores vectors and metadata in FAISS.
7. Supports incremental sync with a manifest.

Important functions:

1. `discover_sitemap_urls`
2. `crawl_site`
3. `semantic_chunk`
4. `ingest_urls`
5. `sync_site_knowledge`
6. `ingest_site`

Chunking settings:

1. `CHUNK_SIZE_WORDS = 280`
2. `CHUNK_OVERLAP_WORDS = 40`
3. `MIN_CHUNK_WORDS = 30`

Manifest:

`chatbot/site_sync_manifest.json`

---

### `ingestion_spa.py`

Responsibility:

Builds a knowledge base from the rendered React/Vite single-page application routes.

What it does:

1. Extracts static routes from `src/App.tsx`.
2. Opens routes using Playwright.
3. Extracts visible rendered text from the DOM.
4. Skips hidden elements, navigation, headers, footers, sidebars, modals, etc.
5. Chunks the visible text.
6. Embeds changed chunks with Cohere.
7. Adds them to FAISS.
8. Removes old vectors for changed pages.
9. Invalidates vector and RAG response caches.

Important functions/classes:

1. `PageSnapshot`
2. `extract_routes_from_react_app`
3. `fetch_spa_snapshots`
4. `extract_visible_text`
5. `semantic_chunk`
6. `sync_spa_routes`
7. `routes_from_env`

Manifest:

`chatbot/spa_ingestion_manifest.json`

---

### `supabase_client.py`

Responsibility:

Older/general Supabase REST client used by `context_builder.py`, `user.py`, and `inbody_handler.py`.

What it does:

1. Creates a shared `httpx.AsyncClient`.
2. Builds Supabase REST headers.
3. Reads user-scoped tables.
4. Reads global library tables.
5. Builds a large dictionary of user-related rows through `fetch_all_user_tables`.

Important functions:

1. `headers`
2. `get_http_client`
3. `close_http_client`
4. `fetch_table`
5. `fetch_table_first`
6. `fetch_profile`
7. `fetch_body_measurements`
8. `fetch_inbody`
9. `fetch_workouts`
10. `fetch_meals`
11. `fetch_meal_plans`
12. `fetch_direct_messages`
13. `fetch_workout_plans`
14. `fetch_all_user_tables`

Important note:

There is also a newer organized package under `chatbot/supabase/`. The codebase currently uses both styles.

---

### `chatbot/supabase/`

Responsibility:

Domain-organized Supabase service layer.

Files:

1. `base.py`: core HTTP client, GET/POST/PATCH/DELETE helpers.
2. `user_service.py`: profile, measurements, InBody, weight logs.
3. `workout_service.py`: workouts, routines, sessions, workout plans, mutations.
4. `meal_service.py`: meals, meal plans, meal items, check-ins, food items.
5. `library_service.py`: exercise library.
6. `coach_service.py`: coach plans and plan muscles.
7. `social_service.py`: direct messages, follows, posts, comments, likes.
8. `context_service.py`: fetches all user tables using the organized services.
9. `__init__.py`: exports all service functions.

Used by:

1. `chat.py` for chat conversations/messages through `fetch_table`, `supabase_post`, `supabase_patch`, `supabase_delete`.
2. `model2_router.py` for workout routine/session persistence.

Important note:

`context_builder.py` imports from `supabase_client.py`, not from the newer `chatbot/supabase/context_service.py`.

---

### `cache_layer.py`

Responsibility:

Caching layer for performance.

What it caches:

1. User context.
2. Full RAG responses.
3. Embeddings.
4. Vector search results.
5. Workout routines in `model2_router.py`.

Backends:

1. In-memory cache by default.
2. Optional Redis if `REDIS_URL` exists.

Important TTLs:

1. `USER_CONTEXT_TTL = 300` seconds by default.
2. `QUERY_CACHE_TTL = 120` seconds by default.
3. `EMBEDDING_CACHE_TTL = 3600` seconds by default.
4. `VECTOR_SEARCH_TTL = 120` seconds by default.

Important classes/functions:

1. `CacheEntry`
2. `InMemoryCache`
3. `CacheManager`
4. `get_cache_manager`
5. `_cache_key_user_context`
6. `_cache_key_embedding`
7. `_cache_key_vector_search`
8. `_cache_key_rag_response`

---

### `recommendation.py`

Responsibility:

Provides a dedicated recommendation endpoint that always uses hybrid retrieval.

Route:

`POST /api/recommendation`

Important behavior:

1. Receives `user_id` and `recommendation_type`.
2. Converts the type into a predefined query.
3. Builds user context from Supabase.
4. Forces routing mode to `HYBRID`.
5. Calls `engine.generate`.

Important class/function:

1. `RecommendationRequest`
2. `get_recommendation`
3. `RECOMMENDATION_QUERIES`

---

### `user.py`

Responsibility:

Debug/support APIs for reading user data and generated context.

Important endpoints:

1. `/api/user/{user_id}/profiles`
2. `/api/user/{user_id}/inbody`
3. `/api/user/{user_id}/meal-plans`
4. `/api/user/{user_id}/meals`
5. `/api/user/{user_id}/coach-plan`
6. `/api/user/{user_id}/goals`
7. `/api/user/{user_id}/workouts`
8. `/api/user/{user_id}/context`

Most important for defense:

`get_user_context` shows exactly what the LLM receives as structured Supabase context.

---

### `model2_router.py`

Responsibility:

Workout generation API bridge, separate from the chatbot RAG answer generation.

What it does:

1. Loads the `model2` FitMentor workout generator.
2. Normalizes goals, experience, equipment, and muscles.
3. Estimates body fat and skeletal muscle mass if missing.
4. Generates a personalized workout plan.
5. Saves routines.
6. Starts and tracks workout sessions.

Important endpoints:

1. `/api/model2/metadata`
2. `/api/model2/recommend`
3. `/api/model2/routines/save`
4. `/api/model2/routines`
5. `/api/model2/routines/{routine_id}`
6. `/api/model2/routines/{routine_id}/start`
7. `/api/model2/sessions/{session_id}`

Important note:

This is not called by the chatbot agent in `engine.py`. It is a separate API used by the workouts feature.

---

### `inbody_handler.py`

Responsibility:

Save and read InBody JSON results in Supabase.

Important endpoints/functions:

1. `save_inbody_result_to_db`
2. `save_inbody_result`
3. `get_user_inbody_results`
4. `get_latest_inbody_result`

Important note:

In the current `main.py`, this router is not included. So this file exists but is not currently exposed by the FastAPI app unless mounted elsewhere.

---

### `page_documentation.py`

Responsibility:

Static documentation database for app pages and features.

Important functions:

1. `get_page_documentation`
2. `get_all_pages_summary`
3. `format_page_context`

Important note:

This file is not imported by the current `chat.py` or `engine.py` path. App/page content in the current chatbot comes mainly through FAISS ingestion, not directly from this file.

---

### `performance.py`

Responsibility:

Defines performance tracking classes and report helpers.

Important classes/functions:

1. `PerformanceMetrics`
2. `PerformanceTracker`
3. `record_metrics`
4. `get_performance_report`
5. `reset_metrics`

Important note:

The module exists, but the current `engine.py` does not actively record these metrics in the main chat path.

---

### Other files

1. `requirements.txt`: Python dependencies for FastAPI, Cohere, LangChain, FAISS, Redis, Playwright, etc.
2. `README.md`: high-level architecture documentation. Some parts may be older than the actual code.
3. `OPTIMIZATION_GUIDE.md`, `OPTIMIZATION_SUMMARY.md`, `SETUP_PERFORMANCE.md`: documentation for performance and setup.
4. `chat_payload.json`, `payload.json`, `session_payload.json`: sample payloads for testing.
5. `_debug_engine_test.py`: quick local engine test script.
6. `debug_check_extract.py`: debug helper.
7. `test_context_builder_memory.py`: tests around context/memory behavior, but the currently inspected `context_builder.py` does not expose the exact named memory helpers from the test. This looks like a leftover or partially outdated test.
8. `migrations/002_create_chatbot_history_rls.sql`: SQL migration for chatbot history tables and RLS.
9. `site_sync_manifest.json`: manifest for crawled website ingestion.
10. `spa_ingestion_manifest.json`: manifest for SPA route ingestion.
11. `FitMentorChat.jsx`: appears to be a tiny/placeholder older component; the active frontend is `src/components/ai/AIAssistantView.tsx`.
12. `__pycache__/`: generated Python cache files, not part of source architecture.
13. `سكيما.png`: image asset/documentation, not part of runtime logic.

---

## 4. Agent Workflow

Although the code does not implement an autonomous tool-calling agent, it behaves like a controlled assistant pipeline.

Workflow:

1. Receive query from frontend.
2. Validate query is not empty.
3. Route query using `route_query`.
4. If off-topic, return a fixed fitness-domain response.
5. If personal or hybrid, build `StructuredContext` from Supabase.
6. If vector or hybrid, embed the query using Cohere embeddings.
7. Search FAISS for relevant chunks.
8. Merge retrieved knowledge with structured context.
9. Build LangChain prompt.
10. Generate answer with Cohere Chat model.
11. Clean response.
12. Return answer, sources, routing metadata, confidence, and follow-up questions.

Architecture flow:

```text
User
  |
  v
React AI Assistant
  |
  v
POST /api/chat
  |
  v
chat.py
  |
  v
router.py
  |
  +--> OFF_TOPIC -> controlled response
  |
  +--> SUPABASE_ONLY -> context_builder.py -> supabase_client.py -> Supabase
  |
  +--> VECTOR_ONLY -> engine.py -> vector_store.py -> FAISS + Cohere embeddings
  |
  +--> HYBRID -> Supabase context + FAISS retrieval
  |
  v
engine.py
  |
  v
LangChain Prompt
  |
  v
Cohere LLM
  |
  v
ChatResponse / SSE stream
  |
  v
React UI
```

Requested compact flow:

```text
User -> API -> Chatbot Agent/Pipeline -> Retrieval + Tools + Memory -> LLM -> Response
```

Implemented version:

```text
User
-> AIAssistantView.tsx
-> POST /api/chat
-> chat.py
-> router.py
-> context_builder.py / vector_store.py / cache_layer.py
-> engine.py
-> Cohere via LangChain
-> streamed ChatResponse
-> UI + saved messages
```

---

## 5. How User Messages Are Processed

### In the frontend

File:

`src/components/ai/AIAssistantView.tsx`

Function:

`sendMessage`

Steps:

1. Trim the user input.
2. Stop if the message is empty, currently sending, or message limit is reached.
3. Add the user message locally to the UI.
4. Ensure a conversation exists.
5. Save the user message through:

   `POST /api/chat/conversations/{conversation_id}/messages`

6. Send the AI request to:

   `POST /api/chat`

7. Request streaming with:

   `stream: true`

8. Read SSE chunks.
9. Update the assistant message as chunks arrive.
10. Save the final assistant message.

### In the backend

File:

`chatbot/chat.py`

Function:

`chat(req: ChatRequest)`

Steps:

1. Strips `req.query`.
2. Rejects empty query with HTTP 400.
3. Calls:

   `route_query(query, user_id=req.user_id)`

4. Handles `OFF_TOPIC` immediately.
5. Builds user context if route is `SUPABASE_ONLY` or `HYBRID`.
6. Falls back to `req.user_profile` if no Supabase context is available.
7. Gets the engine:

   `engine = get_rag_engine()`

8. Calls:

   `engine.stream_generate(...)`

   or:

   `engine.generate(...)`

9. Returns `ChatResponse`.

---

## 6. How Responses Are Generated

File:

`chatbot/engine.py`

Class:

`HybridRAGEngine`

Method:

`generate` or `stream_generate`

Generation steps:

1. Build a response cache key using query and user id.
2. If cached response exists, return it.
3. If route is `VECTOR_ONLY` or `HYBRID`:
   1. Embed the query using `CohereEmbedder.embed_query_cached`.
   2. Search FAISS with `VectorStoreManager.search`.
   3. Select top documents.
   4. Prioritize route-specific documents if the question mentions a route/path.
4. If route is `SUPABASE_ONLY`, sources become `["Supabase User Data"]`.
5. If route is `HYBRID`, limit vector docs to top 3 and add Supabase as a source.
6. Format context using `_format_context`.
7. Run the LangChain chain:

   `chat_prompt -> ChatCohere -> StrOutputParser`

8. Clean the answer using `_clean_response`.
9. Build `RAGResult`.
10. Cache the result.
11. Return answer and metadata.

---

## 7. LLM Model Used

Actual implementation:

```python
self.llm = ChatCohere(
    cohere_api_key=api_key,
    model=os.getenv("LLM_MODEL", "command-a-03-2025"),
    temperature=0.35,
    max_tokens=600,
)
```

Default LLM:

`command-a-03-2025`

Provider:

Cohere

Framework:

LangChain, through `langchain_cohere.ChatCohere`.

Temperature:

`0.35`

Max tokens:

`600`

---

## 8. Prompts Used By The Agent

The main prompt is in:

`chatbot/engine.py`

### System prompt summary

The assistant is instructed to:

1. Act as FitMentor AI, a sports science and nutrition coach.
2. Give personalized, evidence-based advice.
3. Reference biometric data when available.
4. Be direct and actionable.
5. Use a warm motivating tone.
6. Respond in the same language as the user.
7. Avoid dangerous recommendations or replacing medical advice.
8. Return clean plain text.
9. Avoid markdown symbols.
10. Keep answers under 350 words unless a full plan is requested.

### Context template

The user message is wrapped with:

```text
=== RETRIEVED CONTEXT ===
{context}

=== ROUTING METADATA ===
Mode: {routing_mode}
Intent: {intent}

=== USER QUESTION ===
{query}
```

### Recommendation prompts

File:

`chatbot/recommendation.py`

`RECOMMENDATION_QUERIES` contains predefined prompts for:

1. `general`
2. `workout`
3. `nutrition`
4. `recovery`

These are not user-written prompts. They are internal query templates used by `/api/recommendation`.

---

## 9. Tools And Functions Available To The Agent

There are no external dynamic tools exposed to the LLM through tool calling.

Available internal functions in the pipeline:

1. Query classification:
   `route_query`

2. User data retrieval:
   `build_user_context`
   `fetch_all_user_tables`
   Supabase fetch functions

3. Vector retrieval:
   `CohereEmbedder.embed_query_cached`
   `VectorStoreManager.search`

4. Caching:
   `get_cache_manager`

5. Prompt/response generation:
   `HybridRAGEngine.generate`
   `HybridRAGEngine.stream_generate`

6. Chat history persistence:
   Conversation/message endpoints in `chat.py`

For defense:

I would describe them as internal pipeline tools, not LLM-callable tools.

---

## 10. Memory Management

### Short-term memory

Implemented:

1. In-memory fallback dictionaries in `chat.py`:
   1. `_MEMORY_CONVERSATIONS`
   2. `_MEMORY_MESSAGES`
2. In-memory cache in `cache_layer.py`.
3. Redis optional cache if `REDIS_URL` is configured.

Not implemented:

The current LLM prompt does not include recent messages from the active chatbot conversation.

### Long-term memory

Implemented:

1. Chat conversations are stored in Supabase table:

   `chatbot_conversations`

2. Chat messages are stored in Supabase table:

   `chatbot_messages`

3. User fitness data is stored in Supabase tables and used as long-term personal context:
   1. profiles
   2. body_measurements
   3. inbody_results
   4. workouts
   5. meals
   6. meal plans
   7. workout sessions
   8. direct messages
   9. libraries

Important limitation:

The chat history is persisted and displayed, but previous chatbot messages are not injected back into the LLM context in the current `POST /api/chat` implementation.

---

## 11. Database Interactions

Database:

Supabase REST API.

Authentication:

The backend uses:

`SUPABASE_SERVICE_ROLE_KEY`

Main database interactions:

1. Chat history:
   1. `chatbot_conversations`
   2. `chatbot_messages`

2. User profile and fitness context:
   1. `profiles`
   2. `body_measurements`
   3. `weight_logs`
   4. `inbody_results`
   5. `workouts`
   6. `exercises`
   7. `user_workout_sessions`
   8. `meals`
   9. `user_meal_plans`
   10. `posts`
   11. `post_comments`
   12. `post_likes`
   13. `direct_messages`
   14. `user_follows`

3. Global knowledge tables:
   1. `exercise_library`
   2. `food_items`
   3. `workout_plans`
   4. `workout_plan_days`
   5. `workout_plan_exercises`
   6. `coach_plans`
   7. `plan_muscles`

4. Workout routine/session persistence:
   1. workout routines
   2. user workout sessions

---

## 12. Retrieval Mechanism

The chatbot uses Hybrid Retrieval.

### Supabase retrieval

Used when:

1. The user asks about personal data.
2. The user asks for personalized advice.

Pipeline:

`chat.py -> context_builder.py -> supabase_client.py -> Supabase`

Output:

`StructuredContext`

### Vector retrieval

Used when:

1. The user asks general knowledge.
2. The user asks about website/app page content.
3. The user asks personalized advice requiring background knowledge.

Pipeline:

`engine.py -> CohereEmbedder -> FAISS VectorStoreManager`

Output:

Relevant document chunks with metadata:

1. text
2. source
3. route
4. title
5. type
6. score

### Hybrid retrieval

Used when:

The answer needs both personal data and general/app knowledge.

Example:

"اعمل لي خطة أكل حسب وزني وهدفي"

The system retrieves:

1. Structured user data from Supabase.
2. Top relevant chunks from FAISS.

Then both are inserted into the prompt.

---

## 13. Vector Database And Embeddings

Vector DB:

FAISS

Index type:

`IndexFlatIP`

Similarity:

Inner product on normalized vectors, effectively cosine-style similarity.

Embedding provider:

Cohere

Embedding model:

`embed-multilingual-v3.0`

Why multilingual matters:

The UI and prompts include Arabic and English, so multilingual embeddings allow Arabic questions to retrieve English or Arabic relevant content more reliably.

Stored files:

1. `fitmentor.index`
2. `fitmentor.index.json`

Knowledge sources:

1. Crawled public site pages from `ingestion.py`.
2. Rendered React routes from `ingestion_spa.py`.

---

## 14. One Complete User Query Lifecycle

Example user question:

"اعمل لي خطة أكل حسب وزني وهدفي"

### Step 1: Frontend receives input

File:

`src/components/ai/AIAssistantView.tsx`

Function:

`sendMessage`

The frontend:

1. Displays the user message.
2. Creates a conversation if needed.
3. Saves the user message.
4. Sends the request to:

```http
POST /api/chat
```

Request body includes:

1. `query`
2. `session_id`
3. `user_id`
4. `user_profile`
5. `stream: true`

### Step 2: Backend receives the request

File:

`chatbot/chat.py`

Function:

`chat(req: ChatRequest)`

It validates that the query is not empty.

### Step 3: Router decides what to do

File:

`chatbot/router.py`

Function:

`route_query(query, user_id)`

Because the query asks for a plan "for me" and depends on personal data, the router returns:

`HYBRID`

with intent:

`personalized_knowledge`

### Step 4: Supabase context is built

File:

`chatbot/context_builder.py`

Function:

`build_user_context(user_id)`

This calls:

`fetch_all_user_tables(user_id)`

from:

`chatbot/supabase_client.py`

The system fetches profile, measurements, meals, workouts, plans, libraries, and related user rows. Then it formats them into text sections.

### Step 5: Vector retrieval runs

File:

`chatbot/engine.py`

Method:

`HybridRAGEngine.stream_generate`

The engine:

1. Embeds the query using Cohere:

   `embed_query_cached`

2. Searches FAISS:

   `vector_store.search`

3. Retrieves relevant nutrition/fitness/app chunks.

4. In hybrid mode, keeps top 3 vector docs.

### Step 6: Prompt is assembled

File:

`chatbot/engine.py`

Functions:

1. `_format_context`
2. `_get_formatted_context`

The final context includes:

1. Supabase personal data.
2. Retrieved knowledge chunks.
3. Routing metadata.
4. The original user question.

### Step 7: LLM generates answer

File:

`chatbot/engine.py`

The LangChain chain runs:

```text
RunnablePassthrough
-> chat_prompt
-> ChatCohere
-> StrOutputParser
```

The LLM generates a personalized answer in Arabic because the user asked in Arabic.

### Step 8: Response is streamed back

File:

`chatbot/chat.py`

The backend streams SSE events:

1. `chunk`
2. `done`
3. `error` if needed

The final `done` payload includes:

1. answer
2. sources
3. routing_mode
4. structured_context_used
5. vector_docs_used
6. confidence
7. follow_up_questions
8. session_id

### Step 9: Frontend displays and saves answer

File:

`src/components/ai/AIAssistantView.tsx`

The frontend:

1. Updates the assistant bubble as chunks arrive.
2. Saves the assistant message to the backend.
3. Updates the conversation timestamp.

---

## 15. Presentation Section

### Slide 1: Chatbot Overview

Important bullet points:

1. FitMentor chatbot is a fitness and nutrition AI assistant.
2. It uses real user data from Supabase.
3. It uses FAISS vector search for app and fitness knowledge.
4. It generates answers using Cohere through LangChain.
5. It supports Arabic and English.

Defense explanation:

"The chatbot is not just a static FAQ bot. It reads the user's actual profile, body measurements, workouts, and nutrition data, then combines that with retrieved knowledge from the app content to produce personalized fitness guidance."

---

### Slide 2: Main Architecture

Important bullet points:

1. Frontend: React AI Assistant page.
2. API: FastAPI backend.
3. Router: chooses Supabase, FAISS, Hybrid, or off-topic.
4. Retrieval: Supabase structured context and FAISS documents.
5. LLM: Cohere model through LangChain.
6. Response: streamed back to the UI.

Defense explanation:

"The architecture is a controlled RAG pipeline. The API receives the message, the router decides what information is needed, then the engine builds a grounded prompt and sends it to the LLM."

---

### Slide 3: Query Router

Important bullet points:

1. Personal questions go to Supabase.
2. Knowledge questions go to FAISS.
3. Personalized advice uses both.
4. Off-topic questions are rejected safely.
5. Supports Arabic and English signals.

Defense explanation:

"Instead of sending every question to every data source, I added a router. This reduces unnecessary retrieval and helps the system choose the most relevant context for each question."

---

### Slide 4: Supabase Personal Context

Important bullet points:

1. Profile data.
2. InBody/body measurements.
3. Workouts and sessions.
4. Meal plans and meals.
5. Exercise and food libraries.
6. Coach plan and social/direct message context.

Defense explanation:

"The context builder converts database rows into clear text sections. This gives the LLM structured information, so it can reference the user's weight, body fat, goal, training history, and nutrition data accurately."

---

### Slide 5: Vector Search And RAG

Important bullet points:

1. Website/app content is chunked.
2. Chunks are embedded using Cohere multilingual embeddings.
3. FAISS stores vectors locally.
4. User query is embedded and searched.
5. Relevant chunks are inserted into the prompt.

Defense explanation:

"For general knowledge and app-page questions, the chatbot uses vector retrieval. This means it retrieves semantically similar content instead of relying only on exact keyword matching."

---

### Slide 6: Prompt And LLM

Important bullet points:

1. LLM provider: Cohere.
2. Default model: `command-a-03-2025`.
3. Framework: LangChain.
4. System prompt defines coach behavior and safety limits.
5. Context template includes retrieved context, routing metadata, and user question.

Defense explanation:

"The LLM does not answer blindly. It receives a prompt containing retrieved context and routing metadata, and the system prompt forces it to stay in the fitness domain, answer in the user's language, and avoid unsafe advice."

---

### Slide 7: Memory And Chat History

Important bullet points:

1. Conversations are saved in Supabase.
2. Messages are saved in Supabase.
3. There is in-memory fallback if Supabase is unavailable.
4. User fitness data acts as long-term personal context.
5. Current LLM prompt does not include previous chatbot messages.

Defense explanation:

"The system stores chat history for the user interface and future access. However, in the current implementation, previous chat messages are not yet injected into the LLM prompt. The personalization mainly comes from persistent fitness data in Supabase."

---

### Slide 8: Performance Optimization

Important bullet points:

1. User context cache.
2. Query response cache.
3. Embedding cache.
4. Vector search cache.
5. Optional Redis backend.
6. Streaming response for better UX.

Defense explanation:

"To reduce latency and API cost, repeated user context, embeddings, vector results, and full RAG responses are cached. Streaming also improves the perceived response time in the frontend."

---

### Slide 9: Safety And Limitations

Important bullet points:

1. Off-topic guard.
2. Fitness-focused system prompt.
3. Medical safety instruction.
4. No autonomous destructive tool execution.
5. Limitation: no previous chat history in LLM context.
6. Limitation: keyword router, not trained classifier.

Defense explanation:

"The system is intentionally controlled. It does not execute arbitrary tools. The main limitations are that the router is rule-based, and conversation memory is stored but not yet used as prompt context."

---

### Slide 10: Complete Query Flow

Important bullet points:

1. User asks a question.
2. React sends it to `/api/chat`.
3. `chat.py` validates and routes it.
4. `router.py` chooses retrieval mode.
5. `context_builder.py` and/or FAISS retrieves data.
6. `engine.py` builds prompt and calls Cohere.
7. Response is streamed and saved.

Defense explanation:

"This is the full lifecycle of one message. Every answer goes through validation, routing, retrieval, prompt assembly, generation, streaming, and persistence."

---

## 16. Possible Professor Questions And Strong Answers

### Q1. Is this chatbot a real AI agent?

Answer:

It is an assistant pipeline with agent-like behavior, but it is not a fully autonomous tool-calling agent. It uses a Query Router to choose between internal retrieval functions: Supabase, FAISS, hybrid retrieval, or off-topic handling. This design is more controlled and easier to evaluate for a graduation project.

---

### Q2. What is the main entry point for the chatbot?

Answer:

The backend entry point is `chatbot/main.py`, which creates the FastAPI app and mounts the routers. The main chat endpoint is `POST /api/chat` in `chatbot/chat.py`, specifically the `chat` function.

---

### Q3. How does the chatbot know whether to use personal data or general knowledge?

Answer:

The file `router.py` contains `route_query`. It checks the user message against Arabic and English signal lists. If the query is personal, it chooses `SUPABASE_ONLY`. If it is general knowledge, it chooses `VECTOR_ONLY`. If it requires both, it chooses `HYBRID`.

---

### Q4. What LLM model does the system use?

Answer:

The actual code uses Cohere through LangChain. In `engine.py`, the default model is `command-a-03-2025`, unless overridden by the `LLM_MODEL` environment variable.

---

### Q5. What embedding model is used?

Answer:

The embedding model is Cohere `embed-multilingual-v3.0` by default. It creates 1024-dimensional embeddings and supports Arabic and English, which is important for this project.

---

### Q6. What vector database is used?

Answer:

The system uses FAISS locally, specifically `faiss.IndexFlatIP`. The index is saved to `fitmentor.index`, and metadata is saved to `fitmentor.index.json`.

---

### Q7. How is RAG implemented?

Answer:

RAG is implemented in two parts. First, ingestion files convert website or SPA page content into chunks, embed them, and store them in FAISS. Second, at query time, `engine.py` embeds the user query, searches FAISS, and inserts retrieved chunks into the LLM prompt.

---

### Q8. How does personalization work?

Answer:

Personalization comes from Supabase. `context_builder.py` calls Supabase fetch functions, collects profile, InBody, meals, workouts, and plans, then formats them into structured context sections that are included in the LLM prompt.

---

### Q9. Does the chatbot remember previous messages?

Answer:

It stores conversations and messages in Supabase, and it displays them in the frontend. However, in the current implementation, previous chatbot messages are not inserted into the LLM prompt. So the long-term personalization comes from user fitness data, not from conversational memory.

---

### Q10. What happens if Supabase is unavailable?

Answer:

For chat history, `chat.py` falls back to in-memory dictionaries. For user context, if Supabase returns no data and the frontend sends `user_profile`, the system can build a fallback profile context. For vector knowledge, FAISS can still answer general questions if the vector store is available.

---

### Q11. What happens if the vector store is empty?

Answer:

In `engine.py`, vector retrieval only runs if `self.vector_store.size > 0`. If the vector store is empty, the system continues with available context. For `SUPABASE_ONLY`, it can still answer from user data.

---

### Q12. Why did you use Hybrid RAG instead of sending everything to the LLM?

Answer:

Hybrid RAG reduces hallucination and improves relevance. Supabase provides accurate structured user data, while FAISS provides semantic knowledge retrieval. The LLM then generates an answer grounded in these sources instead of relying only on its pretrained memory.

---

### Q13. How do you handle Arabic?

Answer:

The router includes Arabic signal phrases, the frontend supports Arabic prompts, the system prompt tells the model to answer in the same language as the user, and the embedding model is multilingual.

---

### Q14. How is the prompt protected from unsafe output?

Answer:

The system prompt tells the model to stay within fitness and nutrition, avoid dangerous practices, and not replace medical advice. The router also rejects off-topic questions before they reach retrieval and generation.

---

### Q15. Is the router machine-learning based?

Answer:

No. It is rule-based keyword routing. This is simpler, transparent, and easier to debug. A future improvement would be replacing it or supporting it with a trained intent classifier.

---

### Q16. What are the main limitations?

Answer:

1. Previous chatbot messages are stored but not used in the LLM context.
2. The router is rule-based.
3. Some documentation files mention older architecture details.
4. `page_documentation.py` and `inbody_handler.py` exist but are not connected to the main chat route in the inspected code.
5. The LLM does not call external tools dynamically.

---

### Q17. How would you improve it next?

Answer:

1. Add conversation memory injection into the prompt.
2. Add summarization for long chat history.
3. Add reranking for retrieved FAISS documents.
4. Add evaluator tests for answer quality.
5. Add structured tool calling for safe actions, such as creating a workout plan or logging a meal.
6. Replace keyword routing with a classifier or LLM-based router.

---

### Q18. How do you know which sources were used?

Answer:

The API response includes `sources`, `routing_mode`, `structured_context_used`, and `vector_docs_used`. These fields come from `RAGResult` in `engine.py` and are returned by `ChatResponse` in `chat.py`.

---

### Q19. What is the difference between `/api/chat` and `/api/recommendation`?

Answer:

`/api/chat` receives arbitrary user questions and routes them dynamically. `/api/recommendation` uses predefined recommendation prompts and always forces `HYBRID` mode because recommendations should combine personal data and general knowledge.

---

### Q20. What is the difference between chatbot and model2?

Answer:

The chatbot is the conversational RAG assistant. `model2_router.py` is a separate workout generation API that uses the local `model2` FitMentor generator to create exercise plans. The chatbot engine does not currently call `model2_router.py` as a tool.

---

## 17. Best Short Defense Summary

"My chatbot is implemented as a controlled Hybrid RAG pipeline. The frontend sends the user question to FastAPI. The backend router decides whether the question needs personal Supabase data, vector knowledge from FAISS, both, or an off-topic response. The context builder formats real user data such as profile, InBody, workouts, and meals. The vector store retrieves relevant app or fitness knowledge using Cohere multilingual embeddings and FAISS. Then LangChain sends the assembled prompt to Cohere `command-a-03-2025`, and the answer is streamed back to the React interface and saved in Supabase."
