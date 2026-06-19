export interface InBodyResult {
  id: string;
  user_id: string | null;
  raw_path: string;
  created_at: string;

  result: {
    weight_kg: number;
    pbf_percent: number;
    smm_kg: number;
    height_cm: number;
    bmi: number;
    bmr_kcal: number;
    inbody_score: number;

    tbw_l: number;
    protein_kg: number;
    minerals_kg: number;
    bfm_kg: number;

    lean_ra_kg: number;
    lean_la_kg: number;
    lean_trunk_kg: number;
    lean_rl_kg: number;
    lean_ll_kg: number;

    fat_ra_kg: number;
    fat_la_kg: number;
    fat_trunk_kg: number;
    fat_rl_kg: number;
    fat_ll_kg: number;

    whr: number;
    vfl: number;

    test_date: string | null;
  };
}