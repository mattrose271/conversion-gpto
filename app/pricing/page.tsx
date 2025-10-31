import dynamic from "next/dynamic";
const Pricing = dynamic(() => import("@/modules/pricing"));
export default function PricingPage(){
  return (
    <main style={{padding:24, maxWidth:900, margin:"0 auto"}}>
      <h1>Pricing</h1>
      <Pricing />
    </main>
  );
}
