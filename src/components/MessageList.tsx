import React from 'react'
import { Message } from './ChatPanel'
import './MessageList.css'

interface MessageListProps {
  messages: Message[]
  isTyping: boolean
}

const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.type}`}>
          <div className="message-avatar">
            {message.type === 'user' ? '👤' : '🤖'}
          </div>
          <div className="message-content">
            <div className="message-header">
              <span className="message-sender">
                {message.type === 'user' ? 'You' : 'AI Assistant'}
              </span>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
            {message.image && (
              <div className="message-image">
                <img src={message.image} alt="Uploaded content" />
              </div>
            )}
            <div className="message-text">{message.content}</div>
            {message.buttons && (
              <div className="message-buttons">
                {message.buttons.map((button) => (
                  <button
                    key={button.id}
                    className="message-button"
                    onClick={(e) => {
                      console.log('🎯 Button clicked:', button.id, button.text)
                      e.preventDefault()
                      e.stopPropagation()
                      if (button.action) {
                        console.log('🎯 Calling button action')
                        button.action()
                      } else {
                        console.log('❌ No button action defined')
                      }
                    }}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="message ai">
          <div className="message-avatar">🤖</div>
          <div className="message-content">
            <div className="message-header">
              <span className="message-sender">AI Assistant</span>
              <span className="message-time">typing...</span>
            </div>
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageList