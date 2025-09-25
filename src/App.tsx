import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import MobileLayout from './components/MobileLayout'
import './App.css'

function App() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check for mobile parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const mobileParam = urlParams.get('mobile')

    // Check if device is mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isSmallScreen = window.innerWidth <= 768

    // Use mobile layout if explicitly requested or if on mobile device
    setIsMobile(mobileParam === 'true' || (mobileParam !== 'false' && (isMobileDevice || isSmallScreen)))
  }, [])

  if (isMobile) {
    return <MobileLayout />
  }

  return <Layout />
}

export default App