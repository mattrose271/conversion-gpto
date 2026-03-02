import AdminNav from "./components/AdminNav";
import "../brand.css";
import "./admin.css";

export const metadata = {
  title: "Admin Portal · GPTO",
  description: "Stripe Webhook Admin Portal",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adminLayout">
      <AdminNav />
      <main className="adminMain">{children}</main>
    </div>
  );
}
