# MegaLab Hub — merged app, Phase 1

This is the **scaffold**, not the finished merge. What's real vs. what's
still a placeholder:

## Real and working
- Routing shell with the 5 sections (Employees, File Tracker, Label
  Generator, Locker Room, HR Timeline) — sidebar layout, matching
  employee-tracker-v2's real design tokens exactly (colors, fonts,
  spacing all copied from its actual `styles.css`)
- Single shared login (`AuthContext`) — same pattern as hr-timeline-tracker
- EN/AR language switching with RTL (`LanguageContext`)
- Shared roster (`RosterContext`) reading from a new `/roster` Firestore
  collection, with the **data-loss-prevention rule built in from the
  start**: a failed read is tracked separately from "loaded successfully,"
  and nothing here ever silently falls back to empty state
- Employee search by name or ID, from any screen (sidebar search bar)
- Reusable blocking red error screen (`SyncErrorScreen`) for any section
  to use when its own data fails to load

## Placeholder — real logic not ported in yet
- File Tracker's actual 29-item checklist + compliance reports
- Label Generator's actual label creation, QR codes, and print flow
- Locker Room's actual locker grid and drag-and-drop
- HR Timeline's actual probation/milestone/notes tracking
- Cross-navigation with a real target employee (the "Open label
  generator for X" button) — the routing exists, the destination
  section doesn't have real content to land on yet
- Dashboard/overview (progress bars, recent activity)

Each of the four gets ported in as its own phase, reusing the real
existing logic from each repo rather than being rewritten from scratch —
keeping the working systems' proven behavior intact.

## Before this runs for real
1. Fill in `.env` (copy from `.env.example`) with the real Firebase
   config from the new project
2. Set the same values as GitHub Actions repo secrets (Settings → Secrets
   and variables → Actions) so the deploy workflow can build with them
3. Firestore security rules need to be written and published for the new
   project (roster + all four sections, default-deny, schema-validated) —
   not included in this scaffold yet
4. `vite.config.js`'s `base` path should match whatever this repo is
   actually named on GitHub Pages
