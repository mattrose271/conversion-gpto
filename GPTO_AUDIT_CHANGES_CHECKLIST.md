# GPTO Audit Upgrade — Before & After Checklist

> Changes implemented in the GPTO Audit + Proposal System upgrade.

---

## Table of Contents

1. [User Flow & Input](#1-user-flow--input)
2. [Focus & Competitors](#2-focus--competitors)
3. [Data & Content](#3-data--content)
4. [UI Components](#4-ui-components)
5. [PDF & Actions](#5-pdf--actions)
6. [API & Infrastructure](#6-api--infrastructure)
7. [Reference](#7-reference)

---

## 1. User Flow & Input

### 1.1 Input Capture

| | Before | After |
|:---|:---|:---|
| **Required** | URL, Email | URL, Email |
| **Optional** | — | Focus Area, Competitors (max 5) |
| **Step 2** | — | AuditPrepModal before audit runs |

### 1.2 Flow Sequence

```
BEFORE:  URL + Email → Audit → PDF → Email
AFTER:   URL + Email → [Modal: Focus + Competitors] → Audit → Combined PDF → Email
```

---

## 2. Focus & Competitors

### 2.1 Focus Area Options

| | Before | After |
|:---|:---|:---|
| **Selection** | None | 4 options available |
| **Impact** | — | Does **not** alter scoring or tier |

**Options:**
- Improve Our AI Visibility
- Strengthen Our Website Structure for AI
- Clarify Our Messaging & Positioning
- Improve Our Competitive Position

### 2.2 Competitor Processing

| | Before | After |
|:---|:---|:---|
| **Analysis** | None | Structural signal extraction per URL |
| **Scored/Ranked** | — | No — structural context only |

**Extracted:** Service segmentation · Schema types/coverage · FAQ coverage · Authority signals · Messaging clarity

**Not extracted:** Traffic · Rankings · Backlinks · Domain authority · Revenue

---

## 3. Data & Content

### 3.1 Data Model Changes

| Type | Before | After |
|:---|:---|:---|
| `AuditInput` | `url`, `email` | + `focusArea?`, `competitors?` |
| `StructuralSignals` | — | New: `serviceSegmentation`, `schemaTypes`, `schemaCoverage`, `faqCoverage`, `authoritySignals`, `messagingClarity` |
| `AuditResult` | Scores, grades | + `primarySignals`, `competitorSignals?` |
| **Database** | Basic audit fields | + `focusArea`, `competitors`, `primarySignals`, `competitorSignals` |

### 3.2 Content Governance

| Category | Before | After |
|:---|:---|:---|
| Grade projections | Possible "improves from C to B" | **Removed** |
| Unverified stats | e.g. "40%" | **Removed** |
| Axis naming | "Conversion Clarity" | **"Website Clarity"** |
| Guarantee language | Revenue, ranking, "beat competitors" | **Removed** |
| **Approved** | — | Strengthens · Supports · Reinforces · Reduces ambiguity · Structural clarity |

### 3.3 Pricing & Commitment

| | Before | After |
|:---|:---|:---|
| **Tier pricing** | Variable | Locked: Bronze $999 · Silver $2,499 · Gold $4,999 |
| **Commitment** | Unclear | Three-month commitment (explicit) |
| **Dynamic pricing** | — | No |

---

## 4. UI Components

### 4.1 Proposal Section

| | Before | After |
|:---|:---|:---|
| **Results page** | None | ProposalSection component |
| **PDF** | None | Included in combined PDF |
| **Content** | — | Executive Summary · Focus Area · Recommended Tier · Pricing · "What This Strengthens" · "What This Enables" · Important Clarification |

> **Important Clarification:** *"GPTO strengthens structural visibility conditions. It does not generate traffic, leads, or revenue independently."*

### 4.2 Competitive Snapshot

| | Before | After |
|:---|:---|:---|
| **Display** | None | Table (when competitors exist) |
| **Columns** | — | Service Definition · Schema Coverage · FAQ Coverage · Authority Signals · Messaging Consistency |
| **Language** | — | Qualitative only — no "ahead/behind/better/outperforming" |

### 4.3 Compliance Footer

| | Before | After |
|:---|:---|:---|
| **Component** | None/inconsistent | Reusable ComplianceFooter |
| **Placement** | — | Audit page · Proposal · PDF · Email |

---

## 5. PDF & Actions

### 5.1 PDF Structure

| | Before | After |
|:---|:---|:---|
| **Contents** | Audit scorecard only | Scorecard → Proposal → Competitive Snapshot (conditional) → Compliance Footer |
| **File** | Possibly separate | Single combined PDF |
| **Button** | Generic | "Download Combined PDF" |
| **Footer** | Basic | + "GPTO Audit System v1.0" |

### 5.2 Results Page Structure

```
Audit Scorecard → Proposal Section → Competitive Snapshot (if competitors) → Action Section
```

### 5.3 Action Section CTAs

| CTA | Before | After |
|:---|:---|:---|
| **Download** | Basic | "Download Combined PDF" |
| **Purchase** | Generic/absent | "View {tier} Package Details" |
| **Contact** | — | "Connect with Us" (Calendly) |

---

## 6. API & Infrastructure

### 6.1 API Changes

| | Before | After |
|:---|:---|:---|
| `focusArea` param | No | Yes |
| `competitors` param | No | Yes (array, max 5) |

### 6.2 Error Handling

| Scenario | Behavior |
|:---|:---|
| Invalid competitor URL | Ignored (skipped) |
| Competitor scan failure | Omit snapshot, log, continue |
| Audit page | Always renders; errors surfaced to user |

### 6.3 Logging

| Event | Logged |
|:---|:---|
| Audit creation | URL, tier, competitor count |
| Competitor scan | Failures |
| Email delivery | Success/failure |

### 6.4 Unchanged

- Tier logic (axis scoring only)
- Pricing values (locked)
- PDF system (extended, no new libs)
- Email system (extended, no new infra)
- No ranking comparison
- No performance guarantees

---

## 7. Reference

### New Files

| File | Purpose |
|:---|:---|
| `app/components/AuditPrepModal.tsx` | Step 2 modal: Focus Area + Competitors |
| `app/components/ComplianceFooter.tsx` | Reusable compliance disclaimer |
| `app/components/ProposalSection.tsx` | Proposal content (web + PDF) |
| `app/components/CompetitiveSnapshot.tsx` | Competitor signal table |
| `lib/types/audit.ts` | Extended types, FOCUS_AREA_OPTIONS |

### Modified Files

| File | Changes |
|:---|:---|
| `app/audit/page.tsx` | Modal flow, ProposalSection, CompetitiveSnapshot, ComplianceFooter |
| `app/api/audit/route.ts` | Focus/competitors input, competitor crawl, structural signals |
| `app/api/audit/pdf/route.tsx` | Proposal, Competitive Snapshot, Compliance Footer |
| `app/api/audit/email/route.ts` | Compliance Footer in email |
| `lib/data/tierDeliverables.ts` | TIER_PRICING, three-month commitment |
| `prisma/schema.prisma` | focusArea, competitors, primarySignals, competitorSignals |
