import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar          from './components/Navbar'
import Footer          from './components/Footer'
import ErrorBoundary   from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import Home             from './pages/Home'
import Marketplace      from './pages/Marketplace'
import Mint             from './pages/Mint'
import NFTDetail        from './pages/NFTDetail'
import Profile          from './pages/Profile'
import AIGenerator      from './pages/AIGenerator'
import ActivityFeed     from './pages/ActivityFeed'
import Collections      from './pages/Collections'
import CreatorDashboard from './pages/CreatorDashboard'
import Watchlist        from './pages/Watchlist'
import BatchMint        from './pages/BatchMint'
import ListNFT          from './pages/ListNFT'
import Leaderboard      from './pages/Leaderboard'
import Auction          from './pages/Auction'
import NotFound         from './pages/NotFound'
import ZkLogin          from './pages/ZkLogin'
import ScrollToTop      from './components/ScrollToTop'

const variants = {
  initial: { opacity:0, y:8 },
  animate: { opacity:1, y:0, transition:{ duration:0.22, ease:[0.22,1,0.36,1] as const } },
  exit:    { opacity:0, y:-6, transition:{ duration:0.14 } },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={variants} initial="initial" animate="animate" exit="exit">
        <ScrollToTop />
        <Routes location={location}>
          <Route path="/"            element={<ErrorBoundary><Home /></ErrorBoundary>} />
          <Route path="/marketplace" element={<ErrorBoundary><Marketplace /></ErrorBoundary>} />
          <Route path="/mint"        element={<ErrorBoundary><Mint /></ErrorBoundary>} />
          <Route path="/mint/batch"  element={<ErrorBoundary><BatchMint /></ErrorBoundary>} />
          <Route path="/mint/ai"     element={<ErrorBoundary><AIGenerator /></ErrorBoundary>} />
          <Route path="/nft/:id"     element={<ErrorBoundary><NFTDetail /></ErrorBoundary>} />
          <Route path="/profile"     element={<ErrorBoundary><Profile /></ErrorBoundary>} />
          <Route path="/list"        element={<ErrorBoundary><ListNFT /></ErrorBoundary>} />
          <Route path="/dashboard"   element={<ErrorBoundary><CreatorDashboard /></ErrorBoundary>} />
          <Route path="/activity"    element={<ErrorBoundary><ActivityFeed /></ErrorBoundary>} />
          <Route path="/collections" element={<ErrorBoundary><Collections /></ErrorBoundary>} />
          <Route path="/watchlist"   element={<ErrorBoundary><Watchlist /></ErrorBoundary>} />
          <Route path="/leaderboard" element={<ErrorBoundary><Leaderboard /></ErrorBoundary>} />
          <Route path="/auction"     element={<ErrorBoundary><Auction /></ErrorBoundary>} />
          <Route path="/zklogin"     element={<ErrorBoundary><ZkLogin /></ErrorBoundary>} />
          <Route path="*"           element={<NotFound />} />
        </Routes>
        <Footer />
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Navbar />
      <AnimatedRoutes />
    </ToastProvider>
  )
}
