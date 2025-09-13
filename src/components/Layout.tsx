import React from 'react'
import GamePanel from './GamePanel'
import ChatPanel from './ChatPanel'
import './Layout.css'

const Layout: React.FC = () => {
  return (
    <div className="layout">
      <div className="game-section">
        <GamePanel />
      </div>
      <div className="divider"></div>
      <div className="chat-section">
        <ChatPanel />
      </div>
    </div>
  )
}

export default Layout