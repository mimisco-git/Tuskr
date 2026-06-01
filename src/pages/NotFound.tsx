import { Link } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'
export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <main style={{ minHeight:'80vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 24px' }}>
      <div style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--a)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:16 }}>404</div>
      <h1 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(40px,6vw,72px)', fontWeight:700, letterSpacing:'-0.03em', color:'#fff', marginBottom:16 }}>Page not found.</h1>
      <p style={{ fontSize:17, color:'rgba(255,255,255,0.4)', marginBottom:40, maxWidth:400, lineHeight:1.7 }}>The page you are looking for does not exist or has been moved.</p>
      <Link to="/" className="btn btn-outline btn-lg">Go home</Link>
    </main>
  )
}
