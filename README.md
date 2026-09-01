<div align="center">

# 🧪 Practical Lab Management Platform

### Lab Management · Coding Environment · Student Progress Analytics

**Smart India Hackathon 2026** &nbsp;•&nbsp; Problem Statement **SIH26207** &nbsp;•&nbsp; AICTE &nbsp;•&nbsp; Theme: *Smart Education*

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Stack](https://img.shields.io/badge/stack-Supabase%20%7C%20React%20%7C%20Judge0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

> *"Student Innovation – Smart education: a concept that describes learning in the digital age, enabling learners to learn more effectively, efficiently, flexibly and comfortably."*
> — SIH26207, AICTE

## 🎯 The Problem

College practical labs are still run on paper journals and manual attendance. That breaks down in four specific ways:

```mermaid
flowchart LR
    A[Paper-based lab tracking] --> B[No per-student skill record]
    A --> C[Copy-paste plagiarism undetected]
    A --> D[Faculty buried in manual grading]
    A --> E[Zero link to NEP 2020 skill-credit mapping]

    classDef redBox fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px;
    classDef yellowBox fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:2px;

    class A redBox
    class B,C,D,E yellowBox
```

We're turning lab practicals into a **tracked, individually-evaluated, and portable skill record** — built for one college first, designed to scale to any institution running structured lab courses.

## ⚡ What Makes This Different

Most coding-platform submissions stop at "auto-grade the code." We go a level deeper:

> **Every student gets parameterized test inputs for the same practical** — identical logic required, different data. A copy-pasted solution from a classmate simply fails its evaluation. It's a systems-level anti-cheating answer, not a UI restriction like disabling paste.

## 🗺️ Student Journey

```mermaid
flowchart TD
    A([Student logs in]) --> B[Practical assigned]
    B --> C[Theory panel: algorithm · flowchart · pseudocode · video]
    C --> D[Code in Monaco Editor]
    D --> E[Run & test via Judge0]
    E --> F{Tests pass?}
    F -- No --> D
    F -- Yes --> G[Submit]
    G --> H[Auto-evaluation<br/>Coding performance marks calculated]
    H --> I([Status: Completed<br/>visible on faculty dashboard])

    classDef purpleBox fill:#ede9fe,stroke:#7c3aed,color:#3b0764,stroke-width:2px;
    classDef neutralBox fill:#f3f4f6,stroke:#6b7280,color:#111827,stroke-width:2px;
    classDef redBox fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px;
    classDef greenBox fill:#d1fae5,stroke:#059669,color:#065f46,stroke-width:2px;

    class A purpleBox
    class B,C,D,E,F,G neutralBox
    class H redBox
    class I greenBox
```

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Client — React"]
        UI[Monaco IDE · Dashboards · Tab Tracking]
    end

    subgraph Core["🗄️ Supabase"]
        DB[(Postgres DB)]
        Auth[Auth + RLS]
        RT[Realtime]
        Storage[Storage]
    end

    subgraph Services["⚙️ Services"]
        Judge0[Judge0<br/>Sandboxed Execution]
        ML[ML Microservice<br/>Python / FastAPI<br/>Difficulty Tiering]
        N8N[n8n<br/>Alerts · Reminders · Flagging]
    end

    UI --> Core
    Core --> Judge0
    Core --> ML
    Core <--> N8N

    classDef purpleBox fill:#ede9fe,stroke:#7c3aed,color:#3b0764,stroke-width:2px;
    classDef blueBox fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,stroke-width:2px;
    classDef greenBox fill:#d1fae5,stroke:#059669,color:#065f46,stroke-width:2px;

    class UI purpleBox
    class DB,Auth,RT,Storage blueBox
    class Judge0,ML,N8N greenBox

    style Client fill:#f5f3ff,stroke:#7c3aed,color:#3b0764
    style Core fill:#eff6ff,stroke:#2563eb,color:#1e3a8a
    style Services fill:#ecfdf5,stroke:#059669,color:#065f46
```

## 🧩 Core Features

<table>
<tr>
<td width="33%" valign="top">

### 👨‍🎓 For Students
- Split-screen IDE: theory + Monaco editor
- Per-practical status tracking
- Instant test-case feedback
- Performance history & analytics
- *(backlog)* Shareable skill certificate

</td>
<td width="33%" valign="top">

### 👩‍🏫 For Faculty
- Batch + individual progress views
- Auto-filled coding performance marks
- Grading queue for write-up + viva
- Centralized submission records
- Audit trail on every grade

</td>
<td width="33%" valign="top">

### 🔒 Integrity by Design
- Parameterized per-student test data
- Continuous auto-save (no punitive erasing)
- Focus-loss logged, not auto-penalized
- *(backlog)* AST/MOSS plagiarism check

</td>
</tr>
</table>

## 🚦 Build Scope: MVP vs. Backlog

We're deliberately splitting what must work for any demo from what's a stretch goal — a working narrow slice beats a wide, half-built one.

```mermaid
flowchart LR
    subgraph MVP["✅ MVP — must work for any pitch/demo"]
        M1[Login] --> M2[Assigned practical]
        M2 --> M3[Theory + Monaco IDE]
        M3 --> M4[Run via Judge0]
        M4 --> M5[Auto-graded marks]
        M5 --> M6[Faculty dashboard]
    end

    subgraph Backlog["🔮 Backlog — time-permitting"]
        B1[Rule-based difficulty tiering]
        B2[Parameterized test generation]
        B3[Plagiarism detection]
        B4[n8n automations]
        B5[Certificate export]
        B6[Multi-language toggle]
    end

    classDef mvpBox fill:#d1fae5,stroke:#059669,color:#065f46,stroke-width:2px;
    classDef backlogBox fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-width:2px;

    class M1,M2,M3,M4,M5,M6 mvpBox
    class B1,B2,B3,B4,B5,B6 backlogBox

    style MVP fill:#ecfdf5,stroke:#059669,color:#065f46
    style Backlog fill:#fffbeb,stroke:#d97706,color:#78350f
```

> **Note on "adaptive difficulty":** v1 is rule-based (attempt count, time-to-solve, pass rate) — not ML yet, and we say so plainly. A real model comes in v2 once enough submission data exists. We'd rather be honest about this than overclaim AI to judges.

## 🛠️ Tech Stack

Chosen to match the team's existing skills — no time burned learning new infra mid-hackathon.

| Layer | Tool | Why |
|---|---|---|
| 🗄️ Backend + DB + Auth | **Supabase** (Postgres, Auth, RLS, Realtime, Storage) | Relational data with clear foreign keys; RLS gives per-student/per-batch access control free |
| 🎨 Frontend | **React** | Talks directly to Supabase via its JS client |
| 💻 Code editor | **Monaco Editor** | Same engine as VS Code — drop-in |
| ▶️ Code execution | **Judge0** | Sandboxed execution, no custom sandbox to build |
| 🔁 Automation | **n8n** | Digests, reminders, flagging workflows |
| 🧠 ML (difficulty tiering) | **Python / FastAPI** | Small service behind a Supabase Edge Function |
| ⌨️ Compiled practicals | **C++** | DSA/OS lab test cases and evaluation logic |

**📈 Scaling:** self-hosted Judge0 works for a single-college demo; a managed cluster plus client-side execution (e.g. Pyodide) for simple/interpreted languages handles scale and flaky lab Wi-Fi.

**🔐 Privacy:** every query is scoped through Supabase Row Level Security — students see only their own data, faculty see only their assigned batches.

## 📝 Marks Distribution

Matches the college's existing 10-mark practical structure — this isn't a hypothetical grading model, it's grounded in a real requirement.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'pie1': '#2563eb',
  'pie2': '#7c3aed',
  'pie3': '#d97706',
  'pieTitleTextColor': '#e5e7eb',
  'pieSectionTextColor': '#ffffff',
  'pieLegendTextColor': '#e5e7eb',
  'pieStrokeColor': '#111827',
  'pieStrokeWidth': '2px',
  'pieOuterStrokeWidth': '2px',
  'pieOuterStrokeColor': '#111827'
}}}%%
pie showData
    title 10 Marks per Practical
    "Coding Performance (auto via Judge0)" : 5
    "Write-up (journal, faculty-graded)" : 3
    "Viva (faculty-entered)" : 2
```

| Component | Marks | How it's scored |
|---|---|---|
| ⚙️ Coding Performance | 5 | Auto-calculated from Judge0 test-case pass rate, faculty-overridable |
| ✍️ Write-up | 3 | Structured journal (Aim/Algorithm/Code/Output/Conclusion); faculty-entered, platform shows a completeness checklist |
| 🗣️ Viva | 2 | Faculty-entered; platform can auto-suggest questions from theory content |

## 👥 Team Roles

```mermaid
flowchart LR
    T1["🗄️ Schema + Analytics<br/>SQL<br/>Tables · RLS · Faculty queries"]
    T2["🎨 Frontend<br/>JavaScript<br/>React · Monaco · Dashboards"]
    T3["🔁 Automation<br/>n8n<br/>Webhooks · Notifications"]
    T4["🧠 ML + Evaluation<br/>Python, C++<br/>Difficulty tiering · Test design"]

    classDef blueBox fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,stroke-width:2px;
    classDef purpleBox fill:#ede9fe,stroke:#7c3aed,color:#3b0764,stroke-width:2px;
    classDef greenBox fill:#d1fae5,stroke:#059669,color:#065f46,stroke-width:2px;
    classDef redBox fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px;

    class T1 blueBox
    class T2 purpleBox
    class T3 greenBox
    class T4 redBox
```

## 🛡️ Anti-Cheat Philosophy

We chose **detect and inform**, not **punish automatically**:

- ❌ No auto-erasing code on tab switch — code auto-saves continuously
- ❌ No auto-lowering rank from tab-switch count — focus-loss is logged for faculty to *review*, not auto-penalize
- ✅ Tab detection only fires on leaving the browser entirely — navigating to the in-platform theory/video panel doesn't trigger it
- ✅ Primary defense is **parameterized per-student test data** — a real technical answer, not a UI restriction that devtools can bypass

---

<div align="center">

Built for **Smart India Hackathon 2026** · Problem Statement **SIH26207** (AICTE, Smart Education)

</div>
