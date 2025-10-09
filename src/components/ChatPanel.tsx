import React, { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import MapUploadModal from './MapUploadModal'
import AICodeGeneratorLoader from './AICodeGeneratorLoader'
import chatAPI, { gameAPI } from '../services/api'
import mapProcessing from '../services/mapProcessing'
import './ChatPanel.css'

export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  image?: string
  buttons?: { id: string; text: string; action: () => void }[]
}

interface ChatPanelProps {
  onLevelGenerated?: (levelData: { jsonUrl?: string, embedUrl?: string, levelId?: string }) => void;
  onLevelPackGenerated?: (packData: { packId: number, levelIds: number[] }) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onLevelGenerated, onLevelPackGenerated }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '🎮 Welcome to Mario Map Creator!\n\nI\'m your AI assistant, and I\'ll help you bring your hand-drawn Mario levels to life!\n\n**Let\'s get started:**\nUpload a photo of your hand-drawn map!\n\nClick the button below to upload your map! 👇',
      timestamp: new Date(),
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [showMapUpload, setShowMapUpload] = useState(true)
  const [isProcessingMap, setIsProcessingMap] = useState(false)
  const [showAILoader, setShowAILoader] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [waitingForPublicName, setWaitingForPublicName] = useState(false)
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null)
  const [currentPackId, setCurrentPackId] = useState<number | null>(null)
  const [currentLevelIds, setCurrentLevelIds] = useState<number[]>([])
  const [waitingForPackPublicName, setWaitingForPackPublicName] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string, images?: File[]) => {
    // Handle special cases first
    if (waitingForPublicName && content.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      // Handle public name submission
      setWaitingForPublicName(false)
      await handlePublicSharingResponse(true, content.trim())
      return
    }

    // Handle pack public name input
    if (waitingForPackPublicName && content.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      // Handle pack public name submission
      setWaitingForPackPublicName(false)
      if (currentPackId && currentLevelIds.length > 0) {
        await handlePackPublicSharingResponse(true, content.trim(), currentPackId, currentLevelIds)
      }
      return
    }

    // Handle multiple images - trigger level pack creation
    if (images && images.length > 1) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `Uploaded ${images.length} maps to create a level pack`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      // Process multiple maps
      await handleMultipleMapUpload(images)
      return
    }

    // Handle single image
    let imageBase64: string | undefined = undefined

    // Convert image to base64 if provided
    if (images && images.length === 1) {
      const reader = new FileReader()
      imageBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(images[0])
      })
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      image: images && images.length === 1 ? URL.createObjectURL(images[0]) : undefined,
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
      const apiStatus = await chatAPI.isConfigured()

      if (!apiStatus.ready) {
        aiResponse = "Backend API is not available. Please check the backend server status."
      } else if (imageBase64 && apiStatus.anthropic) {
        // Use Anthropic for image recognition
        aiResponse = await chatAPI.sendImageMessage(content, imageBase64, conversationHistory)
      } else if (!imageBase64 && apiStatus.openRouter) {
        // Use Cerebras Llama 70B via OpenRouter for text
        aiResponse = await chatAPI.sendTextMessage(content, conversationHistory)
      } else if (imageBase64 && !apiStatus.anthropic) {
        aiResponse = "Image recognition is currently unavailable. Please try text chat instead."
      } else {
        aiResponse = "Text chat is currently unavailable. Please try again later."
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


  // Handle multiple map upload for level pack creation
  const handleMultipleMapUpload = async (files: File[]) => {
    const levelIds: number[] = []
    const totalFiles = files.length

    try {
      setShowAILoader(true)
      setIsProcessingMap(true)

      // Show initial progress message
      const startMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `🚀 **Processing ${totalFiles} maps in parallel...**\n\nThis will be much faster than processing one by one!`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, startMessage])

      // Process all files in parallel for faster upload
      const results = await Promise.all(
        files.map(async (file, i) => {
          console.log(`🚀 Starting parallel processing for map ${i + 1}: ${file.name}`)

          try {
            const result = await mapProcessing.processMap(file, (step: string, message: string) => {
              console.log(`Map ${i + 1}: ${step} - ${message}`)
            })

            if (result.success && result.level_id) {
              console.log(`✅ Map ${i + 1} processed successfully. Level ID: ${result.level_id}`)
              return { success: true, level_id: result.level_id, index: i, filename: file.name }
            } else {
              throw new Error(`Processing failed for ${file.name}`)
            }
          } catch (error) {
            console.error(`❌ Map ${i + 1} failed:`, error)
            return { success: false, index: i, filename: file.name, error }
          }
        })
      )

      // Check for any failures
      const failures = results.filter(r => !r.success)
      if (failures.length > 0) {
        throw new Error(`Failed to process ${failures.length} map(s): ${failures.map(f => f.filename).join(', ')}`)
      }

      // Extract level IDs in order
      results.forEach(result => {
        if (result.success && result.level_id) {
          levelIds.push(Number(result.level_id))
        }
      })

      // All maps processed, create level pack
      const packName = `Level Pack - ${new Date().toLocaleDateString()}`
      const packResult = await gameAPI.createLevelPack({
        name: packName,
        description: `Created from ${totalFiles} hand-drawn maps`,
        level_ids: levelIds,
        created_by: 'user',
        is_public: false
      })

      console.log('✅ Level pack created:', packResult)

      // Store pack ID and level IDs for public sharing
      setCurrentPackId(packResult.pack_id)
      setCurrentLevelIds(levelIds)

      // 🎮 Immediately load the game (default private)
      console.log('🎮 Loading level pack in game panel...')
      console.log('🔍 onLevelPackGenerated callback exists:', !!onLevelPackGenerated)
      console.log('🔍 Pack data to load:', { packId: packResult.pack_id, levelIds })

      if (onLevelPackGenerated) {
        console.log('✅ Calling onLevelPackGenerated...')
        onLevelPackGenerated({
          packId: packResult.pack_id,
          levelIds: levelIds
        })
        console.log('✅ onLevelPackGenerated called successfully')
      } else {
        console.error('❌ onLevelPackGenerated callback is not defined!')
      }

      // Success message
      const successMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `🎉 **Level Pack Created Successfully!**\n\nYour ${totalFiles}-level pack has been created and loaded in the game!\n\nPack ID: \`${packResult.pack_id}\`\n\n✨ Play through each level in sequence. Complete one to unlock the next!`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, successMessage])

      // Ask about public sharing (similar to single level)
      setTimeout(() => {
        const publicSharingMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `🌟 **Share with the Community?**\n\nWould you like to share your level pack publicly with the community?\n\nYou can always change this setting later.`,
          timestamp: new Date(),
          buttons: [
            {
              id: 'share-pack-public',
              text: '🌍 Share Publicly',
              action: () => {
                console.log('🔵 Share Pack Publicly button clicked')
                console.log('🔵 Current pack ID:', packResult.pack_id)
                handlePackPublicSharingResponse(true, undefined, packResult.pack_id, levelIds)
              }
            },
            {
              id: 'keep-pack-private',
              text: '🔒 Keep Private',
              action: () => {
                console.log('🔴 Keep Pack Private button clicked')
                console.log('🔴 Current pack ID:', packResult.pack_id)
                handlePackPublicSharingResponse(false, undefined, packResult.pack_id, levelIds)
              }
            }
          ]
        }
        setMessages(prev => [...prev, publicSharingMessage])
      }, 1000)

    } catch (error) {
      console.error('Error processing multiple maps:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `❌ **Error:** ${error instanceof Error ? error.message : 'Failed to create level pack'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setShowAILoader(false)
      setIsProcessingMap(false)
    }
  }

  const handleMapUpload = async (file: File | File[]) => {
    // Handle multiple files
    if (Array.isArray(file)) {
      await handleMultipleMapUpload(file)
      return
    }

    // Handle single file (existing logic)
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

    try {
      // Start processing and store result when done
      const result = await mapProcessing.processMap(file, (step: string, message: string) => {
        console.log(`Processing step: ${step} - ${message}`)
      })

      // Store result for when AI loader completes
      ;(window as any).mapProcessingResult = result
      ;(window as any).processingComplete = true
    } catch (error) {
      console.error('Map processing failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      ;(window as any).mapProcessingResult = { success: false, error: errorMessage }
      ;(window as any).processingComplete = true
    }
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

  const reloadGameWithCurrentLevel = () => {
    console.log('🔄 Reloading game with current level:', currentLevelId)
    if (currentLevelId && onLevelGenerated) {
      const correctEmbedUrl = `https://frontend-mario.vercel.app/embed?id=${currentLevelId}`;
      onLevelGenerated({
        levelId: currentLevelId,
        jsonUrl: correctEmbedUrl,
        embedUrl: correctEmbedUrl
      })
      console.log('✅ Game reloaded with level ID:', currentLevelId)
    }
  }

  const handlePublicSharingResponse = async (wantsToShare: boolean, publicName?: string) => {
    console.log('🎯 handlePublicSharingResponse called with:', { wantsToShare, publicName, currentLevelId })
    console.log('🎯 Window mapProcessingResult:', (window as any).mapProcessingResult)

    // Try to get level ID from multiple sources
    const mapResult = (window as any).mapProcessingResult
    const levelId = currentLevelId || mapResult?.level_id

    console.log('🔍 Level ID sources:', { currentLevelId, resultLevelId: mapResult?.level_id, finalLevelId: levelId })

    if (!levelId) {
      console.log('❌ No level ID found, showing error message to user')

      // Show error message to user
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `❌ **Error: Level ID not found**\n\nSorry, there was an issue with your map. Please try uploading again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }


    // Show confirmation message first
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: wantsToShare
        ? `🌍 **Great choice!** You want to share your map publicly.`
        : `🔒 **Understood!** You want to keep your map private.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, confirmationMessage])

    if (wantsToShare) {
      // Ask for public name
      if (!publicName) {
        setWaitingForPublicName(true)
        const namePromptMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `🌟 **Let's make your map public!**\n\nPlease enter a name for your public map:\n\n(This name will be visible to other players in the community)`,
          timestamp: new Date()
        }
        setTimeout(() => {
          setMessages(prev => [...prev, namePromptMessage])
        }, 500)
        return
      }

      // Submit the public sharing request
      try {
        const response = await fetch(`https://25hackmit--hackmit25-backend.modal.run/api/db/level/${levelId}/set-public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_public: true,
            public_name: publicName
          })
        })

        if (response.ok) {
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: `🎉 **Map Shared Successfully!**\n\nYour map "${publicName}" is now public and visible in the community!\n\n🌍 Other players can now discover and play your level.\n\n✨ You can change this setting anytime from your map settings.`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, successMessage])

          // Reload the game with updated map
          setTimeout(() => {
            reloadGameWithCurrentLevel()
          }, 1000)
        } else {
          throw new Error('Failed to make map public')
        }
      } catch (error) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `❌ **Failed to share map publicly**\n\nThere was an error making your map public. You can try again later.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } else {
      // User chose to keep it private
      const privateMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `🔒 **Map Kept Private**\n\nYour map will remain private and only accessible to you.\n\n💡 **Tip:** You can always make it public later from your map settings!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, privateMessage])

      // Reload the game with current level
      setTimeout(() => {
        reloadGameWithCurrentLevel()
      }, 1000)
    }

    // Continue with the share links
    const shareResult = (window as any).mapProcessingResult
    if (shareResult?.level_id) {
      const correctGameUrl = `https://frontend-mario.vercel.app/play?id=${shareResult.level_id}`;

      setTimeout(() => {
        copyToClipboard(correctGameUrl, 'Game Share')
      }, 1000)

      setTimeout(() => {
        const shareMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: `🔗 **Share Your Level!**\n\nThe game link has been automatically copied to your clipboard. You can now:\n• Paste and share with friends\n• Post on social media\n• Save to your bookmarks\n\nClick the button below to copy the link again:\n\n**🎮 [Click to copy share link](${correctGameUrl})**`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, shareMessage])
      }, 2000)

      setTimeout(() => {
        const followUpMessage: Message = {
          id: (Date.now() + 3).toString(),
          type: 'ai',
          content: '🎮 **Your new map is now active in the game on the left!**\n\nNow you can:\n• Use arrow keys and spacebar to play your custom level\n• Ask me to modify any part of the map\n• Upload new hand-drawn maps anytime\n\nThe game now displays your uploaded hand-drawn map, not the default level. Give it a try!',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, followUpMessage])
      }, 3000)
    }
  }

  const handlePackPublicSharingResponse = async (wantsToShare: boolean, publicName: string | undefined, packId: number, levelIds: number[]) => {
    console.log('🎯 handlePackPublicSharingResponse called with:', { wantsToShare, publicName, packId, levelIds })

    // Show confirmation message first
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: wantsToShare
        ? `🌍 **Great choice!** You want to share your level pack publicly.`
        : `🔒 **Understood!** You want to keep your level pack private.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, confirmationMessage])

    if (wantsToShare) {
      // Ask for public name
      if (!publicName) {
        setWaitingForPackPublicName(true)
        const namePromptMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `🌟 **Let's make your level pack public!**\n\nPlease enter a name for your public level pack:\n\n(This name will be visible to other players in the community)`,
          timestamp: new Date()
        }
        setTimeout(() => {
          setMessages(prev => [...prev, namePromptMessage])
        }, 500)
        return
      }

      // Submit the public sharing request for pack
      try {
        const response = await fetch(`https://25hackmit--hackmit25-backend.modal.run/api/game/level-packs/${packId}/set-public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_public: true,
            public_name: publicName
          })
        })

        if (response.ok) {
          const successMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: `🎉 **Level Pack Shared Successfully!**\n\nYour level pack "${publicName}" is now public and visible in the community!\n\n🌍 Other players can now discover and play your levels.\n\n✨ You can change this setting anytime from your pack settings.`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, successMessage])
        } else {
          throw new Error('Failed to make level pack public')
        }
      } catch (error) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `❌ **Failed to share level pack publicly**\n\nThere was an error making your level pack public. You can try again later.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } else {
      // User chose to keep it private
      const privateMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `🔒 **Level Pack Kept Private**\n\nYour level pack will remain private and only accessible to you.\n\n💡 **Tip:** You can always make it public later from your pack settings!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, privateMessage])
    }

    // Generate and share pack link (fix: use packId parameter instead of pack)
    const correctPackUrl = `https://frontend-mario.vercel.app/play?packId=${packId}`;

    setTimeout(() => {
      copyToClipboard(correctPackUrl, 'Level Pack Share')
    }, 1000)

    setTimeout(() => {
      const shareMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: `🔗 **Share Your Level Pack!**\n\nThe level pack link has been automatically copied to your clipboard. You can now:\n• Paste and share with friends\n• Post on social media\n• Save to your bookmarks\n\nClick the button below to copy the link again:\n\n**🎮 [Click to copy share link](${correctPackUrl})**`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, shareMessage])
    }, 2000)

    // Note: Game already loaded when pack was created, no need to reload here
  }

  const handleAILoaderComplete = () => {
    const loaderResult = (window as any).mapProcessingResult

    setShowAILoader(false)
    setIsProcessingMap(false)
    setShowMapUpload(false)

    console.log('🔍 HandleAILoaderComplete - result:', loaderResult)
    console.log('🔍 result?.success:', loaderResult?.success)
    console.log('🔍 result.level_id:', loaderResult.level_id)
    console.log('🔍 Condition check:', loaderResult?.success && loaderResult.level_id)

    if (loaderResult?.success && loaderResult.level_id) {
      // Generate URLs using ID mode
      const correctGameUrl = `https://frontend-mario.vercel.app/play?id=${loaderResult.level_id}`;
      const correctEmbedUrl = `https://frontend-mario.vercel.app/embed?id=${loaderResult.level_id}`;

      console.log('🆔 API returned level_id:', loaderResult.level_id)
      console.log('🔧 Game URL (ID mode):', correctGameUrl)
      console.log('🔧 Embed URL (ID mode):', correctEmbedUrl)

      // Pass the level ID for direct ID-based game loading
      if (onLevelGenerated) {
        console.log('🎮 Calling onLevelGenerated with:', {
          levelId: loaderResult.level_id,
          jsonUrl: correctEmbedUrl,
          embedUrl: correctEmbedUrl
        })
        onLevelGenerated({
          levelId: loaderResult.level_id,
          jsonUrl: correctEmbedUrl,
          embedUrl: correctEmbedUrl
        })
      } else {
        console.log('⚠️ onLevelGenerated is not available')
      }

      // Add success message with shape detection details and share buttons
      let shapeDetails = '';
      if (loaderResult.levelData?.level_data) {
        const data = loaderResult.levelData.level_data;
        shapeDetails = `\n🔍 **Shape Detection Results:**\n• ⬡ **Hexagons (Start Points):** ${data.starting_points?.length || 0} detected\n• ✕ **Crosses (End Points):** ${data.end_points?.length || 0} detected\n• ▲ **Triangles (Spikes):** ${data.spikes?.length || 0} detected\n• ● **Circles (Coins):** ${data.coins?.length || 0} detected\n• ■ **Other Shapes (Platforms):** ${data.rigid_bodies?.length || 0} detected\n• 📐 **Image Size:** ${data.image_size?.[0] || 0}x${data.image_size?.[1] || 0} pixels\n`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `✅ **New Map Created Successfully!** \nLevel ID: \`${loaderResult.level_id}\`${shapeDetails}\n\n🎯 **Your hand-drawn map has been loaded into the game on the left!**\n\nYou can now play your custom level in the game window on the left!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])

      // Store the current level ID and ask about public sharing
      console.log('🔍 Setting currentLevelId to:', loaderResult.level_id)
      setCurrentLevelId(loaderResult.level_id)

      // Ask about public sharing
      console.log('🎯 About to create share buttons with levelId:', loaderResult.level_id)
      console.log('🎯 Setting currentLevelId to:', loaderResult.level_id)
      setTimeout(() => {
        console.log('🎯 Creating public sharing message with buttons')
        const publicSharingMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: `🌟 **Share with the Community?**\n\nWould you like to share your map publicly with the community?\n\nYou can always change this setting later.`,
          timestamp: new Date(),
          buttons: [
            {
              id: 'share-public',
              text: '🌍 Share Publicly',
              action: () => {
                console.log('🔵 Share Publicly button clicked')
                console.log('🔵 Current level ID:', currentLevelId)
                handlePublicSharingResponse(true)
              }
            },
            {
              id: 'keep-private',
              text: '🔒 Keep Private',
              action: () => {
                console.log('🔴 Keep Private button clicked')
                console.log('🔴 Current level ID:', currentLevelId)
                handlePublicSharingResponse(false)
              }
            }
          ]
        }
        console.log('🎯 Adding public sharing message to chat')
        setMessages(prev => [...prev, publicSharingMessage])
      }, 1000)
    } else {
      // Add detailed error message
      let errorAdvice = '';
      if (loaderResult.error?.includes('timeout')) {
        errorAdvice = '\n\n💡 **Suggestion:** Your image might be too large or complex. Try:\n• Using a smaller image (under 5MB)\n• Simplifying your drawing\n• Ensuring good lighting and contrast';
      } else if (loaderResult.error?.includes('not accessible')) {
        errorAdvice = '\n\n💡 **Suggestion:** The level was created but the data couldn\'t be validated. Please try uploading again.';
      } else if (loaderResult.error?.includes('failed')) {
        errorAdvice = '\n\n💡 **Suggestion:** Make sure your drawing has:\n• Clear, dark lines\n• A triangle (▲) for the start\n• A circle (●) for the end\n• Rectangles/shapes for platforms';
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ **Processing Failed**\n\n${loaderResult?.error || 'Unknown error occurred'}${errorAdvice}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])

      // Re-enable upload on error
      setShowMapUpload(true)
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
        allowMultiple={true}
      />

      <AICodeGeneratorLoader
        isVisible={showAILoader}
        onComplete={handleAILoaderComplete}
        uploadedFileName={uploadedFileName}
        autoComplete={false}
      />
    </div>
  )
}

export default ChatPanel