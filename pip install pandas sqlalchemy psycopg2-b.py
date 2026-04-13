import pandas as pd
from sqlalchemy import create_engine, inspect

# 1. إعداد الاتصال (استخدمنا الباسورد المشفر الذي جهزته لك)
# ملاحظة: sqlalchemy يستخدم صيغة مختلفة قليلاً
DB_URL = "postgresql+psycopg2://postgres:dg%2652FD-C%215b-G%40@db.syoxohhodkeyilztemwl.supabase.co:5432/postgres"

def backup_data_to_csv():
    try:
        # إنشاء محرك الاتصال
        engine = create_engine(DB_URL)
        
        # الحصول على أسماء الجداول الموجودة في قاعدة البيانات
        inspector = inspect(engine)
        # نفترض أن الجداول في الـ schema الافتراضي 'public'
        tables = inspector.get_table_names(schema='public')
        
        print(f"Found tables: {tables}")

        for table in tables:
            print(f"📥 Downloading table: {table}...")
            # قراءة الجدول بالكامل
            df = pd.read_sql_table(table, engine, schema='public')
            
            # حفظ الملف بصيغة CSV
            filename = f"{table}_backup.csv"
            df.to_csv(filename, index=False)
            print(f"✅ Saved: {filename}")
            
        print("\n🎉 تمت عملية النسخ الاحتياطي لجميع الجداول بنجاح!")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    backup_data_to_csv()