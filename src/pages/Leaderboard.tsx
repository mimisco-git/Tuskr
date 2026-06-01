import { useEffect, useState, useCallback } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useXP, type XPUser, LEVEL_NAMES, LEVEL_COLORS, LEVEL_THRESHOLDS, XP_VALUES } from '../hooks/useXP'
import { useToast } from '../components/Toast'
import s from './Leaderboard.module.css'
import usePageTitle from '../hooks/usePageTitle'

/* SVG icons — no emoji, clean and consistent */
function IconBuy()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> }
function IconSell()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function IconMint()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
function IconBatch()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="6" height="6"/><rect x="9" y="3" width="6" height="6"/><rect x="16" y="3" width="6" height="6"/><rect x="2" y="12" width="6" height="6"/><rect x="9" y="12" width="6" height="6"/></svg> }
function IconList()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 21 16 7 8 7 8 21"/></svg> }
function IconOffer()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> }
function IconCheckin(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IconStreak() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> }
function IconHold()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IconTrophy() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 3 8 8 12 11 16 8 16 3"/><line x1="9" y1="3" x2="15" y2="3"/><path d="M8 8c-2 0-4 1-4 4 0 2 1 4 4 4"/><path d="M16 8c2 0 4 1 4 4 0 2-1 4-4 4"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg> }

const HOW_TO_EARN = [
  { icon:<IconBuy/>,     label:'Buy NFT',           xp:'+50 XP', desc:'Purchase any listed NFT' },
  { icon:<IconSell/>,    label:'Sell NFT',           xp:'+30 XP', desc:'Successfully sell your NFT' },
  { icon:<IconMint/>,    label:'Mint NFT',           xp:'+20 XP', desc:'Mint a new NFT on Tuskr' },
  { icon:<IconBatch/>,   label:'Batch Mint (5+)',    xp:'+60 XP', desc:'Mint 5 or more at once' },
  { icon:<IconList/>,    label:'List for Sale',      xp:'+10 XP', desc:'List an NFT on the marketplace' },
  { icon:<IconOffer/>,   label:'Make an Offer',      xp:'+5 XP',  desc:'Place an offer on an NFT' },
  { icon:<IconCheckin/>, label:'Daily Check-in',     xp:'+5 XP',  desc:'Check in once per day' },
  { icon:<IconStreak/>,  label:'3-Day Streak',       xp:'+15 XP', desc:'Check in 3 days in a row' },
  { icon:<IconStreak/>,  label:'7-Day Streak',       xp:'+50 XP', desc:'Check in 7 days in a row' },
  { icon:<IconHold/>,    label:'Hold NFT / day',     xp:'+1/day', desc:'Hold any NFT you own' },
]

function LevelBadge({ level }: { level: number }) {
  const color = LEVEL_COLORS[level - 1] ?? '#fff'
  const name  = LEVEL_NAMES[level - 1] ?? 'Bronze'
  return (
    <div className={s.badge} style={{ borderColor: color, color }}>
      Lv.{level} {name}
    </div>
  )
}

function XPBar({ xp, next }: { xp: number; next: number | null }) {
  const pct = next ? Math.min(100, (xp / next) * 100) : 100
  return (
    <div className={s.xpBarWrap}>
      <div className={s.xpBar} style={{ width:`${pct}%` }}/>
    </div>
  )
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <div className={s.rankGold}><IconTrophy/></div>
  if (rank === 2) return <div className={s.rankSilver}><IconTrophy/></div>
  if (rank === 3) return <div className={s.rankBronze}><IconTrophy/></div>
  return <div className={s.rankNum}>#{rank}</div>
}

