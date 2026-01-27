# GPTO Website Audit System - Technical Report

## Executive Summary

This report provides a comprehensive analysis of the GPTO (GPT Optimization) website audit system. The system evaluates websites for AI readiness by analyzing their structure, content depth, technical implementation, and answerability to AI systems. The audit produces scores, grades, tier recommendations, and actionable recommendations to improve a website's visibility and interpretability by AI systems.

---

## 1. System Architecture Overview

### 1.1 Core Components

The audit system consists of four main components:

1. **Crawler Engine** (`/app/api/audit/route.ts`)
   - Discovers and fetches website pages
   - Extracts structured data from HTML
   - Handles sitemap.xml parsing and link crawling

2. **Scoring Engine** (`/app/api/audit/route.ts` - `score()` function)
   - Calculates scores across 4 categories
   - Computes overall grade and tier
   - Generates explanations and recommendations

3. **Knowledge Base** (`/app/api/audit/knowledgeBase.ts`)
   - Rule-based recommendation system
   - Maps audit signals to actionable improvements
   - Prioritizes recommendations by impact

4. **Reporting System**
   - Web UI (`/app/audit/page.tsx`)
   - PDF generation (`/app/api/audit/pdf/route.tsx`)
   - Email notifications (`/app/api/audit/email/route.ts`)

### 1.2 Technology Stack

- **Framework**: Next.js 14.2.18 (React 18.2.0)
- **HTML Parsing**: Cheerio 1.0.0
- **XML Parsing**: fast-xml-parser 4.4.1
- **PDF Generation**: @react-pdf/renderer 3.4.5
- **Validation**: Zod 3.23.8
- **Email**: Resend 3.2.0

---

## 2. Website Discovery & Crawling System

### 2.1 Discovery Methods

The system uses two deterministic discovery methods:

#### Method 1: Sitemap.xml (Preferred)
- **Location**: Checks `{origin}/sitemap.xml`
- **Process**:
  1. Fetches sitemap.xml with 6-second timeout
  2. Parses XML using fast-xml-parser
  3. Extracts all `<loc>` URLs from `<urlset>`
  4. Filters URLs to match origin domain
  5. Sorts URLs alphabetically (deterministic)
  6. Limits to first 20 URLs (maxPages = 20)

#### Method 2: Link Crawling (Fallback)
- **Triggered**: When sitemap.xml is unavailable or returns 400+
- **Process**:
  1. Starts with seed URL
  2. Extracts internal links using Cheerio
  3. Follows links up to depth 2
  4. Maintains deterministic order (sorted queue)
  5. Limits to 20 pages maximum
  6. Uses breadth-first traversal

### 2.2 Page Fetching & Parsing

**Fetch Configuration**:
```typescript
- Timeout: 6 seconds per page
- User-Agent: "GPTO-AuditBot/0.1"
- Redirect handling: Follow redirects
- Signal: AbortController for timeout management
```

**Page Summary Extraction**:
For each page, the system extracts:
- `title`: First `<title>` tag text (trimmed)
- `metaDescription`: Boolean - presence of `<meta name="description">`
- `canonical`: Boolean - presence of `<link rel="canonical">`
- `h1Count`: Number of `<h1>` elements
- `h2Count`: Number of `<h2>` elements
- `hasJsonLd`: Boolean - presence of `<script type="application/ld+json">`
- `text`: Body text content (normalized whitespace, max 20,000 chars)
- `status`: HTTP status code
- `url`: Page URL

**Crawl Constraints**:
- Maximum pages: 20
- Maximum depth: 2 (for link crawling)
- Timeout deadline: 20 seconds total
- Batch processing: 8 pages per batch (sequential)

### 2.3 Deterministic Behavior

The system ensures deterministic results through:
1. **Sorted URLs**: All URL lists are sorted alphabetically
2. **Stable Queue**: Link crawling maintains sorted queue
3. **Fixed Limits**: Consistent maxPages (20) and maxDepth (2)
4. **Sequential Processing**: No parallel requests (prevents race conditions)

---

## 3. Scoring System - Detailed Breakdown

### 3.1 Scoring Categories

The system evaluates websites across **4 primary categories**:

#### Category 1: AI Readiness (Answerability)
**Weight**: Primary (used as overall score)

