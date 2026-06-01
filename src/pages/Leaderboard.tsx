import { useEffect, useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useXP, seedMockLeaderboard, type XPUser } from '../hooks/useXP'
import { useToast } from '../components/Toast'
import ls from './Leaderboard.module.css'
import usePageTitle from '../hooks/usePageTitle'

const LEVEL_COLORS = [
  '','#6b7280','#10b981','#3b82f6',
  '#8b5cf6','#f59e0b','#ef4444',
  '#00d4aa','#f97316','#e2e8f0','#c9a227'
]

const LEVEL_NAMES = [
  '','Bronze','Silver','Gold','Platinum',
  'Diamond','Master','Grandmaster','Legend','Mythic','Titan'
]

function LevelBadge({ level }: { level: number }) {
  const color = LEVEL_COLORS[level] ?? '#fff'
  return (
    <div className={ls.levelBadge} style={{ borderColor: color, color }}>
      Lv.{level}
    </div>
  )
}

function XPBar({ xp, next }: { xp: number; next: number | null }) {
  const pct = next ? Math.min(100, (xp / next) * 100) : 100
  return (
    <div className={ls.xpBarWrap}>
      <div className={ls.xpBar} style={{ width: `${pct}%` }}/>
    </div>
  )
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className={ls.medal}>🥇</span>
  if (rank === 2) return <span className={ls.medal}>🥈</span>
  if (rank === 3) return <span className={ls.medal}>🥉</span>
  return <span className={ls.rankNum}>#{rank}</span>
}

const XP_RULES = [
  { icon:'🛒', label:'Buy NFT',            xp:'+50 XP' },
  { icon:'💰', label:'Sell NFT',           xp:'+30 XP' },
  { icon:'✨', label:'Mint NFT',           xp:'+20 XP' },
  { icon:'⚡', label:'Batch Mint (5+)',    xp:'+60 XP' },
  { icon:'🏷️', label:'List for Sale',      xp:'+10 XP' },
  { icon:'🤝', label:'Make an Offer',      xp:'+5 XP'  },
  { icon:'📅', label:'Daily Check-in',     xp:'+5 XP'  },
  { icon:'🔥', label:'3-Day Streak',       xp:'+15 XP' },
  { icon:'💎', label:'7-Day Streak',       xp:'+50 XP' },
  { icon:'📈', label:'Hold Rare NFT/day',  xp:'+1/day' },
]

const LEVELS_INFO = [
  { lvl:1,  name:'Bronze',       color:'#6b7280', req:0      },
  { lvl:2,  name:'Silver',       color:'#10b981', req:100    },
  { lvl:3,  name:'Gold',         color:'#3b82f6', req:250    },
  { lvl:4,  name:'Platinum',     color:'#8b5cf6', req:500    },
  { lvl:5,  name:'Diamond',      color:'#f59e0b', req:1000   },
  { lvl:6,  name:'Master',       color:'#ef4444', req:2000   },
  { lvl:7,  name:'Grandmaster',  color:'#00d4aa', req:4000   },
  { lvl:8,  name:'Legend',       color:'#f97316', req:8000   },
  { lvl:9,  name:'Mythic',       color:'#e2e8f0', req:15000  },
  { lvl:10, name:'Titan',        color:'#c9a227', req:30000  },
]