export default function Leaderboard() {
  usePageTitle('XP Leaderboard')
  const account = useCurrentAccount()
  const { me, initUser, dailyCheckIn, getLeaderboard, nextLevelXP, LEVEL_THRESHOLDS } = useXP(account?.address)
  const { success } = useToast()

  const [board,    setBoard]    = useState<XPUser[]>([])
  const [checking, setChecking] = useState(false)

  const refresh = useCallback(() => {
    const lb = getLeaderboard()
    setBoard(lb)
  }, [getLeaderboard])

  useEffect(() => {
    if (account) {
      initUser(account.address, account.address.slice(0,8) + '…' + account.address.slice(-4))
    }
    refresh()
  }, [account?.address])

  const handleCheckIn = async () => {
    if (!account || checking) return
    setChecking(true)
    try {
      const result = dailyCheckIn(account.address)
      if (result?.already) {
        success('Already checked in today. Come back tomorrow!')
      } else if (result) {
        const msg = result.streak >= 7
          ? `+${result.xp} XP! 7-day streak bonus!`
          : result.streak >= 3
            ? `+${result.xp} XP! ${result.streak}-day streak!`
            : `+${result.xp} XP! Day ${result.streak} streak.`
        success(msg)
        refresh()
      }
    } finally {
      setChecking(false)
    }
  }

  const myRank    = me ? board.findIndex(u => u.address === me.address) + 1 : 0
  const nextXP    = me ? nextLevelXP(me.xp) : null
  const todayChecked = me?.lastCheckIn
    ? new Date(me.lastCheckIn).toDateString() === new Date().toDateString()
    : false

  return (
    <main className={s.page}>
      <div className="container">

        {/* Header */}
        <div className={s.header}>
          <div>
            <div className={s.eyebrow}><div className={s.eyebrowDot}/>XP Leaderboard</div>
            <h1 className={s.title}>Rankings</h1>
            <p className={s.sub}>Earn XP by trading, minting and collecting on Tuskr.</p>
          </div>
          <button
            className={`${s.checkInBtn} ${todayChecked ? s.checkInDone : ''}`}
            onClick={handleCheckIn}
            disabled={checking || todayChecked}
          >
            <IconCheckin/>
            {todayChecked ? 'Checked in today' : 'Daily check-in +5 XP'}
          </button>
        </div>

        {/* My stats card */}
        {account && me ? (
          <div className={s.myCard}>
            <div className={s.myAvatar}>{me.address.slice(2,4).toUpperCase()}</div>
            <div className={s.myInfo}>
              <div className={s.myAddr}>{me.address.slice(0,12)}…{me.address.slice(-6)}</div>
              <LevelBadge level={me.level}/>
              {me.streak > 0 && (
                <div className={s.myStreak}><IconStreak/> {me.streak}-day streak</div>
              )}
            </div>
            <div className={s.myStats}>
              <div className={s.myStat}>
                <div className={s.myStatN}>{me.xp.toLocaleString()}</div>
                <div className={s.myStatL}>Total XP</div>
              </div>
              <div className={s.myStat}>
                <div className={s.myStatN}>Lv.{me.level}</div>
                <div className={s.myStatL}>Level</div>
              </div>
              <div className={s.myStat}>
                <div className={s.myStatN}>{myRank > 0 ? `#${myRank}` : '–'}</div>
                <div className={s.myStatL}>Rank</div>
              </div>
            </div>
            <div className={s.myProgress}>
              <div className={s.myProgressLabel}>
                <span>{me.xp.toLocaleString()} XP</span>
                {nextXP && <span>{nextXP.toLocaleString()} XP to Lv.{me.level + 1}</span>}
              </div>
              <XPBar xp={me.xp} next={nextXP}/>
            </div>
          </div>
        ) : (
          <div className={s.connectPrompt}>
            <div className={s.connectIcon}><IconTrophy/></div>
            <p className={s.connectTitle}>Connect wallet to join the leaderboard</p>
            <p className={s.connectSub}>Your XP is tracked automatically as you trade, mint and collect.</p>
          </div>
        )}

        <div className={s.mainGrid}>
          {/* Leaderboard table */}
          <div className={s.tableCard}>
            <div className={s.tableTop}>
              <span className={s.tableTitle}>Global Rankings</span>
              <span className={s.tableCount}>{board.length} collector{board.length !== 1 ? 's' : ''}</span>
            </div>

            {board.length === 0 ? (
              <div className={s.emptyBoard}>
                <p className={s.emptyIcon}><IconTrophy/></p>
                <p className={s.emptyTitle}>No rankings yet</p>
                <p className={s.emptySub}>Be the first. Mint an NFT to start earning XP.</p>
              </div>
            ) : (
              <div className={s.rows}>
                {board.map((user, i) => {
                  const isMe   = user.address === me?.address
                  const color  = LEVEL_COLORS[user.level - 1] ?? '#fff'
                  const lvlPct = nextLevelXP(user.xp)
                    ? Math.min(100, (user.xp / (nextLevelXP(user.xp) ?? 1)) * 100)
                    : 100
                  return (
                    <div key={user.address} className={`${s.row} ${isMe ? s.rowMe : ''}`}>
                      <RankIcon rank={i + 1}/>
                      <div className={s.rowAvatar} style={{ borderColor: color }}>
                        {user.username.slice(0,2).toUpperCase()}
                      </div>
                      <div className={s.rowInfo}>
                        <div className={s.rowName}>
                          {user.username}
                          {isMe && <span className={s.youTag}>You</span>}
                        </div>
                        <div className={s.rowMeta}>
                          {user.streak > 0 && (
                            <span className={s.rowStreak}><IconStreak/> {user.streak}d</span>
                          )}
                        </div>
                      </div>
                      <div className={s.rowRight}>
                        <div className={s.rowLvl} style={{ color }}>
                          Lv.{user.level}
                        </div>
                        <div className={s.rowBar}>
                          <div className={s.rowBarFill} style={{ width:`${lvlPct}%`, background: color }}/>
                        </div>
                        <div className={s.rowXP}>{user.xp.toLocaleString()} XP</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className={s.sidePanel}>
            {/* How to earn */}
            <div className={s.sideCard}>
              <div className={s.sideTitle}>How to earn XP</div>
              <div className={s.earnList}>
                {HOW_TO_EARN.map(item => (
                  <div key={item.label} className={s.earnItem}>
                    <div className={s.earnIcon}>{item.icon}</div>
                    <div className={s.earnInfo}>
                      <div className={s.earnLabel}>{item.label}</div>
                      <div className={s.earnDesc}>{item.desc}</div>
                    </div>
                    <div className={s.earnXP}>{item.xp}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level tiers */}
            <div className={s.sideCard}>
              <div className={s.sideTitle}>Level Tiers</div>
              <div className={s.tierList}>
                {LEVEL_NAMES.map((name, i) => {
                  const color     = LEVEL_COLORS[i]
                  const threshold = LEVEL_THRESHOLDS[i]
                  const current   = me?.level === i + 1
                  const unlocked  = (me?.level ?? 0) > i
                  return (
                    <div key={name} className={`${s.tier} ${current ? s.tierCurrent : ''} ${unlocked ? s.tierUnlocked : ''}`}>
                      <div className={s.tierDot} style={{ background: color, boxShadow: (current||unlocked) ? `0 0 8px ${color}` : 'none' }}/>
                      <span className={s.tierName} style={{ color: (current||unlocked) ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                        Lv.{i+1} {name}
                      </span>
                      <span className={s.tierXP} style={{ color: (current||unlocked) ? color : 'rgba(255,255,255,0.2)' }}>
                        {threshold.toLocaleString()} XP
                      </span>
                      {unlocked && !current && <span className={s.tierCheck}>✓</span>}
                      {current && <span className={s.tierCur}>Current</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