**Purpose**: Measures how easily AI systems can answer fundamental questions about the website.

**Dimensions Evaluated**:
1. **WHAT** - "What you do" clarity
   - Keywords: "we help", "we provide", "our product", "our service", "platform", "solution"
   - Target coverage: 35% of pages

2. **WHO** - "Who it's for" clarity
   - Keywords: "for teams", "for businesses", "for companies", "for marketers", "for recruiters", "for enterprises"
   - Target coverage: 35% of pages

3. **HOW** - "How it works" clarity
   - Keywords: "how it works", "get started", "features", "pricing", "plans", "documentation", "api"
   - Target coverage: 35% of pages

4. **TRUST** - Trust/proof signals
   - Keywords: "case study", "testimonials", "trusted by", "security", "privacy", "compliance", "terms", "gdpr", "soc 2"
   - Target coverage: 35% of pages

**Scoring Algorithm**:
```typescript
// For each dimension (what, who, how, trust):
dimScore = (count / totalPages) / 0.35  // Normalize to target
dimScore = Math.min(1, dimScore) * 25   // Scale to 25 points max
// Total: 4 dimensions × 25 = 100 points max

// Homepage bonus: +3 points if homepage has WHAT, +3 if has HOW
// Final score clamped to 0-100
```

**Example Calculation**:
- 20 pages scanned
- WHAT appears on 8 pages (40%) → 25 points
- WHO appears on 6 pages (30%) → 21.4 points
- HOW appears on 7 pages (35%) → 25 points
- TRUST appears on 5 pages (25%) → 17.9 points
- Homepage has WHAT and HOW → +6 points
- **Total AI Readiness Score: 95.3 → 95 (A)**

#### Category 2: Structure Score
**Weight**: 40% titles + 35% H1s + 25% meta descriptions

**Metrics**:
- `titleRate`: Percentage of pages with title > 2 characters
- `h1Rate`: Percentage of pages with ≥1 H1 tag
- `metaRate`: Percentage of pages with meta description

**Formula**:
```typescript
structureScore = (40 × titleRate) + (35 × h1Rate) + (25 × metaRate)
// Clamped to 0-100
```

**Example**:
- 20 pages scanned
- 18 have titles (90%) → 40 × 0.9 = 36
- 16 have H1s (80%) → 35 × 0.8 = 28
- 12 have meta descriptions (60%) → 25 × 0.6 = 15
- **Structure Score: 79 (B)**

#### Category 3: Content Depth Score
**Weight**: Text length (70%) + H2 count (30%)

**Metrics**:
- `avgText`: Average character count of body text per page
- `avgH2`: Average number of H2 headings per page

**Text Length Scoring**:
- ≥6,000 chars: 70 points
- ≥2,500 chars: 55 points
- ≥1,200 chars: 40 points
- <1,200 chars: 20 points

**H2 Count Scoring**:
- ≥6 H2s: 25 points
- ≥3 H2s: 15 points
- ≥1 H2: 5 points
- 0 H2s: 0 points

**Formula**:
```typescript
contentScore = textLengthScore + h2Score
// Clamped to 0-100
```

**Example**:
- Average text: 4,200 chars → 55 points
- Average H2s: 4 per page → 15 points
- **Content Depth Score: 70 (B)**

#### Category 4: Technical Readiness Score
**Weight**: 45% JSON-LD + 30% canonical + 25% error rate

**Metrics**:
- `jsonLdRate`: Percentage of pages with JSON-LD schema
- `canonicalRate`: Percentage of pages with canonical tags
- `errorRate`: Percentage of pages with errors (status 0 or ≥400)

**Formula**:
```typescript
technicalScore = (45 × jsonLdRate) + (30 × canonicalRate) + (25 × (1 - errorRate))
// Clamped to 0-100
```

**Example**:
- 8 pages have JSON-LD (40%) → 45 × 0.4 = 18
- 15 pages have canonical (75%) → 30 × 0.75 = 22.5
- 2 pages have errors (10%) → 25 × 0.9 = 22.5
- **Technical Score: 63 (D)**

### 3.2 Grade Conversion

Scores are converted to letter grades:

```typescript
function toGrade(score: number) {
  if (score === 100) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
```

