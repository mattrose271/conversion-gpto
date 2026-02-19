import { Suspense } from "react";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <section className="hero">
          <div className="container">
            <h1>
              Payment <span style={{ color: "var(--brand-red)" }}>Received</span>
            </h1>
            <p className="muted">Loading checkout details...</p>
          </div>
        </section>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