export default function Leaderboard() {
  usePageTitle('XP Leaderboard')
  const account  = useCurrentAccount()
  const { me, initUser, dailyCheckIn, getLeaderboard, nextLevelXP } = useXP(account?.address)
  const { success, info } = useToast()
  const [board,    setBoard]    = useState<XPUser[]>([])
  const [checking, setChecking] = useState(false)
  const [justChecked, setJustChecked] = useState(false)

  useEffect(() => {
    seedMockLeaderboard()
    if (account) {
      initUser(
        account.address,
        account.address.slice(0, 6) + '...' + account.address.slice(-4)
      )
    }
    setBoard(getLeaderboard())
  }, [account?.address])

  const handleCheckIn = async () => {
    if (!account || checking) return
    setChecking(true)
    const result = dailyCheckIn(account.address)
    await new Promise(r => setTimeout(r, 700))
    if (result?.already) {
      info('Already checked in today. Come back tomorrow! 🌙')
    } else if (result) {
      success(`+${result.xp} XP! ${(result.streak ?? 0) > 2 ? `🔥 ${result.streak ?? 0}-day streak!` : '📅 Check-in done!'}`)
      setJustChecked(true)
      setBoard(getLeaderboard())
      setTimeout(() => setJustChecked(false), 3000)
    }
    setChecking(false)
  }

  const myRank  = me ? board.findIndex(u => u.address === me.address) + 1 : 0
  const nextXP  = me ? nextLevelXP(me.xp) : null
  const myColor = me ? (LEVEL_COLORS[me.level] ?? '#fff') : '#fff'

  return (
    <main className={ls.page}>
      <div className="container">

        {/* ── Header ── */}
        <div className={ls.hdr}>
          <div>
            <div className={ls.eyebrow}>
              <div className={ls.eyebrowDot}/>
              Live Rankings
            </div>
            <h1 className={ls.title}>XP Leaderboard</h1>
            <p className={ls.sub}>
              Earn XP by trading, minting and collecting on Tuskr.
              Daily check-ins and streaks give bonus XP.
            </p>
          </div>
          {account && (
            <button
              className={`btn btn-primary ${ls.ciBtn} ${justChecked ? ls.ciBtnDone : ''}`}
              onClick={handleCheckIn}
              disabled={checking}>
              {checking ? '⟳ Checking in...' : justChecked ? '✓ Checked in!' : '📅 Daily Check-in +5 XP'}
            </button>
          )}
        </div>

        {/* ── My XP card ── */}
        {me && account && (
          <div className={ls.myCard}>
            <div className={ls.myLeft}>
              <div className={ls.myAvatar} style={{ borderColor: myColor, color: myColor }}>
                {(me.username || '??').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className={ls.myName}>{me.username}</div>
                <div className={ls.myStreak}>
                  {me.streak > 0 ? `🔥 ${me.streak}-day streak` : 'Start your streak: check in daily!'}
                </div>
              </div>
            </div>

            <div className={ls.myStats}>
              <div className={ls.myStat}>
                <div className={ls.myStatN}>{me.xp.toLocaleString()}</div>
                <div className={ls.myStatL}>Total XP</div>
              </div>
              <div className={ls.myStat}>
                <div className={ls.myStatN} style={{ color: myColor }}>
                  {LEVEL_NAMES[me.level] ?? `Lv.${me.level}`}
                </div>
                <div className={ls.myStatL}>Level {me.level}</div>
              </div>
              {myRank > 0 && (
                <div className={ls.myStat}>
                  <div className={ls.myStatN}>#{myRank}</div>
                  <div className={ls.myStatL}>Your rank</div>
                </div>
              )}
              {me.streak > 0 && (
                <div className={ls.myStat}>
                  <div className={ls.myStatN}>🔥{me.streak}</div>
                  <div className={ls.myStatL}>Day streak</div>
                </div>
              )}
            </div>

            <div className={ls.myProgress}>
              <div className={ls.myProgLabel}>
                {nextXP
                  ? `${me.xp.toLocaleString()} / ${nextXP.toLocaleString()} XP to Level ${me.level + 1}`
                  : '🏆 Max level reached'}
              </div>
              <XPBar xp={me.xp} next={nextXP}/>
            </div>
          </div>
        )}

        {/* ── Main grid: table + sidebar ── */}
        <div className={ls.main}>

          {/* Table */}
          <div className={ls.tableCard}>
            <div className={ls.tableTop}>
              <span className={ls.tableTitle}>Global Rankings</span>
              <span className={ls.tableSub}>{board.length} collectors</span>
            </div>

            {board.map((user, i) => {
              const isMe   = user.address === (me?.address)
              const next   = nextLevelXP(user.xp)
              const color  = LEVEL_COLORS[user.level] ?? '#fff'
              return (
                <div key={user.address} className={`${ls.row} ${isMe ? ls.rowMe : ''}`}>
                  <div className={ls.rowRank}><RankIcon rank={i + 1}/></div>

                  <div className={ls.rowUser}>
                    <div className={ls.rowAv} style={{ borderColor: isMe ? color : undefined, color: isMe ? color : undefined }}>
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className={ls.rowName}>
                        {user.username}
                        {isMe && <span className={ls.youTag}>You</span>}
                      </div>
                      <div className={ls.rowStreak}>
                        {user.streak > 0 ? `🔥 ${user.streak}-day streak` : ''}
                      </div>
                    </div>
                  </div>

                  <div className={ls.rowLvl}>
                    <LevelBadge level={user.level}/>
                  </div>

                  <div className={ls.rowRight}>
                    <div className={ls.rowXP}>{user.xp.toLocaleString()} <span className={ls.rowXPSuf}>XP</span></div>
                    <XPBar xp={user.xp} next={next}/>
                  </div>

                  <div className={ls.rowBadges}>
                    {user.badges.slice(0, 3).map(b => (
                      <span key={b} className={ls.badge}>
                        {b === 'collector' ? '🖼️' : b === 'whale' ? '🐋' : b === 'daily_streak' ? '💎' : b === 'legend' ? '👑' : b === 'first_buy' ? '🛒' : '⭐'}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className={ls.sidebar}>

            {/* XP Rules */}
            <div className={ls.sideCard}>
              <div className={ls.sideCardTitle}>How to earn XP</div>
              {XP_RULES.map(rule => (
                <div key={rule.label} className={ls.rule}>
                  <span className={ls.ruleIcon}>{rule.icon}</span>
                  <span className={ls.ruleLabel}>{rule.label}</span>
                  <span className={ls.ruleXP}>{rule.xp}</span>
                </div>
              ))}
            </div>

            {/* Levels */}
            <div className={ls.sideCard} style={{ marginTop:12 }}>
              <div className={ls.sideCardTitle}>Level tiers</div>
              {LEVELS_INFO.map(lvl => {
                const unlocked = me ? me.level >= lvl.lvl : false
                return (
                  <div key={lvl.lvl} className={ls.lvlRow} style={{ opacity: unlocked ? 1 : 0.38 }}>
                    <div className={ls.lvlBubble} style={{ color: lvl.color, borderColor: lvl.color }}>
                      {lvl.lvl}
                    </div>
                    <div className={ls.lvlName}>{lvl.name}</div>
                    <div className={ls.lvlReq}>{lvl.req > 0 ? `${lvl.req.toLocaleString()} XP` : 'Start'}</div>
                    {unlocked && <span className={ls.lvlCheck} style={{ color: lvl.color }}>✓</span>}
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