**Grade Distribution**:
- **A+**: 100 points
- **A**: 90-99 points
- **B**: 80-89 points
- **C**: 70-79 points
- **D**: 60-69 points
- **F**: 0-59 points

### 3.3 Overall Score Calculation

**Current Implementation**:
The overall score is **equal to the AI Readiness score** (not an average).

```typescript
overallScore = aiReadinessScore
```

**Rationale**: AI Readiness is the primary metric for GPTO optimization, as it directly measures how well a website can be understood by AI systems.

### 3.4 Tier Assignment

Tiers are assigned based on overall grade and supporting category performance:

**Gold Tier**:
- Overall grade: A+ or A
- OR Overall grade: B AND technicalReadiness ≥ C AND contentDepth ≥ C

**Silver Tier**:
- Overall grade: B or C
- (Does not meet Gold criteria)

**Bronze Tier**:
- Overall grade: D or F
- OR Overall grade: B/C but technicalReadiness < C or contentDepth < C

**Tier Logic**:
```typescript
if (overall === "A+" || overall === "A" || 
    (overall === "B" && technicalReadiness !== "D" && 
     technicalReadiness !== "F" && contentDepth !== "D" && 
     contentDepth !== "F")) {
  tier = "Gold";
} else if (overall === "B" || overall === "C") {
  tier = "Silver";
} else {
  tier = "Bronze";
}
```

---

## 4. Recommendation System

### 4.1 Knowledge Base Structure

The recommendation system (`knowledgeBase.ts`) uses a rule-based approach:

**Rule Structure**:
```typescript
{
  id: string,                    // Unique identifier
  category: Category,            // aiReadiness | structure | contentDepth | technicalReadiness
  priority: "high" | "medium" | "low",
  when: (signals) => boolean,    // Condition function
  title: string,                 // Recommendation title
  why: (signals) => string,      // Explanation function
  how: string,                   // Actionable steps
  sources?: string[]             // External references
}
```

### 4.2 Active Rules

#### AI Readiness Rules:

1. **ai-what-missing** (High Priority)
   - **Trigger**: `answerability.whatRate < 0.2`
   - **Action**: Add explicit "what you do" statements

2. **ai-who-missing** (High Priority)
   - **Trigger**: `answerability.whoRate < 0.2`
   - **Action**: Add "who it's for" sections

3. **ai-how-missing** (Medium Priority)
   - **Trigger**: `answerability.howRate < 0.2`
   - **Action**: Publish "how it works" / FAQ content

#### Structure Rules:

4. **structure-meta-missing** (High Priority)
   - **Trigger**: `metaRate < 0.6`
   - **Action**: Add meta descriptions to key pages

5. **structure-h1-inconsistent** (Medium Priority)
   - **Trigger**: `h1Rate < 0.6`
   - **Action**: Standardize H1 usage

#### Technical Readiness Rules:

6. **tech-jsonld-missing** (High Priority)
   - **Trigger**: `jsonLdRate === 0`
   - **Action**: Add JSON-LD schema markup

7. **tech-canonical-low** (Medium Priority)
   - **Trigger**: `canonicalRate < 0.6`
   - **Action**: Ensure canonical tags are consistent

8. **tech-errors-high** (High Priority)
   - **Trigger**: `errorRate > 0.15`
   - **Action**: Fix broken links and reduce errors

9. **tech-sitemap-missing** (Medium Priority)
   - **Trigger**: `usedSitemap === false`
   - **Action**: Publish sitemap.xml

### 4.3 Recommendation Generation Process

1. **Signal Collection**: All audit signals are collected into `AuditSignals` object
2. **Rule Evaluation**: Each rule's `when()` function is evaluated
3. **Recommendation Creation**: Matching rules generate recommendations
4. **Prioritization**: Recommendations sorted: high → medium → low
5. **Enrichment**: External sources are mapped to URLs

### 4.4 Explanation Generation

For each category, the system generates:

**Strengths**:
- Positive observations based on thresholds
- Specific metrics (e.g., "appears on 8/20 pages")

**Gaps**:
- Missing or below-threshold signals
- Specific improvement areas

**Improvements**:
- Default action items if no gaps detected
- Category-specific optimization opportunities

---

## 5. Caching & Performance

