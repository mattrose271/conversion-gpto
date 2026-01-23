export const metadata = {
  title: "Conversion Interactive · GPTO",
  description: "Building your brand. Growing your business. GPTO + Panthera.",
  openGraph: {
    title: "Conversion Interactive · GPTO",
    description: "AI visibility, telemetry intelligence, and automated content orchestration.",
    type: "website"
  }
};

import "./brand.css";
import Logo from "./components/Logo";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(255,255,255,.85)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(0,0,0,.06)"
          }}
        >
          <div className="container navWrap">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <a href="/" className="brand" style={{ display: "flex", alignItems: "center" }}>
                <Logo />
              </a>
              <a href="/login" className="loginLink" style={{ textDecoration: "none", color: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                Login →
              </a>
            </div>

            {/* Desktop nav */}
            <nav className="navDesktop" aria-label="Primary navigation">
              <a href="/">HOME</a>
              <a href="/pricing">PRICING</a>
              <a href="/contact">CONTACT</a>
              <a href="/audit" className="btn navCta">
                FREE GPTO AUDIT
              </a>
            </nav>

            {/* Mobile menu (no JS) */}
            <details className="navMobile">
              <summary aria-label="Open menu" className="burger">
                <span className="burgerIcon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </summary>

              <div className="mobilePanel" role="menu" aria-label="Mobile menu">
                <a role="menuitem" href="/login" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  Login →
                </a>
                <div style={{ height: 1, background: "rgba(0,0,0,.08)", margin: "4px 0" }} />
                <a role="menuitem" href="/">
                  HOME
                </a>
                <a role="menuitem" href="/pricing">
                  PRICING
                </a>
                <a role="menuitem" href="/contact">
                  CONTACT
                </a>

                <a role="menuitem" href="/audit" className="btn mobileCta">
                  FREE GPTO AUDIT
                </a>
              </div>
            </details>
          </div>
        </header>

        <style>{`
          .navWrap{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            padding:14px 0;
          }
          .brand{
            font-weight:900;
            letter-spacing:-0.3px;
            text-decoration:none;
            color:inherit;
            white-space:nowrap;
            display:flex;
            align-items:center;
          }
          .brand img{
            height:32px;
            width:auto;
            display:block;
          }
          .loginLink{
            font-size:14px;
            opacity:0.8;
            transition:opacity 0.2s;
          }
          .loginLink:hover{
            opacity:1;
          }

          /* Desktop nav */
          .navDesktop{
            display:flex;
            align-items:center;
            gap:14px;
            flex-wrap:wrap;
            justify-content:flex-end;
          }
          .navDesktop a{
            font-weight:700;
            text-decoration:none;
            color:inherit;
          }
          .navCta{
            padding:10px 14px;
            border-radius:999px;
            font-weight:900;
            white-space:nowrap;
            text-decoration:none;
            display:inline-block;
            color:white !important;
          }

          /* Mobile menu uses <details> */
          .navMobile{
            display:none;
            position:relative;
          }
          .burger{
            list-style:none;
            cursor:pointer;
            border:1px solid rgba(0,0,0,.10);
            background:rgba(0,0,0,.04);
            border-radius:12px;
            padding:10px 12px;
            user-select:none;
            min-width:44px;
            min-height:44px;
            display:flex;
            align-items:center;
            justify-content:center;
          }
          .burger::-webkit-details-marker{ display:none; }

          .burgerIcon{
            display:inline-flex;
            flex-direction:column;
            gap:4px;
          }
          .burgerIcon span{
            display:block;
            width:18px;
            height:2px;
            background:rgba(0,0,0,.65);
            border-radius:999px;
          }

          .mobilePanel{
            position:absolute;
            right:0;
            top:52px;
            width:min(92vw, 320px);
            max-width:calc(100vw - 16px);
            background:rgba(255,255,255,.96);
            border:1px solid rgba(0,0,0,.10);
            border-radius:16px;
            box-shadow:0 16px 50px rgba(0,0,0,.12);
            padding:10px;
            display:grid;
            gap:6px;
            z-index:100;
          }
          .mobilePanel a{
            padding:12px 12px;
            border-radius:12px;
            text-decoration:none;
            color:inherit;
            font-weight:800;
            background:rgba(0,0,0,.03);
            min-height:44px;
            display:flex;
            align-items:center;
          }
          .mobilePanel a:hover{
            background:rgba(0,0,0,.06);
          }
          .mobileCta{
            margin-top:6px;
            text-align:center;
            display:block;
            border-radius:999px;
            background:var(--brand-red) !important;
            color:white !important;
          }
          .mobileCta:hover{
            background:var(--brand-red-dark) !important;
            color:white !important;
          }

          /* Mobile breakpoint - standardize to 900px */
          @media (max-width: 899px){
            .navDesktop{ display:none; }
            .navMobile{ display:block; }
          }
        `}</style>

        {children}
      </body>
    </html>
  );
}
