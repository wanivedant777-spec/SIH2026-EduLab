# 🗄️ Database & n8n Integration Guide

This directory holds the PostgreSQL schemas, seed migrations, and automation specifications for the **Practical Lab Management Platform (SIH 2026)**.

---

## 📁 Directory Layout

```
database/
├── schemas/
│   ├── 00_clean_reset.sql     # Complete wipe/reset script for clean-slate setup
│   ├── 01_initial_schema.sql  # Dynamic relational hierarchy, RLS, triggers & 5-3-2 rubric
│   └── 02_seed_data.sql       # Parameterized institutional setup & CSV ingestion template
└── README.md                  # This integration guide
```

---

## 🚀 Setting Up with Supabase

### Option A: Via Supabase Web Dashboard
1. Go to your Supabase project dashboard at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** tab from the left sidebar.
3. Paste the contents of `schemas/01_initial_schema.sql` and click **Run**.
4. Paste the contents of `schemas/02_seed_data.sql` and click **Run**.
5. Copy your **Project URL** and **anon / public key** from `Project Settings -> API` into `client/.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Option B: Via Supabase CLI (Local Dev)
```bash
# Initialize Supabase if needed
supabase init

# Link your project or start local postgres
supabase start

# Apply migrations
supabase db reset
```

---

## 🔁 n8n Automation Workflows

n8n connects to Supabase through **Database Webhooks** or **Supabase Realtime Trigger nodes**.

### Recommended Automation Triggers:

1. **Practical Submission & Grading Digest**:
   - **Trigger**: Database Webhook on `public.submissions` (`INSERT`).
   - **Action**: When `status = 'completed'`, compute summary stats and notify the allocated batch faculty with a direct link to the grading queue for write-up (5M) and viva (2M).

2. **Excessive Tab-Switch / Focus-Loss Flagging**:
   - **Trigger**: Database Webhook on `public.tab_switch_logs` (`INSERT`).
   - **Action**: If a student logs > 5 `window_blur` events in a single practical session, post an audit alert to faculty review queue (no auto-penalty, pure audit trail).

3. **Adaptive Difficulty Recommendations**:
   - **Trigger**: Scheduled n8n cron (end of lab practical session).
   - **Action**: Query the FastAPI endpoint `POST http://server-host:8000/api/tiering` with the student's aggregate stats to assign next week's recommended difficulty tier in their profile.
