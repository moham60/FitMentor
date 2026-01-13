// src/lib/calorieCalculator.ts
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';

const activityFactor: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export function calculateCaloriePlan(input: {
  gender: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}) {
  const { gender, age, heightCm, weightKg, activityLevel } = input;

  // Mifflin-St Jeor
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = Math.round(bmr * activityFactor[activityLevel]);

  const maintain = tdee;
  const mildLoss = Math.round(tdee * 0.9);     // 90%
  const loss = Math.round(tdee * 0.81);        // 81%
  const extremeLoss = Math.round(tdee * 0.62); // 62%

  return { bmr: Math.round(bmr), tdee, maintain, mildLoss, loss, extremeLoss };
}
