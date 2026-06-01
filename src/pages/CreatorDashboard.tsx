import { useCurrentAccount } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import s from './CreatorDashboard.module.css'
import usePageTitle from '../hooks/usePageTitle'

const MOCK_SALES = [
  { date:'Mon', volume:2.5, royalties:0.12 },
  { date:'Tue', volume:8.0, royalties:0.40 },
  { date:'Wed', volume:4.5, royalties:0.22 },
  { date:'Thu', volume:12.5,royalties:0.62 },
  { date:'Fri', volume:6.0, royalties:0.30 },
  { date:'Sat', volume:18.0,royalties:0.90 },
  { date:'Sun', volume:9.5, royalties:0.47 },
]

const MOCK_NFTS = [
  { name:'Arctic Phantom #001', sold:true,  price:'12.5', buyer:'0xabc...def', date:'2d ago'  },
  { name:'Deep Current #007',   sold:false, price:'8.0',  buyer:null,          date:'Listed'  },
  { name:'Tusk Genesis',        sold:true,  price:'22.0', buyer:'0x123...456', date:'5d ago'  },
  { name:'Polar Drift #012',    sold:false, price:'6.5',  buyer:null,          date:'Listed'  },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-2)', border:'1px solid var(--b-2)', borderRadius:8, padding:'10px 14px' }}>
      <p style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--t-3)', marginBottom:4 }}>{label}</p>
      <p style={{ fontFamily:'var(--f-disp)', fontSize:16, color:'var(--a)' }}>{payload[0].value} SUI</p>
    </div>
  )
}

export default function CreatorDashboard() {
  usePageTitle('Creator Dashboard')
  const account = useCurrentAccount()

  if (!account) return (
    <main style={{ padding:'80px 0', textAlign:'center' }}>
      <p style={{ fontFamily:'var(--f-disp)', fontSize:24, color:'var(--t)', opacity:0.4, marginBottom:16 }}>Connect wallet to view dashboard</p>
      <Link to="/marketplace" className="btn btn-ghost">Browse marketplace</Link>
    </main>
  )

  const totalVol    = MOCK_SALES.reduce((s,d) => s + d.volume, 0)
  const totalRoy    = MOCK_SALES.reduce((s,d) => s + d.royalties, 0)
  const sold        = MOCK_NFTS.filter(n => n.sold).length
  const listed      = MOCK_NFTS.filter(n => !n.sold).length

  return (
    <main className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div className={s.avatar}>{account.address.slice(2,4).toUpperCase()}</div>
          <div>
            <h1 className={s.title}>Creator Dashboard</h1>
            <p className={s.addr}>{account.address.slice(0,10)}…{account.address.slice(-6)}</p>
          </div>
          <Link to="/mint" className="btn btn-primary" style={{ marginLeft:'auto' }}>+ Mint NFT</Link>
        </div>

        <div className={s.metricsRow}>
          {[
            { label:'Total Volume',   value:`${totalVol.toFixed(1)} SUI`,   sub:'All-time' },
            { label:'Royalties Earned', value:`${totalRoy.toFixed(2)} SUI`, sub:'At 5% rate' },
            { label:'NFTs Sold',      value:String(sold),                    sub:'Completed' },
            { label:'Active Listings',value:String(listed),                  sub:'Currently live' },
          ].map(m => (
            <div key={m.label} className={s.metric}>
              <p className={s.metricLabel}>{m.label}</p>
              <p className={s.metricValue}>{m.value}</p>
              <p className={s.metricSub}>{m.sub}</p>
            </div>
          ))}
        </div>

        <div className={s.twoCol}>
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>Volume (7 days)</span>
            </div>
            <div style={{ height:200, padding:'16px 4px 8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_SALES}>
                  <defs>
                    <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00c9a7" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#00c9a7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill:'var(--t-3)', fontSize:10, fontFamily:'var(--f-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="volume" stroke="#00c9a7" strokeWidth={2} fill="url(#vol)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>Royalties (7 days)</span>
            </div>
            <div style={{ height:200, padding:'16px 4px 8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_SALES}>
                  <XAxis dataKey="date" tick={{ fill:'var(--t-3)', fontSize:10, fontFamily:'var(--f-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="royalties" stroke="#d4a843" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardTitle}>My NFTs</span>
            <Link to="/mint" className="btn btn-ghost btn-sm">+ Mint new</Link>
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>NFT</th><th>Price</th><th>Status</th><th>Buyer</th><th>Date</th></tr></thead>
              <tbody>
                {MOCK_NFTS.map(n => (
                  <tr key={n.name}>
                    <td><span style={{ fontFamily:'var(--f-disp)', fontSize:15 }}>{n.name}</span></td>
                    <td><span style={{ fontFamily:'var(--f-disp)', color:'var(--a)' }}>{n.price} SUI</span></td>
                    <td>
                      <span className={`${s.statusBadge} ${n.sold ? s.sold : s.listed}`}>
                        {n.sold ? 'Sold' : 'Listed'}
                      </span>
                    </td>
                    <td><span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t-3)' }}>{n.buyer ?? 'N/A'}</span></td>
                    <td><span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--t-3)' }}>{n.date}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
