import React, { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import MapUploadModal from './MapUploadModal'
import AICodeGeneratorLoader from './AICodeGeneratorLoader'
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
  onLevelGenerated?: (levelData: { jsonUrl?: string, embedUrl?: string, levelId?: string }) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onLevelGenerated }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '🎮 Welcome to Mario Map Creator!\n\nI\'m your AI assistant, and I\'ll help you bring your hand-drawn Mario levels to life!\n\n**Drawing Guide:**\n⬡ **Hexagon** = Start Point\n✕ **Cross/X** = End Point  \n▲ **Triangle** = Spikes/Hazards\n● **Circle** = Coins/Collectibles\n■ **Other Shapes** = Platforms/Walls\n\n**Let\'s get started:**\nUpload a photo of your hand-drawn map following the guide above!\n\nClick the button below to upload your map! 👇',
      timestamp: new Date(),
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [showMapUpload, setShowMapUpload] = useState(true)
  const [isProcessingMap, setIsProcessingMap] = useState(false)
  const [showAILoader, setShowAILoader] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
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
    setUploadedFileName(file.name)
    setShowAILoader(true)

    // Add user message with image
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: 'Here\'s my hand-drawn map!',
      timestamp: new Date(),
      image: URL.createObjectURL(file)
    }
    setMessages(prev => [...prev, userMessage])

    // Start both: AI loader animation AND actual processing
    const [result] = await Promise.all([
      mapProcessing.processMap(file, (step: string, message: string) => {
        console.log(`Processing step: ${step} - ${message}`)
      }),
      // Just wait for AI loader to complete (3-5s)
      new Promise(resolve => setTimeout(resolve, 1)) // Immediate resolve, let AI loader control timing
    ])

    // Store result for when AI loader completes
    ;(window as any).mapProcessingResult = result
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)

      const successMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `✅ **${type} URL copied to clipboard!**\n\nYou can now share the link with your friends to let them play your custom Mario level!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, successMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `❌ **Copy failed**\n\nPlease manually copy the following link:\n\`\`\`\n${text}\n\`\`\``,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleAILoaderComplete = () => {
    const result = (window as any).mapProcessingResult

    setShowAILoader(false)
    setIsProcessingMap(false)
    setShowMapUpload(false)

    if (result.success) {
      // Construct correct URL format
      const correctGameUrl = `https://frontend-mario.vercel.app/play?json=${encodeURIComponent(result.data_url)}`
      const correctEmbedUrl = `https://frontend-mario.vercel.app/embed?json=${encodeURIComponent(result.data_url)}`

      // Call the callback to load the level in the game panel using JSON data URL
      if (result.data_url && onLevelGenerated) {
        console.log('📤 API returned embed_url:', result.embed_url)
        console.log('📄 API returned data_url:', result.data_url)
        console.log('🆔 API returned level_id:', result.level_id)
        console.log('🔧 Corrected game_url:', correctGameUrl)
        console.log('🔧 Corrected embed_url:', correctEmbedUrl)
        // Pass the JSON URL for native game loading
        onLevelGenerated({
          jsonUrl: result.data_url,
          embedUrl: correctEmbedUrl,
          levelId: result.level_id
        })
      }

      // Add success message with shape detection details and share buttons
      let shapeDetails = '';
      if (result.levelData?.level_data) {
        const data = result.levelData.level_data;
        shapeDetails = `\n🔍 **Shape Detection Results:**\n• ⬡ **Hexagons (Start Points):** ${data.starting_points?.length || 0} detected\n• ✕ **Crosses (End Points):** ${data.end_points?.length || 0} detected\n• ▲ **Triangles (Spikes):** ${data.spikes?.length || 0} detected\n• ● **Circles (Coins):** ${data.coins?.length || 0} detected\n• ■ **Other Shapes (Platforms):** ${data.rigid_bodies?.length || 0} detected\n• 📐 **Image Size:** ${data.image_size?.[0] || 0}x${data.image_size?.[1] || 0} pixels\n`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `✅ **New Map Created Successfully!** \nLevel ID: \`${result.level_id}\`${shapeDetails}\n\n🎯 **Your hand-drawn map has been loaded into the game on the left!**\n\n🎮 **Share Your Level:**\n• [🎮 Play Game](${correctGameUrl}) - Full game version\n• [📱 Embed Version](${correctEmbedUrl}) - Embeddable version\n\nYou can now play your custom level in the game window on the left!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])

      // Automatically copy the game URL and show share options
      setTimeout(() => {
        copyToClipboard(correctGameUrl, 'Game Share')
      }, 1000)

      // Add follow-up message with copy buttons
      setTimeout(() => {
        const shareMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: `🔗 **Share Your Level!**\n\nThe game link has been automatically copied to your clipboard. You can now:\n• Paste and share with friends\n• Post on social media\n• Save to your bookmarks\n\nClick the buttons below to copy the links again:\n\n**🎮 [Click to copy game link](${correctGameUrl})**\n**📱 [Click to copy embed link](${correctEmbedUrl})**`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, shareMessage])
      }, 2000)

      // Add gameplay instructions
      setTimeout(() => {
        const followUpMessage: Message = {
          id: (Date.now() + 3).toString(),
          type: 'ai',
          content: '🎮 **Your new map is now active in the game on the left!**\n\nNow you can:\n• Use arrow keys and spacebar to play your custom level\n• Ask me to modify any part of the map\n• Upload new hand-drawn maps anytime\n\nThe game now displays your uploaded hand-drawn map, not the default level. Give it a try!',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, followUpMessage])
      }, 3000)
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

      <AICodeGeneratorLoader
        isVisible={showAILoader}
        onComplete={handleAILoaderComplete}
        uploadedFileName={uploadedFileName}
      />
    </div>
  )
}

export default ChatPanel