import React, { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import './ChatPanel.css'

export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  image?: string
}

const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. I can help you modify the Mario game map. Feel free to ask me to make changes or upload images for reference!',
      timestamp: new Date(),
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string, image?: File) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      image: image ? URL.createObjectURL(image) : undefined,
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(content, !!image),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500 + Math.random() * 1000)
  }

  const generateAIResponse = (userContent: string, hasImage: boolean): string => {
    const responses = [
      "I understand you'd like me to modify the Mario game map. I can help adjust platforms, enemies, or level design elements.",
      "Great idea! I can implement those changes to the game map. Let me work on updating the level structure.",
      "That's an interesting modification request. I'll process the changes to enhance the Mario game experience.",
      "I can see what you're looking for. Let me apply those adjustments to the game map layout.",
      "Perfect! I'll make those modifications to improve the gameplay and map design."
    ]

    if (hasImage) {
      const imageResponses = [
        "I can see the image you uploaded. Based on what I observe, I'll implement similar modifications to the Mario game map.",
        "Thanks for the visual reference! I'll use this image to guide the changes I make to the game level.",
        "Great reference image! I'll incorporate these design elements into the Mario game map.",
        "I've analyzed your uploaded image and will apply similar concepts to modify the game map accordingly."
      ]
      return imageResponses[Math.floor(Math.random() * imageResponses.length)]
    }

    return responses[Math.floor(Math.random() * responses.length)]
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <h3>🤖 AI Map Assistant</h3>
          <span className="chat-status">Online</span>
        </div>
        <div className="chat-info">
          <span className="message-count">{messages.length} messages</span>
        </div>
      </div>

      <div className="chat-messages">
        <MessageList messages={messages} isTyping={isTyping} />
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  )
}

export default ChatPanel