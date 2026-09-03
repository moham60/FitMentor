"""
شرح فكرة الشات بوت في 3 شرائح مع رسومات توضيحية — عربي
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Colors
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

def txt(slide, l, t, w, h, text, sz=18, b=False, c=WHITE, a=PP_ALIGN.RIGHT):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(sz)
    p.font.bold = b
    p.font.color.rgb = c
    p.font.name = 'Arial'
    p.alignment = a
    return box

def card(slide, l, t, w, h, icon, title, desc, bc=BLUE):
    rc = rect(slide, CARD, l, t, w, h)
    rc.line.color.rgb = bc; rc.line.width = Pt(2)
    txt(slide, l+Inches(0.2), t+Inches(0.15), Inches(0.5), Inches(0.4), icon, 22, c=WHITE)
    txt(slide, l+Inches(0.7), t+Inches(0.15), w-Inches(0.9), Inches(0.4), title, 16, True, WHITE, PP_ALIGN.RIGHT)
    txt(slide, l+Inches(0.2), t+Inches(0.6), w-Inches(0.4), h-Inches(0.75), desc, 12, c=LIGHT, a=PP_ALIGN.RIGHT)

def slide_title(slide, title, sub=""):
    bar(slide)
    txt(slide, Inches(0.5), Inches(0.3), Inches(12), Inches(0.6), title, 36, True, WHITE, PP_ALIGN.RIGHT)
    if sub:
        txt(slide, Inches(0.5), Inches(0.85), Inches(12), Inches(0.3), sub, 15, c=LIGHT, a=PP_ALIGN.RIGHT)

def bar(slide, l=0, t=0, w=None, h=Inches(0.08)):
    if w is None: w = W
    rect(slide, BLUE, l, t, w, h)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1: المشكلة والحل
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl); bar(sl); bar(sl, t=Inches(7.42))
slide_title(sl, "لماذا Hybrid RAG؟", "المشكلة التي حللها المشروع")
txt(sl, Inches(0.5), Inches(1), Inches(12), Inches(0.4), "الشات بوت العادي يعاني من مشكلتين:", 20, True, YELLOW, PP_ALIGN.RIGHT)

# Left: Problem 1
bx = rect(sl, RGBColor(0x2A,0x1A,0x1A), Inches(0.5), Inches(1.5), Inches(5.8), Inches(2.2)); bx.line.color.rgb = PINK
txt(sl, Inches(0.7), Inches(1.55), Inches(5.4), Inches(0.4), "❌ إذا اعتمد على بياناتك الشخصية فقط", 16, True, PINK, PP_ALIGN.RIGHT)
txt(sl, Inches(0.7), Inches(2.0), Inches(5.4), Inches(1.5),
    "• معرفته محدودة بما حدث لك سابقاً\n"
    "• لا يعرف معلومات عامة عن الرياضة\n"
    "• عندما تسأل «ماذا آكل؟» يرد بناءً على وجباتك السابقة فقط\n"
    "• لا يستطيع شرح الفرق بين تمارين لم تفعلها من قبل",
    12, c=LIGHT, a=PP_ALIGN.RIGHT)

# Right: Problem 2
bx = rect(sl, RGBColor(0x1A,0x1A,0x2A), Inches(6.8), Inches(1.5), Inches(5.8), Inches(2.2)); bx.line.color.rgb = YELLOW
txt(sl, Inches(7.0), Inches(1.55), Inches(5.4), Inches(0.4), "❌ إذا اعتمد على المعرفة العامة فقط", 16, True, YELLOW, PP_ALIGN.RIGHT)
txt(sl, Inches(7.0), Inches(2.0), Inches(5.4), Inches(1.5),
    "• إجابات عامة مش مخصصة لك\n"
    "• يعطيك خطط رياضة تناسب «شخص متوسط» مش حالتك\n"
    "• لا يعلم وزنك الحقيقي أو نسبة الدهون\n"
    "• يقلل من أهمeaties بياناتك الصحية",
    12, c=LIGHT, a=PP_ALIGN.RIGHT)

# Center divider with arrow
txt(sl, Inches(5.9), Inches(2.1), Inches(1.5), Inches(0.5), "+", 40, True, GREEN, PP_ALIGN.CENTER)
txt(sl, Inches(5.6), Inches(2.6), Inches(2.2), Inches(0.4), "الحل", 18, True, GREEN, PP_ALIGN.CENTER)
txt(sl, Inches(5.6), Inches(3.0), Inches(2.2), Inches(0.4), "Hybrid RAG", 16, True, BLUE, PP_ALIGN.CENTER)

# Bottom: Solution box
bx = rect(sl, RGBColor(0x1A,0x2A,0x1A), Inches(1.5), Inches(3.8), Inches(10.3), Inches(1.1)); bx.line.color.rgb = GREEN
txt(sl, Inches(1.7), Inches(3.85), Inches(9.9), Inches(0.4),
    "✓ Hybrid RAG يجمع بين بياناتك الحقيقية (وزن - أهداف - فحوصات) + المعرفة العلمية بالرياضة",
    16, True, GREEN, PP_ALIGN.RIGHT)
txt(sl, Inches(1.7), Inches(4.25), Inches(9.9), Inches(0.5),
    "النتيجة: إجابة مخصصة لك — تجمع دقة البيانات الشخصية مع عمق المعرفة العامة",
    14, c=LIGHT, a=PP_ALIGN.RIGHT)

# Bottom icons
route_bx = rect(sl, CARD, Inches(0.5), Inches(5.3), Inches(3.8), Inches(0.9)); route_bx.line.color.rgb = PURPLE
txt(sl, Inches(0.7), Inches(5.35), Inches(3.4), Inches(0.35), "🔀 الموجه الذكي", 15, True, PURPLE, PP_ALIGN.CENTER)
txt(sl, Inches(0.7), Inches(5.65), Inches(3.4), Inches(0.3), "يقرر من أين يجيب", 12, c=LIGHT, PP_ALIGN.CENTER)

rect_bx = rect(sl, CARD, Inches(4.7), Inches(5.3), Inches(3.8), Inches(0.9)); rect_bx.line.color.rgb = GREEN
txt(sl, Inches(4.9), Inches(5.35), Inches(3.4), Inches(0.35), "📦 Supabase", 15, True, GREEN, PP_ALIGN.CENTER)
txt(sl, Inches(4.9), Inches(5.65), Inches(3.4), Inches(0.3), "بياناتك الشخصية", 12, c=LIGHT, PP_ALIGN.CENTER)

vec_bx = rect(sl, CARD, Inches(8.9), Inches(5.3), Inches(3.8), Inches(0.9)); vec_bx.line.color.rgb = BLUE
txt(sl, Inches(9.1), Inches(5.35), Inches(3.4), Inches(0.35), "🔍 Vector Store", 15, True, BLUE, PP_ALIGN.CENTER)
txt(sl, Inches(9.1), Inches(5.65), Inches(3.4), Inches(0.3), "قاعدة المعرفة", 12, c=LIGHT, PP_ALIGN.CENTER)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2: المكونات الثلاثة الأساسية
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl); bar(sl); bar(sl, t=Inches(7.42))
slide_title(sl, "الثلاثة مكونات الأساسية", "كيف يشتغل النظام من جوهرياً")
txt(sl, Inches(0.5), Inches(1), Inches(12), Inches(0.3), "كل سؤال يمر بثلاث مراحل:", 16, True, LIGHT, PP_ALIGN.RIGHT)

# Component 1
bx = rect(sl, CARD, Inches(0.4), Inches(1.4), Inches(3.8), Inches(4.5)); bx.line.color.rgb = PURPLE
txt(sl, Inches(0.6), Inches(1.5), Inches(3.4), Inches(0.4), "1. الموجه", 18, True, PURPLE, PP_ALIGN.CENTER)
txt(sl, Inches(0.6), Inches(1.9), Inches(3.4), Inches(0.3), "Query Router", 12, c=MUTED, PP_ALIGN.CENTER)
txt(sl, Inches(0.6), Inches(2.25), Inches(3.4), Inches(1.8),
    "الوظيفة:\n"
    "• يقرأ السؤال الفلسطيني\n"
    "• يحدد نوعه: شخصي / معرفي / مختلط\n"
    "• يختار المصدر المناسب\n\n"
    "مثال:\n"
    "«وزني كام؟» → Supabase\n"
    "«ما هو التمارين؟» → Vector\n"
    "«خطة لي» → Hybrid",
    11, c=LIGHT, a=PP_ALIGN.RIGHT)

# Arrow 1→2
arrow1 = rect(sl, RGBColor(0x33,0x33,0x55), Inches(4.3), Inches(3.3), Inches(1.0), Inches(0.08))
txt(sl, Inches(4.2), Inches(3.1), Inches(1.2), Inches(0.3), "⬇", 18, c=BLUE, PP_ALIGN.CENTER)

# Component 2
bx = rect(sl, CARD, Inches(5.4), Inches(1.4), Inches(3.8), Inches(4.5)); bx.line.color.rgb = GREEN
txt(sl, Inches(5.6), Inches(1.5), Inches(3.4), Inches(0.4), "2. مجمع السياق", 18, True, GREEN, PP_ALIGN.CENTER)
txt(sl, Inches(5.6), Inches(1.9), Inches(3.4), Inches(0.3), "Context Builder", 12, c=MUTED, PP_ALIGN.CENTER)
txt(sl, Inches(5.6), Inches(2.25), Inches(3.4), Inches(1.8),
    "الوظيفة:\n"
    "• يجلب بياناتك من 23 جدول\n"
    "• يرتبها في أقسام واضحة\n"
    "• يضمن عدم إرسال بيانات زائدة\n\n"
    "مثال:\n"
    "وزن: 85kg | دهون: 22%\n"
    "هدف: تنزيل وزن\n"
    "BMR: 1842 سعرة",
    11, c=LIGHT, a=PP_ALIGN.RIGHT)

# Arrow 2→3
arrow2 = rect(sl, RGBColor(0x33,0x33,0x55), Inches(9.3), Inches(3.3), Inches(1.0), Inches(0.08))
txt(sl, Inches(9.2), Inches(3.1), Inches(1.2), Inches(0.3), "⬇", 18, c=BLUE, PP_ALIGN.CENTER)

# Component 3
bx = rect(sl, CARD, Inches(10.4), Inches(1.4), Inches(2.5), Inches(4.5)); bx.line.color.rgb = BLUE
txt(sl, Inches(10.6), Inches(1.5), Inches(2.1), Inches(0.4), "3. المحرك", 18, True, BLUE, PP_ALIGN.CENTER)
txt(sl, Inches(10.6), Inches(1.9), Inches(2.1), Inches(0.3), "RAG Engine", 12, c=MUTED, PP_ALIGN.CENTER)
txt(sl, Inches(10.6), Inches(2.25), Inches(2.1), Inches(1.8),
    "الوظيفة:\n"
    "• يدمج البيانات + المعرفة\n"
    "• يرسلهما لـ LLM\n"
    "• ينظف الإجابة\n\n"
    "النموذج:\n"
    "Cohere command-a\n"
    "متعدد اللغات",
    11, c=LIGHT, a=PP_ALIGN.RIGHT)

# Bottom: Caching note
bx = rect(sl, RGBColor(0x1E,0x1E,0x3A), Inches(0.5), Inches(6.1), Inches(12.3), Inches(0.9)); bx.line.color.rgb = YELLOW
txt(sl, Inches(0.7), Inches(6.15), Inches(11.9), Inches(0.35),
    "⚡ التخزين المؤقت (Cache): وفر 95% من استعلامات قاعدة البيانات و 90% من استدعاءات الذكاء الاصطناعي",
    13, True, YELLOW, PP_ALIGN.RIGHT)
txt(sl, Inches(0.7), Inches(6.5), Inches(11.9), Inches(0.3),
    "4 مستويات: بيانات المستخدم (5 دق) ← Embeddings (ساعة) ← نتائج البحث (دقيقتان) ← الإجابة الكاملة (دقيقتان)",
    11, c=LIGHT, a=PP_ALIGN.RIGHT)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3: تدفق الاستعلام (Visual Flow)
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(prs.slide_layouts[6]); bg(sl); bar(sl); bar(sl, t=Inches(7.42))
slide_title(sl, "مثال حقيقي: كيف يرد النظام؟", "سؤال واحد يمر بكل المكونات")

# User input
bx = rect(sl, RGBColor(0x28,0x28,0x48), Inches(4.5), Inches(1.3), Inches(4.3), Inches(0.7)); bx.line.color.rgb = BLUE
txt(sl, Inches(4.7), Inches(1.35), Inches(4), Inches(0.35), "👤 المستخدم: «كم سعرة أحتاج؟»", 17, True, WHITE, PP_ALIGN.CENTER)

# Arrow
txt(sl, Inches(5.5), Inches(2.05), Inches(2), Inches(0.3), "⬇", 22, c=BLUE, PP_ALIGN.CENTER)

# Router decision
bx = rect(sl, RGBColor(0x28,0x28,0x48), Inches(1), Inches(2.3), Inches(11.3), Inches(0.6)); bx.line.color.rgb = PURPLE
txt(sl, Inches(1.2), Inches(2.35), Inches(10.9), Inches(0.3), "🔀 الموجه: كلمة «سعرة» + «لي» → Hybrid (بيانات + معرفة)", 15, True, WHITE, PP_ALIGN.CENTER)

txt(sl, Inches(5.5), Inches(2.95), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, PP_ALIGN.CENTER)

# Three parallel sources (compact)
# Supabase
bx = rect(sl, CARD, Inches(0.5), Inches(3.3), Inches(3.6), Inches(1.1)); bx.line.color.rgb = GREEN
txt(sl, Inches(0.7), Inches(3.35), Inches(3.2), Inches(0.3), "🗄️ Supabase", 14, True, GREEN, PP_ALIGN.CENTER)
txt(sl, Inches(0.7), Inches(3.65), Inches(3.2), Inches(0.6),
    "الوزن: 85kg\nالدهون: 22%\nBMR: 1842", 11, c=LIGHT, PP_ALIGN.CENTER)

# Vector
bx = rect(sl, CARD, Inches(4.7), Inches(3.3), Inches(3.6), Inches(1.1)); bx.line.color.rgb = BLUE
txt(sl, Inches(4.9), Inches(3.35), Inches(3.2), Inches(0.3), "🔎 Knowledge Base", 14, True, BLUE, PP_ALIGN.CENTER)
txt(sl, Inches(4.9), Inches(3.65), Inches(3.2), Inches(0.6),
    "حساب TDEE\nمعامل النشاط\nمصادر السعرات", 11, c=LIGHT, PP_ALIGN.CENTER)

# Merge
bx = rect(sl, RGBColor(0x25,0x25,0x45), Inches(8.9), Inches(3.3), Inches(3.9), Inches(1.1)); bx.line.color.rgb = PINK
txt(sl, Inches(9.1), Inches(3.35), Inches(3.5), Inches(0.3), "🔄 الدمج", 14, True, PINK, PP_ALIGN.CENTER)
txt(sl, Inches(9.1), Inches(3.65), Inches(3.5), Inches(0.6),
    "بيانات 85kg + نشاط متوسط\n= ~2500 سعرة维持", 11, c=LIGHT, PP_ALIGN.CENTER)

txt(sl, Inches(5.5), Inches(4.45), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, PP_ALIGN.CENTER)

# LLM
bx = rect(sl, RGBColor(0x28,0x28,0x48), Inches(1.5), Inches(4.8), Inches(10.3), Inches(0.6)); bx.line.color.rgb = PURPLE
txt(sl, Inches(1.7), Inches(4.85), Inches(9.9), Inches(0.3), "🤖 Cohere LLM: يدمج البيانات مع المعرفة ويولّد إجابة مخصصة", 15, True, WHITE, PP_ALIGN.CENTER)

txt(sl, Inches(5.5), Inches(5.45), Inches(2), Inches(0.3), "⬇", 18, c=BLUE, PP_ALIGN.CENTER)

# Response
bx = rect(sl, RGBColor(0x1E,0x1E,0x3A), Inches(0.5), Inches(5.75), Inches(12.3), Inches(0.9)); bx.line.color.rgb = GREEN
txt(sl, Inches(0.7), Inches(5.8), Inches(11.9), Inches(0.35),
    "💬 الإجابة النهائية: «بناءً على بياناتك: الوزن 85kg، الدهون 22%، النشاط متوسط → تحتاج ~2500 سعرة يومياً للحفاظ»", 13, True, GREEN, PP_ALIGN.RIGHT)
txt(sl, Inches(0.7), Inches(6.15), Inches(11.9), Inches(0.3),
    "مصادر: Supabase | TDEE Calculator | Cache hit: نعم (<100ms)", 11, c=LIGHT, a=PP_ALIGN.RIGHT)

# Save
out = "شرح_فكرة_الشات_بوت_3_شرائح.pptx"
prs.save(out)
print(f"تم الحفظ: {out}  ({len(prs.slides)} شرائح)")