### 5.1 Caching Strategy

**Cache Implementation**:
- **Type**: In-memory Map (globalThis)
- **Key**: Domain origin (e.g., "https://example.com")
- **TTL**: 24 hours (86,400,000 ms)
- **Scope**: Per-instance (does not persist across cold starts)

**Cache Logic**:
```typescript
const cacheKey = new URL(url).origin;
const cached = cache.get(cacheKey);
if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
  return cached.payload;
}
```

**Benefits**:
- Reduces repeat audits of same domain
- Prevents API abuse
- Improves response time for cached results

**Limitations**:
- Cache cleared on server restart
- Not shared across instances (if multiple servers)
- No cache invalidation mechanism

### 5.2 Performance Characteristics

**Typical Audit Duration**:
- Sitemap discovery: ~1-2 seconds
- Page fetching: ~8-15 seconds (20 pages × 0.4-0.75s each)
- Processing: <1 second
- **Total: ~10-20 seconds**

**Bottlenecks**:
1. Network latency (page fetching)
2. Timeout handling (6s per page)
3. Sequential processing (no parallelization)

**Optimization Opportunities**:
- Parallel page fetching (currently sequential)
- Connection pooling
- Incremental caching (cache individual pages)

---

## 6. Output Formats

### 6.1 JSON API Response

**Endpoint**: `POST /api/audit`

**Request**:
```json
{
  "url": "example.com"
}
```

**Response Structure**:
```json
{
  "url": "https://example.com",
  "scope": {
    "maxPages": 20,
    "scannedPages": 18,
    "usedSitemap": true,
    "durationMs": 12450
  },
  "scores": {
    "aiReadiness": 85,
    "structure": 79,
    "contentDepth": 70,
    "technicalReadiness": 63,
    "overall": 85
  },
  "grades": {
    "aiReadiness": "B",
    "structure": "B",
    "contentDepth": "B",
    "technicalReadiness": "D",
    "overall": "B"
  },
  "tier": "Silver",
  "explanations": {
    "tierWhy": ["Mixed readiness: improve answerability..."],
    "perCategory": {
      "aiReadiness": {
        "strengths": [...],
        "gaps": [...],
        "improvements": [...]
      },
      // ... other categories
    }
  },
  "recommendations": [
    {
      "id": "ai-what-missing",
      "category": "aiReadiness",
      "priority": "high",
      "title": "Make 'what you do' explicit...",
      "why": "...",
      "how": "...",
      "sources": [...]
    }
  ],
  "signals": {
    "titleRate": 0.9,
    "h1Rate": 0.8,
    "metaRate": 0.6,
    "avgText": 4200,
    "avgH2": 4,
    "jsonLdRate": 0.4,
    "canonicalRate": 0.75,
    "errorRate": 0.1,
    "answerability": {
      "whatRate": 0.4,
      "whoRate": 0.3,
      "howRate": 0.35,
      "trustRate": 0.25
    },
    "usedSitemap": true
  }
}
```

### 6.2 PDF Report

**Endpoint**: `GET /api/audit/pdf?url=example.com`

**Features**:
- Branded PDF with Conversion Interactive Agency styling
- Scorecard table
- Detailed category breakdowns
- Strengths and optimization opportunities
- Downloadable filename: `gpto-audit-{hostname}.pdf`

**Technology**: @react-pdf/renderer (React components → PDF)

### 6.3 Web UI

**Page**: `/audit`

**Features**:
- URL input form
- Progress indicator during audit
- Scorecard display
- Category detail cards (swipeable on mobile)
- PDF download button
- Links to pricing and contact pages
- Responsive design (mobile-first)

---

## 7. Key Algorithms & Formulas

### 7.1 AI Readiness (Answerability) Algorithm

