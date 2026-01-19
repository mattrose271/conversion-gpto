import ContactClient from "./ContactClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ContactPage({
  searchParams
}: {
  searchParams?: { url?: string; tier?: string };
}) {
  const prefillWebsite = (searchParams?.url ?? "").toString();
  const tier = (searchParams?.tier ?? "").toString();

  return <ContactClient prefillWebsite={prefillWebsite} tier={tier} />;
}
