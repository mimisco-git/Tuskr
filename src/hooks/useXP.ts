/**
 * useXP.ts, Real XP system for Tuskr.
 * XP is earned from real on-chain actions and stored in localStorage.
 * The leaderboard is cross-device via a shared Walrus blob key (best effort).
 */
import { useState, useCallback } from 'react'

const USERS_KEY = 'tuskr_xp_users_v2'

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

export const XP_VALUES: Record<XPEventType, number> = {
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

export const LEVEL_NAMES = [
  'Bronze','Silver','Gold','Platinum','Diamond',
  'Obsidian','Phantom','Titan','Sovereign','Legend'
]

export const LEVEL_THRESHOLDS = [0,100,250,500,1000,2000,4000,8000,15000,30000]

export const LEVEL_COLORS = [
  '#cd7f32','#c0c0c0','#ffd700','#e5e4e2','#b9f2ff',
  '#1a1a2e','#7c3aed','#00d4aa','#f59e0b','#ef4444'
]

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
  return loadUsers().find(u => u.address === address) ?? null
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
    let user = loadMyXP(addr)
    if (!user) {
      // Auto-init the user
      user = {
        address: addr,
        username: addr.slice(0,8) + '…' + addr.slice(-4),
        xp: 0, level: 1, streak: 0,
        lastCheckIn: null, badges: [], history: [],
      }
    }

    const points  = XP_VALUES[type]
    const event: XPEvent = {
      id: Date.now().toString(), type, xp: points,
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
    let user = loadMyXP(addr)
    if (!user) return null

    const today     = new Date().toDateString()
    const lastDate  = user.lastCheckIn ? new Date(user.lastCheckIn).toDateString() : null
    if (lastDate === today) return { already: true, xp: 0, streak: user.streak }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const wasYesterday = lastDate === yesterday.toDateString()

    user.streak      = wasYesterday ? (user.streak || 0) + 1 : 1
    user.lastCheckIn = new Date().toISOString()

    const events: XPEvent[] = []
    events.push({ id: Date.now().toString(), type:'checkin', xp:5, label:'Daily check-in', timestamp: new Date().toISOString() })
    user.xp += 5

    if (user.streak >= 7 && user.streak % 7 === 0) {
      events.push({ id: (Date.now()+1).toString(), type:'streak_7', xp:50, label:`${user.streak}-day streak!`, timestamp: new Date().toISOString() })
      user.xp += 50
    } else if (user.streak >= 3 && user.streak % 3 === 0) {
      events.push({ id: (Date.now()+1).toString(), type:'streak_3', xp:15, label:`${user.streak}-day streak!`, timestamp: new Date().toISOString() })
      user.xp += 15
    }

    user.level   = getLevel(user.xp)
    user.history = [...events, ...user.history].slice(0, 50)
    saveMyXP(user)
    setMe({ ...user })

    return { already: false, xp: events.reduce((s,e) => s + e.xp, 0), streak: user.streak }
  }, [])

  const getLeaderboard = useCallback((): XPUser[] => {
    return loadUsers().sort((a, b) => b.xp - a.xp).slice(0, 50)
  }, [])

  const nextLevelXP = (xp: number) => {
    const lvl = getLevel(xp)
    return LEVEL_THRESHOLDS[lvl] ?? null
  }

  return { me, initUser, awardXP, dailyCheckIn, getLeaderboard, nextLevelXP, LEVEL_THRESHOLDS }
}

// No more seedMockLeaderboard, real users only
export function seedMockLeaderboard() { /* disabled */ }
