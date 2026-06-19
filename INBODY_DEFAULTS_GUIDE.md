# InBody Defaults - Implementation Guide

## Overview
This implementation adds default InBody result values to the FitMentor database and integrates them seamlessly with user profiles and the AI assistant.

## Features Added

### 1. Automatic Default Initialization
- When a user has no InBody results, defaults are automatically created
- Default values represent healthy baseline metrics
- Marked with `raw_path: "system_default"` for identification

### 2. Smart Data Fetching
- Functions automatically create defaults if none exist
- Prevents null/missing data issues
- Ensures consistent data availability

### 3. AI Assistant Integration
- AI chat now receives InBody metrics with user context
- Can provide personalized fitness recommendations based on metrics
- Uses latest InBody results (or defaults)

## Python Functions

### `get_default_inbody_result()`
Returns baseline InBody metrics:
```python
{
  "weight_kg": 70.0,
  "pbf_percent": 20.0,  # Percent body fat
  "smm_kg": 35.0,       # Skeletal muscle mass
  "bmi": 22.9,
  "bmr_kcal": 1700,
  "inbody_score": 75,
  # ... and more metrics
}
```

### `create_default_inbody_results(user_id)`
Creates default entry for user if none exist:
```python
result = await create_default_inbody_results(user_id)
```

### `fetch_inbody_results_or_defaults(user_id, limit=3)`
Fetches results or creates defaults:
```python
results = await fetch_inbody_results_or_defaults(user_id, limit=3)
```

## API Endpoints

### Get InBody Results with Defaults
```bash
GET /api/user/{user_id}/inbody-results
GET /api/user/{user_id}/inbody-results/with-defaults
```

### Create Default InBody Results
```bash
POST /api/user/{user_id}/inbody-results/create-defaults
```

## React Hook Usage

### useInBodyResults()
```typescript
const { latestResult, results, loading, error, refetch } = useInBodyResults();

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;

if (latestResult?.result) {
  console.log(latestResult.result.weight_kg);
  console.log(latestResult.is_default);
}
```

### In Components
```typescript
import { useInBodyResults } from '@/hooks/useInBodyResults';

function MyComponent() {
  const { latestResult } = useInBodyResults();
  
  return (
    <div>
      Weight: {latestResult?.result.weight_kg} kg
      InBody Score: {latestResult?.result.inbody_score}
    </div>
  );
}
```

## Integration Points

### 1. AIAssistantView
- Automatically fetches InBody results
- Includes in user profile payload for chat
- AI receives metrics for personalized responses

### 2. InBodyPage
- Displays real InBody results when available
- Falls back to defaults if no scans exist
- Shows whether data is user-recorded or default

### 3. Profile Context
- Profile data now includes InBody metrics
- Available for all user-facing features

## Data Structure

### InBodyResult Type
```typescript
interface InBodyResult {
  id?: string;
  user_id: string;
  created_at: string;
  raw_path: string;
  result: {
    weight_kg: number;
    pbf_percent: number;
    smm_kg: number;
    height_cm: number;
    bmi: number;
    bmr_kcal: number;
    inbody_score: number;
    // ... 15+ more metrics
  };
  is_default?: boolean;
}
```

## Default Values Explained

| Metric | Default | Range | Category |
|--------|---------|-------|----------|
| Weight | 70 kg | - | Body Weight |
| % Body Fat | 20% | 10-25% (healthy) | Composition |
| Skeletal Muscle | 35 kg | 30-45 kg | Lean Mass |
| Height | 175 cm | - | Reference |
| BMI | 22.9 | 18.5-25 (healthy) | Health Metric |
| BMR | 1700 kcal | - | Metabolism |
| InBody Score | 75 | 50-100 | Overall |
| Muscle Balance | Equal | - | Symmetry |
| Fat Distribution | Even | - | Health |

## Testing

### Test Creating Defaults
```bash
curl -X POST http://localhost:8000/api/user/test-user-id/inbody-results/create-defaults
```

### Test Fetching With Defaults
```bash
curl http://localhost:8000/api/user/test-user-id/inbody-results/with-defaults
```

### Test React Hook
```typescript
// In browser console
const { latestResult } = useInBodyResults();
console.log(latestResult);
```

## Files Modified

1. **chatbot/supabase_client.py**
   - Added default functions
   - Added smart fetching

2. **chatbot/user.py**
   - Added 3 new API endpoints
   - Integrated defaults

3. **src/hooks/useInBodyResults.ts** (NEW)
   - React hook for fetching
   - Type definitions
   - Error handling

4. **src/components/ai/AIAssistantView.tsx**
   - Integrated useInBodyResults
   - Added to user profile payload

5. **src/userPages/InBodyPage.tsx**
   - Uses real InBody results
   - Displays defaults when needed

## Future Enhancements

- [ ] Auto-update defaults based on profile changes
- [ ] Machine learning model to suggest realistic defaults
- [ ] Historical tracking of default vs. real values
- [ ] Bulk initialization for existing users
- [ ] Admin dashboard for default management
