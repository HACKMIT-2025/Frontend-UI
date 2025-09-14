import React, { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import MapUploadModal from './MapUploadModal'
import AICodeGeneratorLoader from './AICodeGeneratorLoader'
import chatAPI from '../services/api'
import mapProcessing from '../services/mapProcessing'
import databaseService from '../services/database'
import './ChatPanel.css'

export interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  image?: string
  component?: 'publish-options'
  componentProps?: any
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
  const [currentLevelData, setCurrentLevelData] = useState<{ jsonUrl: string, embedUrl: string, gameUrl: string, levelId: string } | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
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

  const handlePublish = async (shouldPublish: boolean, metadata?: { title: string; description: string }) => {
    if (!shouldPublish || !currentLevelData) {
      // Remove the publish options message
      setMessages(prev => prev.filter(msg => msg.component !== 'publish-options'))

      if (!shouldPublish) {
        // Add decline message
        const declineMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: '👍 **No problem!** Your level remains private and you can still play it locally. You can always publish it later by uploading a new map!',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, declineMessage])
      }
      return
    }

    setIsPublishing(true)

    // Update the publish options to show publishing state
    setMessages(prev => prev.map(msg =>
      msg.component === 'publish-options'
        ? { ...msg, componentProps: { ...msg.componentProps, isPublishing: true } }
        : msg
    ))

    try {
      const publishResult = await databaseService.publishMap({
        level_id: currentLevelData.levelId,
        json_url: currentLevelData.jsonUrl,
        embed_url: currentLevelData.embedUrl,
        game_url: currentLevelData.gameUrl,
        title: metadata?.title,
        description: metadata?.description
      })

      // Remove publish options message
      setMessages(prev => prev.filter(msg => msg.component !== 'publish-options'))

      if (publishResult.success) {
        const successMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `🎉 **Level Published Successfully!**\n\nYour Mario level is now live and discoverable by other players!\n\n🌐 **Public Details:**\n• **Title:** ${metadata?.title || `Mario Level ${currentLevelData.levelId}`}\n• **Description:** ${metadata?.description || 'Hand-drawn Mario level created with AI'}\n• **Level ID:** \`${currentLevelData.levelId}\`\n• **Database ID:** \`${publishResult.mapId}\`\n\n🎮 **Share Links:**\n• [🎮 Play Online](${currentLevelData.gameUrl})\n• [📱 Embedded Version](${currentLevelData.embedUrl})\n\n🏆 Your level is now part of the community gallery! Others can discover and play your creation.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `❌ **Publishing Failed**\n\n${publishResult.error}\n\n💡 **Don't worry!** Your level is still playable locally. You can try publishing again later.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      // Remove publish options message
      setMessages(prev => prev.filter(msg => msg.component !== 'publish-options'))

      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `❌ **Publishing Error**\n\nSomething went wrong during publishing. Please try again later.\n\n💡 Your level is still playable locally!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsPublishing(false)
      setCurrentLevelData(null)
    }
  }

  const handleAILoaderComplete = () => {
    const result = (window as any).mapProcessingResult

    setShowAILoader(false)
    setIsProcessingMap(false)
    setShowMapUpload(false)

    if (result.success) {
      // Store level data for publishing
      setCurrentLevelData({
        jsonUrl: result.data_url,
        embedUrl: result.embed_url,
        gameUrl: result.game_url,
        levelId: result.level_id
      })

      // Call the callback to load the level in the game panel using JSON data URL
      if (result.data_url && onLevelGenerated) {
        console.log('📤 API returned embed_url:', result.embed_url)
        console.log('📄 API returned data_url:', result.data_url)
        console.log('🆔 API returned level_id:', result.level_id)
        // Pass the JSON URL for native game loading
        onLevelGenerated({
          jsonUrl: result.data_url,
          embedUrl: result.embed_url,
          levelId: result.level_id
        })
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
        content: `✅ **New Map Created Successfully!** \nLevel ID: \`${result.level_id}\`${shapeDetails}\n\n🎯 **Your hand-drawn map has been loaded into the game on the left!**\n\n📄 **JSON Data URL:**\n\`\`\`\n${result.data_url}\n\`\`\`\n\n🎮 **Additional Links:**\n• [🎮 Standalone Game Page](${result.game_url})\n• [📱 Embedded Version](${result.embed_url})\n\nYou can now play your custom level in the game window on the left!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])

      // Add publish options if database is configured
      if (databaseService.isConfigured()) {
        setTimeout(() => {
          const publishMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'system',
            content: '',
            timestamp: new Date(),
            component: 'publish-options',
            componentProps: {
              levelId: result.level_id,
              jsonUrl: result.data_url,
              embedUrl: result.embed_url,
              gameUrl: result.game_url,
              onPublish: handlePublish,
              isPublishing: isPublishing
            }
          }
          setMessages(prev => [...prev, publishMessage])
        }, 1000)
      }

      // Add follow-up message
      setTimeout(() => {
        const followUpMessage: Message = {
          id: (Date.now() + 3).toString(),
          type: 'ai',
          content: '🎮 **Your new map is now active in the game on the left!**\n\nNow you can:\n• Use arrow keys and spacebar to play your custom level\n• Ask me to modify any part of the map\n• Upload new hand-drawn maps anytime\n\nThe game now displays your uploaded hand-drawn map, not the default level. Give it a try!',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, followUpMessage])
      }, databaseService.isConfigured() ? 2000 : 1000)
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