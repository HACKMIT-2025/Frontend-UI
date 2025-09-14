import React, { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import MapUploadModal from './MapUploadModal'
import chatAPI from '../services/api'
import mapProcessing from '../services/mapProcessing'
import './ChatPanel.css'

export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  image?: string
}

interface ChatPanelProps {
  onLevelGenerated?: (dataUrl: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onLevelGenerated }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '🎮 Welcome to Mario Map Creator!\n\nI\'m your AI assistant, and I\'ll help you bring your hand-drawn Mario levels to life!\n\n**Let\'s get started:**\nPlease upload a photo of your hand-drawn map. Remember:\n• Draw a **triangle (▲)** for the start point\n• Draw a **circle (●)** for the end point\n• Draw **rectangles or other shapes** for platforms\n\nClick the button below to upload your map! 👇',
      timestamp: new Date(),
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [showMapUpload, setShowMapUpload] = useState(true)
  const [isProcessingMap, setIsProcessingMap] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string, image?: File) => {
    let imageBase64: string | undefined = undefined

    // Convert image to base64 if provided
    if (image) {
      const reader = new FileReader()
      imageBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(image)
      })
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      image: image ? URL.createObjectURL(image) : undefined,
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      // Prepare conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }))

      let aiResponse: string

      // Check if API keys are configured
      const apiStatus = chatAPI.isConfigured()

      if (!apiStatus.ready) {
        aiResponse = "Please configure your API keys in the .env file. You need VITE_OPENROUTER_API_KEY for text chat and VITE_ANTHROPIC_API_KEY for image recognition."
      } else if (imageBase64 && apiStatus.anthropic) {
        // Use Anthropic for image recognition
        aiResponse = await chatAPI.sendImageMessage(content, imageBase64, conversationHistory)
      } else if (!imageBase64 && apiStatus.openRouter) {
        // Use Cerebras Llama 70B via OpenRouter for text
        aiResponse = await chatAPI.sendTextMessage(content, conversationHistory)
      } else if (imageBase64 && !apiStatus.anthropic) {
        aiResponse = "Image recognition requires Anthropic API key. Please add VITE_ANTHROPIC_API_KEY to your .env file."
      } else {
        aiResponse = "Text chat requires OpenRouter API key. Please add VITE_OPENROUTER_API_KEY to your .env file."
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get AI response. Please check your API keys and try again.'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }


  const handleMapUpload = async (file: File) => {
    setIsProcessingMap(true)

    // Add user message with image
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: 'Here\'s my hand-drawn map!',
      timestamp: new Date(),
      image: URL.createObjectURL(file)
    }
    setMessages(prev => [...prev, userMessage])

    // Process the map
    const result = await mapProcessing.processMap(file, (step: string, message: string) => {
      console.log(`Processing step: ${step} - ${message}`)
    })

    setIsProcessingMap(false)
    setShowMapUpload(false)

    if (result.success) {
      // Call the callback to load the level in the game panel using embed_url
      if (result.embed_url && onLevelGenerated) {
        console.log('📤 API returned embed_url:', result.embed_url)
        console.log('📄 API returned data_url:', result.data_url)
        console.log('🆔 API returned level_id:', result.level_id)
        onLevelGenerated(result.embed_url)
      }

      // Add success message with shape detection details and JSON URL
      let shapeDetails = '';
      if (result.levelData?.level_data) {
        const data = result.levelData.level_data;
        shapeDetails = `\n🔍 **Shape Detection Results:**\n• 🔺 **Triangles (Start Points):** ${data.starting_points?.length || 0} detected\n• ⭕ **Circles (End Points):** ${data.end_points?.length || 0} detected\n• 🧱 **Walls/Platforms:** ${data.rigid_bodies?.length || 0} detected\n• 📐 **Image Size:** ${data.image_size?.[0] || 0}x${data.image_size?.[1] || 0} pixels\n`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `✅ **新地图创建成功！** \nLevel ID: \`${result.level_id}\`${shapeDetails}\n\n🎯 **你的手绘地图已加载到左侧游戏中！**\n\n📄 **JSON Data URL:**\n\`\`\`\n${result.data_url}\n\`\`\`\n\n🎮 **其他链接:**\n• [🎮 独立游戏页面](${result.game_url})\n• [📱 嵌入版本](${result.embed_url})\n\n现在可以在左侧游戏窗口中玩你的自定义关卡了！`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])

      // Add follow-up message
      setTimeout(() => {
        const followUpMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: '🎮 **你的新地图已经在左侧游戏中激活！**\n\n现在你可以:\n• 使用方向键和空格键玩你的自定义关卡\n• 要求我修改地图的任何部分\n• 随时上传新的手绘地图\n\n游戏中显示的是你刚刚上传的手绘地图，而不是默认关卡。试试看吧！',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, followUpMessage])
      }, 1000)
    } else {
      // Add detailed error message
      let errorAdvice = '';
      if (result.error?.includes('timeout')) {
        errorAdvice = '\n\n💡 **Suggestion:** Your image might be too large or complex. Try:\n• Using a smaller image (under 5MB)\n• Simplifying your drawing\n• Ensuring good lighting and contrast';
      } else if (result.error?.includes('not accessible')) {
        errorAdvice = '\n\n💡 **Suggestion:** The level was created but the data couldn\'t be validated. Please try uploading again.';
      } else if (result.error?.includes('failed')) {
        errorAdvice = '\n\n💡 **Suggestion:** Make sure your drawing has:\n• Clear, dark lines\n• A triangle (▲) for the start\n• A circle (●) for the end\n• Rectangles/shapes for platforms';
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ **Processing Failed**\n\n${result.error}${errorAdvice}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // Add upload button to initial message
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1') {
      // Initial state - show upload prompt
      const uploadButton = document.createElement('button')
      uploadButton.className = 'upload-map-button'
      uploadButton.innerHTML = '📤 Upload Your Map'
      uploadButton.onclick = () => setShowMapUpload(true)
    }
  }, [])

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
        {messages.length === 1 && (
          <div className="upload-prompt">
            <button
              className="upload-map-button"
              onClick={() => setShowMapUpload(true)}
            >
              <span className="button-icon">📤</span>
              <span>Upload Your Hand-Drawn Map</span>
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>

      <MapUploadModal
        isOpen={showMapUpload}
        onClose={() => setShowMapUpload(false)}
        onUpload={handleMapUpload}
        isProcessing={isProcessingMap}
      />
    </div>
  )
}

export default ChatPanel