```typescript
function computeAnswerability(pagesOk, seedUrl, origin) {
  const n = pagesOk.length || 1;
  
  // Define keyword sets
  const WHAT = ["we help", "we provide", "our product", ...];
  const WHO = ["for teams", "for businesses", ...];
  const HOW = ["how it works", "get started", ...];
  const TRUST = ["case study", "testimonials", ...];
  
  // Count occurrences per dimension
  const counts = { what: 0, who: 0, how: 0, trust: 0 };
  for (const page of pagesOk) {
    const text = pageText(page);
    if (hasAny(text, WHAT)) counts.what++;
    if (hasAny(text, WHO)) counts.who++;
    if (hasAny(text, HOW)) counts.how++;
    if (hasAny(text, TRUST)) counts.trust++;
  }
  
  // Score each dimension (target: 35% coverage)
  const target = 0.35;
  const dimScore = (count) => {
    const rate = count / n;
    const normalized = Math.min(1, rate / target);
    return Math.round(25 * normalized);
  };
  
  let score = dimScore(counts.what) + 
              dimScore(counts.who) + 
              dimScore(counts.how) + 
              dimScore(counts.trust);
  
  // Homepage bonus
  const home = findHomepage(pagesOk, seedUrl, origin);
  if (home) {
    const ht = pageText(home);
    score += (hasAny(ht, WHAT) ? 3 : 0) + (hasAny(ht, HOW) ? 3 : 0);
  }
  
  return {
    score: clamp0to100(score),
    perDim: { what: { count, total: n }, ... }
  };
}
```

### 7.2 Structure Score Formula

```typescript
structureScore = clamp0to100(
  (40 × titleRate) + 
  (35 × h1Rate) + 
  (25 × metaRate)
)

where:
  titleRate = pagesWithTitle / totalPages
  h1Rate = pagesWithH1 / totalPages
  metaRate = pagesWithMeta / totalPages
```

### 7.3 Content Depth Formula

```typescript
contentScore = clamp0to100(
  textLengthScore + h2Score
)

where:
  textLengthScore = 
    avgText >= 6000 ? 70 :
    avgText >= 2500 ? 55 :
    avgText >= 1200 ? 40 : 20
  
  h2Score = 
    avgH2 >= 6 ? 25 :
    avgH2 >= 3 ? 15 :
    avgH2 >= 1 ? 5 : 0
```

### 7.4 Technical Readiness Formula

```typescript
technicalScore = clamp0to100(
  (45 × jsonLdRate) + 
  (30 × canonicalRate) + 
  (25 × (1 - errorRate))
)

where:
  jsonLdRate = pagesWithJsonLd / totalPages
  canonicalRate = pagesWithCanonical / totalPages
  errorRate = pagesWithErrors / totalPages
```

---

## 8. Limitations & Constraints

### 8.1 Crawling Limitations

1. **Page Limit**: Maximum 20 pages per audit
   - May miss important pages on large sites
   - Solution: Prioritize sitemap.xml for better coverage

2. **Depth Limit**: Maximum depth 2 for link crawling
   - Deep pages may not be discovered
   - Solution: Rely on sitemap.xml

3. **Timeout**: 6 seconds per page, 20 seconds total
   - Slow pages may be skipped
   - Solution: Increase timeout or parallelize

4. **JavaScript**: No JavaScript execution
   - Client-side rendered content not analyzed
   - Solution: Use headless browser for JS sites

### 8.2 Scoring Limitations

1. **Keyword Matching**: Simple text matching (case-insensitive)
   - May miss synonyms or context
   - Solution: Use NLP/ML for semantic understanding

2. **Fixed Thresholds**: Hard-coded thresholds (e.g., 35% coverage)
   - May not fit all site types
   - Solution: Make thresholds configurable

3. **No Context Analysis**: Doesn't understand content quality
   - Thin but keyword-rich pages score well
   - Solution: Add content quality metrics

### 8.3 Technical Limitations

1. **No Authentication**: Cannot audit protected pages
   - Solution: Add authentication support

2. **No Rate Limiting**: No per-IP rate limiting
   - Solution: Add rate limiting middleware

3. **Cache Invalidation**: No manual cache invalidation
   - Solution: Add admin endpoint to clear cache

---

## 9. Improvement Opportunities for Audit System

### 9.1 Enhanced Crawling

1. **Parallel Fetching**
   - Current: Sequential (8 pages per batch)
   - Improvement: Parallel fetch with p-limit (concurrency: 5-10)
   - Impact: 3-5x faster audits

2. **Incremental Caching**
   - Current: Cache entire audit result
   - Improvement: Cache individual page summaries
   - Impact: Faster re-audits, partial updates

3. **JavaScript Rendering**
   - Current: HTML-only parsing
   - Improvement: Add Puppeteer/Playwright for JS sites
   - Impact: Accurate audits for SPA/React sites

### 9.2 Advanced Scoring

1. **Semantic Analysis**
   - Current: Keyword matching
   - Improvement: Use embeddings (OpenAI/Claude) for semantic understanding
   - Impact: More accurate AI readiness scores

2. **Content Quality Metrics**
   - Current: Text length only
   - Improvement: Readability, uniqueness, relevance scores
   - Impact: Better content depth evaluation

3. **Contextual Understanding**
   - Current: Page-level analysis
   - Improvement: Site-wide topic modeling, entity extraction
   - Impact: Better understanding of site purpose

### 9.3 Recommendation Engine

1. **ML-Based Recommendations**
   - Current: Rule-based
   - Improvement: Train model on successful improvements
   - Impact: More personalized, effective recommendations

2. **Priority Scoring**
   - Current: High/Medium/Low
   - Improvement: Impact score (estimated score improvement)
   - Impact: Better prioritization

3. **A/B Testing Integration**
   - Current: Static recommendations
   - Improvement: Track which recommendations improve scores
   - Impact: Data-driven optimization

### 9.4 Reporting Enhancements

1. **Historical Tracking**
   - Current: Single audit snapshot
   - Improvement: Track scores over time, show trends
   - Impact: Measure improvement progress

2. **Comparative Analysis**
   - Current: Single site audit
   - Improvement: Compare against industry benchmarks
   - Impact: Contextualize scores

3. **Actionable Checklists**
   - Current: Text recommendations
   - Improvement: Interactive checklists with progress tracking
   - Impact: Better user engagement

---

## 10. Implementation Guide for Improved Audit System

### 10.1 Architecture Recommendations

**Modular Design**:
```
/audit-engine/
  /crawlers/
    - sitemap-crawler.ts
    - link-crawler.ts
    - js-crawler.ts (Puppeteer)
  /analyzers/
    - structure-analyzer.ts
    - content-analyzer.ts
    - ai-readiness-analyzer.ts
    - technical-analyzer.ts
  /scorers/
    - score-calculator.ts
    - grade-converter.ts
    - tier-assigner.ts
  /recommenders/
    - rule-engine.ts
    - ml-recommender.ts
  /storage/
    - cache-manager.ts
    - history-tracker.ts
```

### 10.2 Key Enhancements to Implement

#### 10.2.1 Parallel Crawling
```typescript
import pLimit from 'p-limit';

async function crawlParallel(urls: string[], concurrency = 5) {
  const limit = pLimit(concurrency);
  const results = await Promise.all(
    urls.map(url => limit(() => fetchAndParse(url)))
  );
  return results;
}
```

#### 10.2.2 Semantic Analysis
```typescript
async function analyzeSemantic(text: string) {
  // Use OpenAI embeddings or similar
  const embedding = await getEmbedding(text);
  const whatScore = cosineSimilarity(embedding, WHAT_EMBEDDING);
  const whoScore = cosineSimilarity(embedding, WHO_EMBEDDING);
  // ... more semantic analysis
}
```

#### 10.2.3 Historical Tracking
```typescript
interface AuditHistory {
  url: string;
  audits: Array<{
    timestamp: Date;
    scores: Scores;
    grades: Grades;
    tier: Tier;
  }>;
}

async function trackAudit(url: string, result: AuditResult) {
  await db.auditHistory.update({
    where: { url },
    data: {
      audits: {
        push: {
          timestamp: new Date(),
          ...result
        }
      }
    }
  });
}
```

### 10.3 Configuration System

Create a configurable scoring system:

```typescript
interface AuditConfig {
  crawling: {
    maxPages: number;
    maxDepth: number;
    timeout: number;
    parallel: boolean;
    concurrency: number;
  };
  scoring: {
    aiReadiness: {
      targetCoverage: number; // default 0.35
      keywordSets: Record<string, string[]>;
      useSemantic: boolean;
    };
    structure: {
      weights: { title: number; h1: number; meta: number };
    };
    // ... other category configs
  };
  recommendations: {
    enableML: boolean;
    minPriority: "high" | "medium" | "low";
  };
}
```

### 10.4 Database Schema for Tracking

