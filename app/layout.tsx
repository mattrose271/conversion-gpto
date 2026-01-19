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
          <div
            className="container"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 0",
              gap: 14
            }}
          >
            <a href="/" style={{ fontWeight: 900, letterSpacing: -0.3 }}>
              ConversionIA
            </a>

            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "flex-end"
              }}
            >
              <a href="/" style={{ fontWeight: 700 }}>
                HOME
              </a>
              <a href="/pricing" style={{ fontWeight: 700 }}>
                PRICING
              </a>
              <a href="/contact" style={{ fontWeight: 700 }}>
                CONTACT
              </a>

              {/* CTA at the end */}
              <a
                href="/audit"
                className="btn"
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontWeight: 900,
                  whiteSpace: "nowrap"
                }}
              >
                FREE GPTO AUDIT
              </a>
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
