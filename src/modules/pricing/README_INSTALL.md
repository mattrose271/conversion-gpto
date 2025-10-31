# GPTO Pricing & Report Module — Install Guide

This package adds:
- Four-tier pricing data (`/site/data/plans.json`)
- A dynamic Pricing component (`/site/components/Pricing.tsx`)
- A client-side Report form & result (`/site/components/ReportForm.tsx`, `ReportResult.tsx`)
- A report API route that returns personalized on-screen pricing (`/site/pages/api/report.ts`)
- A basic thank-you page (`/site/pages/thank-you.tsx`)
- Super-res placeholders for plan images (`/site/public/img/plan-*.png`)

## How to use
1. Drop these files into your repo under `/site/` (keep paths identical).
2. On your landing page (e.g., `/site/pages/index.tsx`), import and place components:
   ```tsx
   import Pricing from '../components/Pricing';
   import ReportForm from '../components/ReportForm';

   export default function Home() {
     return (<>
       {/* ... hero / copy ... */}
       <Pricing />
       <ReportForm />
     </>);
   }
   ```
3. Environment variables (optional internal forward only):
   - `PRIMARY_EMAIL` = the agency inbox to receive report copies
   - `RESEND_API_KEY` = API key for Resend (if set, API will forward report JSON to your inbox)
   If either is missing, the API logs the report to server console and **does not send any external email**.

## Behavior
- The report is generated **on screen** after form submission (no outbound email to the visitor).
- A copy may be forwarded **internally** to your agency inbox if env vars exist.
- No external model calls are made; tailoring is heuristic-based and privacy-safe.

## Notes
- To further customize plan blurbs, edit `/site/data/plans.json`.
- To adjust the on-screen “push to sale” CTA, edit `cta` in the API response (`report.ts`).

--
Built for ConversionIA — Conversion red/white/black palette.