```sql
CREATE TABLE audits (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  scores JSONB,
  grades JSONB,
  tier TEXT,
  recommendations JSONB,
  signals JSONB
);

CREATE INDEX idx_audits_domain ON audits(domain);
CREATE INDEX idx_audits_created_at ON audits(created_at);

CREATE TABLE audit_history (
  id UUID PRIMARY KEY,
  audit_id UUID REFERENCES audits(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  scores JSONB,
  grades JSONB,
  tier TEXT
);

CREATE INDEX idx_history_audit_id ON audit_history(audit_id);
```

---

## 11. Testing & Validation

### 11.1 Test Cases

**Test Website Types**:
1. **E-commerce**: Product-focused, structured data
2. **SaaS**: Feature-heavy, documentation
3. **Blog**: Content-rich, minimal structure
4. **Landing Page**: Single page, conversion-focused
5. **SPA**: JavaScript-rendered, dynamic content

**Expected Behaviors**:
- E-commerce: High technical, medium AI readiness
- SaaS: High structure, high content depth
- Blog: High content depth, low technical
- Landing Page: High AI readiness, low content depth
- SPA: Low scores (without JS rendering)

### 11.2 Validation Metrics

1. **Score Consistency**: Same site should score similarly (±5 points)
2. **Tier Accuracy**: Manual review of tier assignments
3. **Recommendation Relevance**: Expert review of recommendations
4. **Performance**: Audit completes in <30 seconds

---

## 12. Conclusion

The GPTO audit system provides a comprehensive evaluation framework for website AI readiness. Its strengths include:

1. **Deterministic Crawling**: Reliable, reproducible results
2. **Multi-Dimensional Scoring**: Evaluates structure, content, technical, and AI readiness
3. **Actionable Recommendations**: Rule-based system provides specific improvements
4. **Multiple Output Formats**: JSON API, PDF, and web UI

**Key Areas for Enhancement**:
1. Parallel crawling for performance
2. Semantic analysis for accuracy
3. Historical tracking for progress measurement
4. JavaScript rendering for modern sites
5. ML-based recommendations for personalization

This report provides the foundation for building an improved audit system that can better serve websites seeking to optimize their AI visibility and interpretability.

---

## Appendix A: File Structure Reference

```
/app/api/audit/
  route.ts              # Main audit endpoint (crawling + scoring)
  knowledgeBase.ts      # Recommendation rules engine
  pdf/route.tsx         # PDF generation endpoint
  email/route.ts        # Email notification endpoint

/app/audit/
  page.tsx              # Web UI for audit interface

/app/api/app/api/ai/
  route.ts              # Alternative/legacy audit endpoint
```

## Appendix B: Key Functions Reference

| Function | Location | Purpose |
|----------|----------|---------|
| `crawl()` | route.ts:133 | Discovers and fetches pages |
| `score()` | route.ts:261 | Calculates all scores and grades |
| `computeAnswerability()` | route.ts:203 | AI readiness scoring |
| `buildRecommendations()` | knowledgeBase.ts:152 | Generates recommendations |
| `toGrade()` | route.ts:29 | Converts score to letter grade |
| `normalizeInputUrl()` | route.ts:17 | Standardizes URL input |

## Appendix C: Signal Thresholds Reference

| Signal | Threshold | Meaning |
|--------|-----------|---------|
| `whatRate` | 0.35 | Target coverage for "what" dimension |
| `whoRate` | 0.35 | Target coverage for "who" dimension |
| `howRate` | 0.35 | Target coverage for "how" dimension |
| `trustRate` | 0.35 | Target coverage for "trust" dimension |
| `titleRate` | 0.7 | Good coverage threshold |
| `h1Rate` | 0.7 | Good coverage threshold |
| `metaRate` | 0.6 | Good coverage threshold |
| `jsonLdRate` | 0 | Presence check (binary) |
| `canonicalRate` | 0.6 | Good coverage threshold |
| `errorRate` | 0.15 | High error threshold |
| `avgText` | 6000 | Excellent content length |
| `avgH2` | 6 | Excellent structure depth |

---

**Report Generated**: January 28, 2026  
**System Version**: Based on Next.js 14.2.18  
**Report Purpose**: Technical documentation for audit system improvement
