import React, { useState, useRef } from 'react'
import './ChatInput.css'

interface ChatInputProps {
  onSendMessage: (content: string, image?: File) => void
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || selectedImage) {
      onSendMessage(message.trim() || 'Image uploaded', selectedImage || undefined)
      setMessage('')
      setSelectedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  return (
    <div className="chat-input">
      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="Preview" />
          <button type="button" className="remove-image" onClick={removeImage}>
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <button
            type="button"
            className="image-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload image"
          >
            📎
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden-file-input"
          />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message to modify the Mario game map..."
            className="message-input"
            rows={1}
          />

          <button
            type="submit"
            className={`send-button ${message.trim() || selectedImage ? 'active' : ''}`}
            disabled={!message.trim() && !selectedImage}
          >
            <span className="send-icon">➤</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatInput