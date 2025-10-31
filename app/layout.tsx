export const metadata = {
  title: 'Conversion Interactive · GPTO',
  description: 'Building your brand. Growing your business. GPTO + Panthera.',
  openGraph: { title:'Conversion Interactive · GPTO', description:'AI visibility, telemetry intelligence, and automated content orchestration.', type:'website' }
}
import './brand.css'
export default function Root({ children }){
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
