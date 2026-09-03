"""
FitMentor Chatbot — Professional PPTX Presentation Generator (CLEANED)
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Colors ─────────────────────────────────────────────────────────────────────
BG = RGBColor(0x1A, 0x1A, 0x2E)
CARD = RGBColor(0x22, 0x22, 0x3A)
BLUE = RGBColor(0x66, 0x7E, 0xEA)
PURPLE = RGBColor(0x76, 0x4B, 0xA2)
WHITE = RGBColor(0xF0, 0xF0, 0xF0)
LIGHT = RGBColor(0xB0, 0xB0, 0xC0)
MUTED = RGBColor(0x70, 0x70, 0x80)
GREEN = RGBColor(0x3B, 0xCA, 0x7E)
PINK = RGBColor(0xEA, 0x66, 0x7E)
YELLOW = RGBColor(0xFF, 0xC1, 0x07)

prs = Presentation()
W = Inches(13.333)
H = Inches(7.5)

def bg(slide, c=BG):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = c

def rect(slide, c, l, t, w, h):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = c
    s.line.fill.background()
    return s

def bar(slide, l=0, t=0, w=None, h=Inches(0.06)):
    if w is None: w = W
    rect(slide, BLUE, l, t, w, h)

def txt(slide, l, t, w, h, text, sz=18, b=False, c=WHITE, a=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(sz)
    p.font.bold = b
    p.font.color.rgb = c
    p.font.name = 'Calibri'
    p.alignment = a
    return box

def card(slide, l, t, w, h, icon, title, desc, bc=BLUE):
    rc = rect(slide, CARD, l, t, w, h)
    rc.line.color.rgb = bc; rc.line.width = Pt(1)
    txt(slide, l+Inches(0.2), t+Inches(0.12), Inches(0.4), Inches(0.4), icon, 22, c=WHITE)
    txt(slide, l+Inches(0.6), t+Inches(0.12), w-Inches(0.8), Inches(0.35), title, 14, True, WHITE)
    txt(slide, l+Inches(0.2), t+Inches(0.5), w-Inches(0.4), h-Inches(0.65), desc, 11, c=LIGHT)

def slide_title(slide, title, sub=""):
    bar(slide)
    txt(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.6), title, 36, True, WHITE)
    if sub:
        txt(slide, Inches(0.5), Inches(0.8), Inches(12), Inches(0.3), sub, 15, c=LIGHT)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1: TITLE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl); bar(sl); bar(sl, t=Inches(7.44))
txt(sl, Inches(1), Inches(2.2), Inches(11), Inches(0.4), "v4.0.0  |  Hybrid RAG", 14, True, BLUE, PP_ALIGN.CENTER)
    txt(sl, Inches(1), Inches(2.7), Inches(11), Inches(1), "🤖  FitMentor AI Chatbot", 50, True, WHITE, PP_ALIGN.CENTER)
    txt(sl, Inches(1.5), Inches(3.8), Inches(10), Inches(0.7), "Intelligent Fitness & Nutrition Assistant", 22, c=LIGHT, a=PP_ALIGN.CENTER)
    txt(sl, Inches(1.5), Inches(4.6), Inches(10), Inches(0.4), "Hybrid RAG  •  Arabic / English  •  Streaming  •  Personalized", 15, c=MUTED, a=PP_ALIGN.CENTER)
for i, t in enumerate(["FastAPI", "LangChain", "Cohere", "FAISS", "Supabase", "Redis"]):
    txt(sl, Inches(2.5+i*1.5), Inches(5.4), Inches(1.3), Inches(0.35), f"  {t}", 13, c=BLUE, a=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2: COMPONENTS
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "System Components", "8 core modules powering the chatbot")
comps = [
    ("🔀", "Query Router", "Classifies each query into 4 modes: Supabase Only (personal data), Vector Only (knowledge), Hybrid (both), or Off-Topic"),
    ("🧠", "RAG Engine", "LangChain pipeline: routes → retrieves → assembles context → generates response via Cohere LLM"),
    ("📦", "Context Builder", "Fetches & caches user data from all 23 Supabase tables (profile, InBody, workouts, meals, social)"),
    ("🔍", "Vector Store", "FAISS index + Cohere multilingual embeddings for semantic search across fitness knowledge base"),
    ("⚡", "Cache Layer", "4-level caching (context, embeddings, search, responses) with In-Memory + optional Redis"),
    ("🌐", "Ingestion Engine", "Auto-imports static sites & SPA content via Playwright into the vector knowledge base"),
    ("🗄️", "Supabase Services", "7 specialized modules: Users, Workouts, Meals, Coaches, Social, Library, Context"),
    ("💬", "Chat API", "REST endpoints with SSE streaming, conversation history, and message management"),
]
for i, (ic, ti, de) in enumerate(comps):
    col, row = i%4, i//4
    card(sl, Inches(0.4+col*3.15), Inches(1.4+row*2.85), Inches(2.95), Inches(2.55), ic, ti, de)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3: ARCHITECTURE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "System Architecture", "End-to-end flow: User ➔ AI Response")
box = rect(sl, RGBColor(0x25,0x25,0x45), Inches(4.5), Inches(1.4), Inches(4.3), Inches(0.7)); box.line.color.rgb = BLUE
txt(sl, Inches(4.7), Inches(1.45), Inches(4), Inches(0.35), "🌐  Frontend (React / Mobile)", 17, True, WHITE, PP_ALIGN.CENTER)
txt(sl, Inches(5.5), Inches(2.15), Inches(2), Inches(0.3), "⬇", 22, c=BLUE, a=PP_ALIGN.CENTER)

box = rect(sl, RGBColor(0x28,0x28,0x48), Inches(0.5), Inches(2.5), Inches(12.3), Inches(0.6)); box.line.color.rgb = PURPLE
txt(sl, Inches(1), Inches(2.55), Inches(12), Inches(0.3), "⚡  FastAPI Backend  →  🔀  Query Router  (classifies query → decides retrieval mode)", 14, True, WHITE, PP_ALIGN.CENTER)
txt(sl, Inches(5.5), Inches(3.15), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, a=PP_ALIGN.CENTER)

routes = [("🗄️  Supabase Only", "Personal data from 23 tables", GREEN), ("🔎  Vector Only", "FAISS knowledge base", BLUE), ("🔄  Hybrid", "Supabase + FAISS combined", PINK)]
for i, (t, d, c) in enumerate(routes):
    x = Inches(0.8+i*4.1)
    bx = rect(sl, CARD, x, Inches(3.5), Inches(3.6), Inches(1.1)); bx.line.color.rgb = c
    txt(sl, x+Inches(0.1), Inches(3.55), Inches(3.4), Inches(0.3), t, 14, True, c)
    txt(sl, x+Inches(0.1), Inches(3.85), Inches(3.4), Inches(0.3), f"  {d}", 11, c=LIGHT)

txt(sl, Inches(5.5), Inches(4.65), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, a=PP_ALIGN.CENTER)

bx = rect(sl, RGBColor(0x28,0x28,0x48), Inches(1), Inches(5.0), Inches(11.3), Inches(0.7)); bx.line.color.rgb = PURPLE
txt(sl, Inches(1.2), Inches(5.05), Inches(10.8), Inches(0.3), "🧠  Hybrid RAG Engine (LangChain)  —  Context Assembly  ➔  Prompt  ➔  Cohere LLM  ➔  Clean Response", 15, True, WHITE, PP_ALIGN.CENTER)
txt(sl, Inches(1.2), Inches(5.35), Inches(10.8), Inches(0.3), "📦 Context Builder  |  🎯 Prompt Formatting  |  🤖 Cohere command-a  |  🧹 Markdown Removal", 11, c=LIGHT, a=PP_ALIGN.CENTER)

txt(sl, Inches(5.5), Inches(5.75), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, a=PP_ALIGN.CENTER)

bx = rect(sl, CARD, Inches(0.5), Inches(6.1), Inches(5.5), Inches(0.6)); bx.line.color.rgb = YELLOW
txt(sl, Inches(0.7), Inches(6.15), Inches(5), Inches(0.3), "⚡  Cache Layer (2-min TTL)", 14, c=YELLOW, a=PP_ALIGN.CENTER)
bx = rect(sl, CARD, Inches(7.3), Inches(6.1), Inches(5.5), Inches(0.6)); bx.line.color.rgb = GREEN
txt(sl, Inches(7.5), Inches(6.15), Inches(5), Inches(0.3), "💬  Response (JSON / SSE Stream)", 14, c=GREEN, a=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4: QUERY ROUTER
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Intelligent Query Router", "Keyword-scoring decides retrieval strategy per query")
modes = [
    ("Supabase Only", GREEN, 'Arabic: "وزني", "هدفي", "إنبودي"\nEnglish: "my weight", "my goal", "my data"\n→ Reads profile, InBody, workouts from DB'),
    ("Vector Only", BLUE, 'Arabic: "ما هو", "كيف", "الفرق بين"\nEnglish: "what is", "explain", "benefits of"\n→ Searches FAISS fitness knowledge base'),
    ("Hybrid", PINK, 'Arabic: "خطة لي", "ماذا آكل", "كم بروتين"\nEnglish: "plan for me", "should I do"\n→ Merges personal data + knowledge'),
    ("Off-Topic", YELLOW, 'Sports news, politics, weather, movies\n→ Polite redirect to fitness domain'),
]
for i, (t, c, d) in enumerate(modes):
    x = Inches(0.4+(i%2)*6.3); y = Inches(1.4+(i//2)*2.9)
    bx = rect(sl, CARD, x, y, Inches(6.0), Inches(2.5)); bx.line.color.rgb = c; bx.line.width = Pt(1.5)
    rect(sl, c, x+Inches(0.15), y+Inches(0.2), Inches(0.1), Inches(0.1))
    txt(sl, x+Inches(0.4), y+Inches(0.12), Inches(5.3), Inches(0.35), t, 18, True, WHITE)
    txt(sl, x+Inches(0.4), y+Inches(0.55), Inches(5.3), Inches(1.7), d, 13, c=LIGHT)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5: RAG PIPELINE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "RAG Engine Pipeline", "6-stage processing with timing targets")
stages = [
    ("1", "Route", "Keyword scoring → choose mode", "~5ms"),
    ("2", "Build Context", "Fetch 23 Supabase tables (cached 5min)", "~200ms"),
    ("3", "Vector Search", "Cohere embed → FAISS search → rank", "~150ms"),
    ("4", "Assemble", "Merge Supabase + vectors into prompt", "~5ms"),
    ("5", "Generate", "Cohere LLM (temp=0.35, 600 tokens)", "~500-1000ms"),
    ("6", "Cache & Deliver", "Cache response → stream via SSE", "~5ms"),
]
for i, (num, ti, de, du) in enumerate(stages):
    col, row = i%3, i//3
    x, y = Inches(0.4+col*4.2), Inches(1.4+row*2.7)
    c = sl.shapes.add_shape(MSO_SHAPE.OVAL, x+Inches(0.15), y+Inches(0.15), Inches(0.45), Inches(0.45))
    c.fill.solid(); c.fill.fore_color.rgb = BLUE; c.line.fill.background()
    tf = c.text_frame; tf.paragraphs[0].text = num; tf.paragraphs[0].font.size = Pt(18)
    tf.paragraphs[0].font.bold = True; tf.paragraphs[0].font.color.rgb = WHITE
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    txt(sl, x+Inches(0.7), y+Inches(0.15), Inches(3.2), Inches(0.35), ti, 17, True, WHITE)
    txt(sl, x+Inches(0.15), y+Inches(0.6), Inches(3.8), Inches(0.8), de, 12, c=LIGHT)
    txt(sl, x+Inches(0.15), y+Inches(1.5), Inches(3.8), Inches(0.3), f"⏱  {du}", 11, True, BLUE)

metrics = [("< 100ms", "Cached"), ("< 1.5s", "First hit"), ("90%", "API saved"), ("600", "Token cap")]
for i, (v, l) in enumerate(metrics):
    x = Inches(0.5+i*3.15)
    rect(sl, CARD, x, Inches(6.2), Inches(2.8), Inches(0.8))
    txt(sl, x+Inches(0.1), Inches(6.25), Inches(2.6), Inches(0.35), v, 22, True, BLUE, PP_ALIGN.CENTER)
    txt(sl, x+Inches(0.1), Inches(6.55), Inches(2.6), Inches(0.25), l, 12, c=LIGHT, a=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6: SCENARIOS
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Example Scenarios", "Real interactions showing each routing mode")
scenarios = [
    ("Supabase", GREEN,
     '👤 User: كم وزني الحالي؟ وهل تغيرت نسبة الدهون من آخر فحص؟\n\n🤖 Bot: Weight: 85 kg (recorded Jun 15). Body fat: 22% (down 1.5% 👍).\nMuscle mass: 40 kg (stable). Keep training!',
     "Sources: profiles, body_measurements, inbody_results"),
    ("Vector", BLUE,
     "👤 User: What's the difference between Squat and Lunges?\n\n🤖 Bot: Squat: compound, targets quads/glutes, more calories.\nLunges: unilateral, improves balance.\n→ Use both for best results.",
     "Sources: exercise_library, vector knowledge base"),
    ("Hybrid", PINK,
     "👤 User: اعمل لي خطة تمارين أسبوعية حسب وزني وهدفي\n\n🤖 Bot: Weight 85kg, goal: fat loss.\nMon: Cardio 30min  |  Tue: Strength (Squat, Bench, Rows)\nWed: Walk 45min  |  Thu: HIIT Tabata 20min\nFri: Strength (Deadlift, Pull-ups)  |  Sat: Swim 40min",
     "Sources: Supabase profile + FAISS exercise DB"),
    ("Off-Topic", YELLOW,
     '👤 User: أخبرني عن آخر أخبار كرة القدم\n\n🤖 Bot: I\'m specialized in fitness & nutrition only.\nI can help with workouts, diet plans, InBody analysis.\nWhat\'s your fitness goal today?',
     "Polite redirect to fitness domain"),
]
for i, (t, c, chat, src) in enumerate(scenarios):
    x = Inches(0.4+(i%2)*6.4); y = Inches(1.3+(i//2)*2.9)
    bx = rect(sl, CARD, x, y, Inches(6.1), Inches(2.7)); bx.line.color.rgb = c
    txt(sl, x+Inches(0.15), y+Inches(0.08), Inches(5.7), Inches(0.3), f"🔀  {t}", 14, True, c)
    txt(sl, x+Inches(0.15), y+Inches(0.4), Inches(5.7), Inches(1.7), chat, 11, c=LIGHT)
    txt(sl, x+Inches(0.15), y+Inches(2.2), Inches(5.7), Inches(0.35), src, 10, c=MUTED)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 7: DATA MODEL
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Supabase Data Model", "23 tables across 4 domains")
domains = [
    ("👤  Profile & Body", GREEN, ["profiles — Name, age, goal, TDEE, BMR", "body_measurements — InBody scans", "inbody_results — Scan history", "weight_logs — Weight tracking"]),
    ("🏋️  Workouts", BLUE, ["workout_plans — Training templates", "workouts — Completed sessions", "exercise_library — Exercise DB", "user_exercise_sets — Reps/sets"]),
    ("🍽️  Nutrition", PINK, ["user_meal_plans — Meal schedules", "meals — Logged meals with macros", "food_items — Food nutrition DB", "user_meal_checkins — Compliance"]),
    ("👥  Social & Coach", PURPLE, ["posts / comments / likes — Social", "direct_messages — Messaging", "coach_plans / plan_muscles", "selected_coach_plan"]),
]
for i, (t, c, items) in enumerate(domains):
    x = Inches(0.3+i*3.25)
    bx = rect(sl, CARD, x, Inches(1.3), Inches(3.0), Inches(5.6)); bx.line.color.rgb = c; bx.line.width = Pt(1.5)
    txt(sl, x+Inches(0.15), Inches(1.4), Inches(2.7), Inches(0.35), t, 15, True, c)
    for j, item in enumerate(items):
        txt(sl, x+Inches(0.15), Inches(1.85+j*0.5), Inches(2.7), Inches(0.4), f"• {item}", 10, c=LIGHT)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 8: CACHE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Multi-Tier Caching", "In-Memory + optional Redis with auto-fallback")
types_ = [
    ("🏠  In-Memory Cache", BLUE, "• Thread-safe asyncio.Lock storage\n• Entry-level TTL expiration\n• Zero network latency\n• Best for single-instance", "Local  |  No Network"),
    ("🔴  Redis (Optional)", PINK, "• Distributed across instances\n• Auto-fallback to memory if down\n• Pattern-based key invalidation\n• Production-ready scaling", "Distributed  |  Auto-Fallback"),
]
for i, (t, c, d, p) in enumerate(types_):
    x = Inches(0.5+i*6.3)
    bx = rect(sl, CARD, x, Inches(1.4), Inches(5.8), Inches(2.2)); bx.line.color.rgb = c; bx.line.width = Pt(1.5)
    txt(sl, x+Inches(0.3), Inches(1.5), Inches(5.2), Inches(0.35), t, 19, True, WHITE)
    txt(sl, x+Inches(0.3), Inches(1.9), Inches(5.2), Inches(0.9), d, 12, c=LIGHT)
    txt(sl, x+Inches(0.3), Inches(2.8), Inches(5.2), Inches(0.3), p, 11, True, BLUE)

txt(sl, Inches(0.5), Inches(3.9), Inches(12), Inches(0.35), "Cache TTL Configuration", 17, True, WHITE)
headers = ["Cache Type", "Key Pattern", "TTL", "Impact"]
rows = [
    ["📦 User Context", "ctx:user:{id}", "5 min", "-95% Supabase queries"],
    ["🧠 Embeddings", "emb:{hash}", "1 hour", "-90% Cohere API calls"],
    ["🔎 Vector Search", "vec:search:{hash}", "2 min", "Instant repeat queries"],
    ["💬 RAG Response", "rag:response:{hash}", "2 min", "<100ms repeat responses"],
]
yt = Inches(4.35)
cw = [Inches(2.2), Inches(4.0), Inches(2.5), Inches(4.0)]
for j, h in enumerate(headers):
    x = Inches(0.5)+sum(cw[k] for k in range(j))
    rect(sl, RGBColor(0x2A,0x2A,0x4A), x, yt, cw[j], Inches(0.35))
    txt(sl, x+Inches(0.05), yt+Inches(0.02), cw[j]-Inches(0.1), Inches(0.3), h, 12, True, WHITE, PP_ALIGN.CENTER)
for i, row in enumerate(rows):
    ry = yt+Inches(0.38+i*0.32)
    bgc = RGBColor(0x1E,0x1E,0x38) if i%2==0 else RGBColor(0x22,0x22,0x3E)
    for j, cell in enumerate(row):
        x = Inches(0.5)+sum(cw[k] for k in range(j))
        rect(sl, bgc, x, ry, cw[j], Inches(0.32))
        txt(sl, x+Inches(0.05), ry+Inches(0.02), cw[j]-Inches(0.1), Inches(0.28), cell, 11, c=LIGHT, a=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 9: TECHNOLOGY
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Technology Stack", "Languages, frameworks, and tools used")
techs = [
    ("🐍", "Python 3.11+", "Async runtime with asyncio & httpx", "asyncio · pydantic · httpx"),
    ("⚡", "FastAPI", "REST framework with OpenAPI & SSE", "REST · SSE · CORS"),
    ("🧩", "LangChain", "RAG pipeline with composable chains", "LCEL · Prompts · Runnables"),
    ("🤖", "Cohere", "Multilingual LLM + embeddings 3.0", "command-a · embed-v3.0"),
    ("🗄️", "Supabase", "PostgreSQL + REST + RLS policies", "23 tables · Row Level Security"),
    ("🔎", "FAISS (Meta)", "Vector search via Inner Product", "IndexFlatIP · 1024 dim"),
    ("⚡", "Redis (Opt.)", "Distributed cache with auto-fallback", "Key expiry · Pattern invalidation"),
    ("📥", "Playwright", "Headless browser for SPA ingestion", "Headless · Route extraction"),
    ("🌐", "Uvicorn", "High-performance ASGI server", "ASGI · HTTP/2 · Hot reload"),
]
for i, (ic, nm, desc, tags) in enumerate(techs):
    col, row = i%3, i//3
    x, y = Inches(0.4+col*4.2), Inches(1.3+row*1.95)
    bx = rect(sl, CARD, x, y, Inches(3.9), Inches(1.7)); bx.line.color.rgb = RGBColor(0x33,0x33,0x50)
    txt(sl, x+Inches(0.15), y+Inches(0.1), Inches(0.4), Inches(0.4), ic, 22, c=WHITE)
    txt(sl, x+Inches(0.65), y+Inches(0.1), Inches(3.0), Inches(0.35), nm, 16, True, WHITE)
    txt(sl, x+Inches(0.15), y+Inches(0.5), Inches(3.5), Inches(0.45), desc, 11, c=LIGHT)
    txt(sl, x+Inches(0.15), y+Inches(1.1), Inches(3.5), Inches(0.35), f"  {tags}", 10, c=BLUE)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 10: DATA FLOW
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Data Flow", "Request lifecycle from user to AI response")

box = rect(sl, RGBColor(0x28,0x28,0x48), Inches(4.5), Inches(1.3), Inches(4.3), Inches(0.7)); box.line.color.rgb = BLUE
txt(sl, Inches(4.7), Inches(1.35), Inches(4), Inches(0.35), "👤  User", 18, True, WHITE, PP_ALIGN.CENTER)
txt(sl, Inches(4.7), Inches(1.7), Inches(4), Inches(0.25), "Asks (Arabic / English)", 11, c=MUTED, a=PP_ALIGN.CENTER)
txt(sl, Inches(5.5), Inches(2.05), Inches(2), Inches(0.3), "⬇", 20, c=BLUE, a=PP_ALIGN.CENTER)

box = rect(sl, RGBColor(0x28,0x28,0x48), Inches(3.5), Inches(2.4), Inches(6.3), Inches(0.5)); box.line.color.rgb = PURPLE
txt(sl, Inches(3.7), Inches(2.45), Inches(6), Inches(0.3), "⚡  FastAPI  →  🔀  Router  →  decide mode", 14, True, WHITE, PP_ALIGN.CENTER)
txt(sl, Inches(5.5), Inches(2.95), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, a=PP_ALIGN.CENTER)

routes = [("🗄️  Supabase Only", "23 tables", GREEN), ("🔎  Vector Only", "FAISS DB", BLUE), ("🔄  Hybrid", "Both", PINK)]
for i, (t, d, c) in enumerate(routes):
    x = Inches(1+i*4.1)
    bx = rect(sl, CARD, x, Inches(3.3), Inches(3.6), Inches(0.9)); bx.line.color.rgb = c
    txt(sl, x+Inches(0.1), Inches(3.35), Inches(3.4), Inches(0.3), t, 14, True, c)
    txt(sl, x+Inches(0.1), Inches(3.65), Inches(3.4), Inches(0.3), f"  {d}", 11, c=LIGHT)

txt(sl, Inches(5.5), Inches(4.25), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, a=PP_ALIGN.CENTER)

bx = rect(sl, RGBColor(0x28,0x28,0x48), Inches(1.5), Inches(4.6), Inches(10.3), Inches(0.6)); bx.line.color.rgb = PURPLE
txt(sl, Inches(1.7), Inches(4.65), Inches(10), Inches(0.3), "🧠  RAG Engine  —  Assemble Context  ➔  Cohere LLM  ➔  Clean", 15, True, WHITE, PP_ALIGN.CENTER)
txt(sl, Inches(5.5), Inches(5.25), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, a=PP_ALIGN.CENTER)

bx = rect(sl, CARD, Inches(0.5), Inches(5.6), Inches(5.5), Inches(0.5)); bx.line.color.rgb = YELLOW
txt(sl, Inches(0.7), Inches(5.65), Inches(5), Inches(0.3), "⚡  Cache (2-min TTL)", 14, c=YELLOW, a=PP_ALIGN.CENTER)
bx = rect(sl, CARD, Inches(7.3), Inches(5.6), Inches(5.5), Inches(0.5)); bx.line.color.rgb = GREEN
txt(sl, Inches(7.5), Inches(5.65), Inches(5), Inches(0.3), "💬  Response (JSON / SSE)", 14, c=GREEN, a=PP_ALIGN.CENTER)

# Bottom edge
txt(sl, Inches(1), Inches(6.3), Inches(5), Inches(0.3), "📥  Ingestion Engine (SPA / Static Sites)", 11, c=MUTED, a=PP_ALIGN.CENTER)
txt(sl, Inches(7), Inches(6.3), Inches(5), Inches(0.3), "🧮  Model2 Router (ML Predictions)", 11, c=MUTED, a=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 11: PERFORMANCE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Performance & Optimization", "Key metrics and how we achieve them")
metrics = [("< 1.5s", "Avg response"), ("< 100ms", "Cached response"), ("95%", "Supabase saved"), ("90%", "Cohere calls saved")]
for i, (v, l) in enumerate(metrics):
    x = Inches(0.5+i*3.15)
    bx = rect(sl, CARD, x, Inches(1.4), Inches(2.8), Inches(1.1)); bx.line.color.rgb = BLUE
    txt(sl, x+Inches(0.1), Inches(1.5), Inches(2.6), Inches(0.5), v, 34, True, BLUE, PP_ALIGN.CENTER)
    txt(sl, x+Inches(0.1), Inches(2.0), Inches(2.6), Inches(0.3), l, 13, c=LIGHT, a=PP_ALIGN.CENTER)

opts = [
    ("⚡  Caching", GREEN, ["User context (5-min TTL)", "Embeddings (1-hour TTL)", "Search results (2-min TTL)", "Full response (2-min TTL)"]),
    ("🔧  Architecture", BLUE, ["Embedding batching (size: 96)", "Exponential backoff on rate limits", "Vector store pre-loaded on startup", "Route-prioritized document retrieval"]),
]
for i, (t, c, items) in enumerate(opts):
    x = Inches(0.5+i*6.3)
    bx = rect(sl, CARD, x, Inches(2.8), Inches(5.8), Inches(2.0)); bx.line.color.rgb = c
    txt(sl, x+Inches(0.3), Inches(2.9), Inches(5.2), Inches(0.35), t, 18, True, WHITE)
    for j, item in enumerate(items):
        txt(sl, x+Inches(0.3), Inches(3.3+j*0.35), Inches(5.2), Inches(0.3), f"• {item}", 12, c=LIGHT)

bx = rect(sl, RGBColor(0x1E,0x1E,0x3A), Inches(0.5), Inches(5.2), Inches(12.3), Inches(1.0)); bx.line.color.rgb = BLUE
txt(sl, Inches(0.8), Inches(5.3), Inches(11.5), Inches(0.8),
    "🎯  Goal: Fast response < 1.5s with high accuracy in Arabic & English,\n"
    "delivering personalized answers from real user data + fitness knowledge.",
    14, c=LIGHT, a=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 12: KEY FEATURES
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Key Features", "What makes FitMentor unique")
features = [
    ("🌐", "Bilingual", "Automatic Arabic/English detection & response in same language"),
    ("🔒", "RLS Security", "Row Level Security via Supabase protecting all user data"),
    ("🎯", "Personalized", "Tailored using real InBody, profile, workouts & meal history"),
    ("📡", "Live Streaming", "SSE character-by-character streaming for smooth UX"),
    ("📥", "Auto Ingestion", "Imports website & SPA content into knowledge base automatically"),
    ("🔄", "Chat History", "Full conversation management with Supabase + memory fallback"),
    ("📊", "ML Powered", "Connected to Model2 for predictions & advanced analytics"),
    ("🧹", "Clean Output", "Auto-removes markdown for readable plain-text responses"),
]
for i, (ic, ti, de) in enumerate(features):
    col, row = i%4, i//4
    card(sl, Inches(0.4+col*3.15), Inches(1.4+row*2.7), Inches(2.95), Inches(2.4), ic, ti, de)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 13: ROADMAP
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl)
slide_title(sl, "Roadmap", "Completed & upcoming milestones")

bx = rect(sl, CARD, Inches(0.5), Inches(1.4), Inches(5.8), Inches(4.0)); bx.line.color.rgb = GREEN; bx.line.width = Pt(1.5)
txt(sl, Inches(0.8), Inches(1.5), Inches(5.2), Inches(0.35), "✅  Completed", 21, True, GREEN)
for j, item in enumerate(["Hybrid RAG (Supabase + FAISS)", "Multi-tier caching (RAM + Redis)", "Arabic + English support", "SPA content ingestion", "SSE live streaming", "InBody scan integration", "Personalized recommendations", "Conversation history"]):
    txt(sl, Inches(0.8), Inches(1.95+j*0.38), Inches(5.2), Inches(0.35), f"✅  {item}", 12, c=LIGHT)

bx = rect(sl, CARD, Inches(7), Inches(1.4), Inches(5.8), Inches(4.0)); bx.line.color.rgb = YELLOW; bx.line.width = Pt(1.5)
txt(sl, Inches(7.3), Inches(1.5), Inches(5.2), Inches(0.35), "🔄  In Development", 21, True, YELLOW)
for j, item in enumerate(["Image/video in responses", "Long-term memory", "Multi-modal RAG", "Sentiment analysis", "Voice recommendations", "Apple Health / Google Fit", "Analytics dashboard", "Coach-specific AI tools"]):
    txt(sl, Inches(7.3), Inches(1.95+j*0.38), Inches(5.2), Inches(0.35), f"🔄  {item}", 12, c=LIGHT)

bx = rect(sl, RGBColor(0x1E,0x1E,0x3A), Inches(0.5), Inches(5.7), Inches(12.3), Inches(1.0)); bx.line.color.rgb = BLUE
txt(sl, Inches(0.8), Inches(5.8), Inches(11.5), Inches(0.8),
    "🎯  Vision: A continuously learning coach that deeply understands each user\nand adapts to their physiological & psychological changes over time.",
    14, c=LIGHT, a=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 14: THANK YOU
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl); bar(sl); bar(sl, t=Inches(7.44))
txt(sl, Inches(1), Inches(2.2), Inches(11), Inches(1.2), "🤖", 72, c=WHITE, a=PP_ALIGN.CENTER)
txt(sl, Inches(1), Inches(3.2), Inches(11), Inches(0.7), "Thank You", 48, True, WHITE, PP_ALIGN.CENTER)
    txt(sl, Inches(1.5), Inches(3.9), Inches(10), Inches(0.5), "Questions & Discussion", 26, c=LIGHT, a=PP_ALIGN.CENTER)
txt(sl, Inches(1.5), Inches(4.5), Inches(10), Inches(0.7), "FitMentor AI Chatbot  v4.0.0  •  Hybrid RAG System\nFastAPI  ·  LangChain  ·  Cohere  ·  FAISS  ·  Supabase", 18, c=MUTED, a=PP_ALIGN.CENTER)
bx = rect(sl, RGBColor(0x2A,0x2A,0x50), Inches(4.5), Inches(5.6), Inches(4.3), Inches(0.6)); bx.line.color.rgb = BLUE
txt(sl, Inches(4.5), Inches(5.65), Inches(4.3), Inches(0.4), "🚀  Ready for Production", 19, True, BLUE, PP_ALIGN.CENTER)

# ── Save ───────────────────────────────────────────────────────────────────────
out = "FitMentor_Chatbot_Presentation.pptx"
prs.save(out)
print(f"✅ Saved: {out}  ({len(prs.slides)} slides)")