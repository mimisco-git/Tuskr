/**
 * useXP.ts
 * XP system for Tuskr marketplace.
 * Points are stored in localStorage (will be on-chain after contract deploy).
 *
 * XP RULES:
 * - Buy NFT:            +50 XP
 * - Sell NFT:           +30 XP
 * - List NFT:           +10 XP
 * - Daily check-in:     +5 XP
 * - 3-day streak:       +15 XP bonus
 * - 7-day streak:       +50 XP bonus
 * - Hold costly NFT:    +1 XP/day per NFT worth > 10 SUI
 * - Mint NFT:           +20 XP
 * - Batch mint (5+):    +60 XP
 * - Make offer:         +5 XP
 */
import { useState, useCallback } from 'react'

const STORAGE_KEY = 'tuskr_xp'
const USERS_KEY   = 'tuskr_xp_users'

export interface XPUser {
  address:     string
  username:    string
  xp:          number
  level:       number
  streak:      number
  lastCheckIn: string | null
  badges:      string[]
  history:     XPEvent[]
}

export interface XPEvent {
  id:        string
  type:      XPEventType
  xp:        number
  label:     string
  timestamp: string
}

export type XPEventType =
  | 'buy' | 'sell' | 'list' | 'mint' | 'batch_mint'
  | 'checkin' | 'streak_3' | 'streak_7' | 'hold_bonus'
  | 'offer' | 'referral'

const XP_VALUES: Record<XPEventType, number> = {
  buy:        50,
  sell:       30,
  list:       10,
  mint:       20,
  batch_mint: 60,
  checkin:    5,
  streak_3:   15,
  streak_7:   50,
  hold_bonus: 1,
  offer:      5,
  referral:   100,
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000]

const BADGES: Record<string, { threshold: number; label: string; icon: string }> = {
  first_buy:    { threshold: 1,    label: 'First Buy',      icon: '🛒' },
  collector:    { threshold: 5,    label: 'Collector',       icon: '🖼️' },
  whale:        { threshold: 2000, label: 'Whale',           icon: '🐋' },
  daily_streak: { threshold: 7,    label: '7-Day Streak',    icon: '🔥' },
  legend:       { threshold: 10000,label: 'Legend',          icon: '👑' },
}

function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

function loadUsers(): XPUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') } catch { return [] }
}

function saveUsers(users: XPUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function loadMyXP(address: string): XPUser | null {
  const users = loadUsers()
  return users.find(u => u.address === address) ?? null
}

function saveMyXP(user: XPUser) {
  const users = loadUsers()
  const idx   = users.findIndex(u => u.address === user.address)
  if (idx >= 0) users[idx] = user
  else users.push(user)
  saveUsers(users)
}

export function useXP(address?: string) {
  const [me, setMe] = useState<XPUser | null>(() =>
    address ? loadMyXP(address) : null
  )

  const initUser = useCallback((addr: string, username: string) => {
    const existing = loadMyXP(addr)
    if (existing) { setMe(existing); return existing }
    const newUser: XPUser = {
      address: addr, username,
      xp: 0, level: 1, streak: 0,
      lastCheckIn: null, badges: [], history: [],
    }
    saveMyXP(newUser)
    setMe(newUser)
    return newUser
  }, [])

  const awardXP = useCallback((addr: string, type: XPEventType, label?: string) => {
    const users   = loadUsers()
    let user      = users.find(u => u.address === addr)
    if (!user) return null

    const points  = XP_VALUES[type]
    const event: XPEvent = {
      id: Date.now().toString(),
      type, xp: points,
      label: label ?? type,
      timestamp: new Date().toISOString(),
    }

    user.xp      += points
    user.level    = getLevel(user.xp)
    user.history  = [event, ...user.history].slice(0, 50)

    saveMyXP(user)
    setMe({ ...user })
    return event
  }, [])

  const dailyCheckIn = useCallback((addr: string) => {
    const users  = loadUsers()
    let user     = users.find(u => u.address === addr)
    if (!user) return null

    const today    = new Date().toDateString()
    const lastDate = user.lastCheckIn ? new Date(user.lastCheckIn).toDateString() : null

    if (lastDate === today) return { already: true, xp: 0 }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const wasYesterday = lastDate === yesterday.toDateString()

    user.streak      = wasYesterday ? (user.streak || 0) + 1 : 1
    user.lastCheckIn = new Date().toISOString()

    const events: XPEvent[] = []
    const ci: XPEvent = { id: Date.now().toString(), type:'checkin', xp:5, label:'Daily check-in', timestamp: new Date().toISOString() }
    user.xp += 5
    events.push(ci)

    // Streak bonuses
    if (user.streak >= 7 && user.streak % 7 === 0) {
      user.xp += XP_VALUES.streak_7
      events.push({ id: (Date.now()+1).toString(), type:'streak_7', xp:XP_VALUES.streak_7, label:`${user.streak}-day streak!`, timestamp: new Date().toISOString() })
    } else if (user.streak >= 3 && user.streak % 3 === 0) {
      user.xp += XP_VALUES.streak_3
      events.push({ id: (Date.now()+1).toString(), type:'streak_3', xp:XP_VALUES.streak_3, label:`${user.streak}-day streak!`, timestamp: new Date().toISOString() })
    }

    user.level   = getLevel(user.xp)
    user.history = [...events, ...user.history].slice(0, 50)
    saveMyXP(user)
    setMe({ ...user })

    return { already: false, xp: events.reduce((s,e) => s + e.xp, 0), streak: user.streak }
  }, [])

  const getLeaderboard = useCallback((): XPUser[] => {
    return loadUsers()
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 50)
  }, [])

  const nextLevelXP = (xp: number) => {
    const lvl = getLevel(xp)
    return LEVEL_THRESHOLDS[lvl] ?? null
  }

  return { me, initUser, awardXP, dailyCheckIn, getLeaderboard, nextLevelXP, LEVEL_THRESHOLDS }
}

// Seed mock leaderboard for demo
export function seedMockLeaderboard() {
  const existing = loadUsers()
  if (existing.length >= 5) return
  const mocks: XPUser[] = [
    { address:'0xwhyt...ycon', username:'whytetycon',  xp:8420, level:8, streak:14, lastCheckIn: new Date().toISOString(), badges:['collector','whale','daily_streak'], history:[] },
    { address:'0xsir_...isco', username:'sir_mimisco', xp:6150, level:7, streak:7,  lastCheckIn: new Date().toISOString(), badges:['collector','daily_streak'],         history:[] },
    { address:'0xarct...001',  username:'arcticwhal3', xp:4900, level:6, streak:3,  lastCheckIn: new Date().toISOString(), badges:['collector'],                        history:[] },
    { address:'0xfros...byte', username:'frostbyte',   xp:3300, level:6, streak:5,  lastCheckIn: new Date().toISOString(), badges:['collector'],                        history:[] },
    { address:'0xivry...wave', username:'ivorywave',   xp:2100, level:5, streak:2,  lastCheckIn: new Date().toISOString(), badges:[],                                   history:[] },
    { address:'0xpola...rift', username:'polardrift',  xp:1540, level:5, streak:1,  lastCheckIn: new Date().toISOString(), badges:[],                                   history:[] },
    { address:'0xsilnt...srg', username:'silentwaves', xp:980,  level:4, streak:0,  lastCheckIn: null,                     badges:[],                                   history:[] },
    { address:'0xcoldb...lom', username:'coldbloom',   xp:450,  level:3, streak:0,  lastCheckIn: null,                     badges:[],                                   history:[] },
  ]
  saveUsers([...existing, ...mocks])
}
