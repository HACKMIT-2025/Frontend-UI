import React, { useState, useRef } from 'react'
import './ChatInput.css'

interface ChatInputProps {
  onSendMessage: (content: string, images?: File[]) => void
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newImages: File[] = []
    const newPreviews: string[] = []
    let loadedCount = 0

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        newImages.push(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string)
          loadedCount++

          // When all images are loaded, update state
          if (loadedCount === files.length) {
            setSelectedImages(prev => [...prev, ...newImages])
            setImagePreviews(prev => [...prev, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeAllImages = () => {
    setSelectedImages([])
    setImagePreviews([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || selectedImages.length > 0) {
      const imagesToSend = selectedImages.length > 0 ? selectedImages : undefined
      const messageText = message.trim() || (selectedImages.length > 0 ? `Uploaded ${selectedImages.length} image(s)` : '')
      onSendMessage(messageText, imagesToSend)
      setMessage('')
      setSelectedImages([])
      setImagePreviews([])
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
      {imagePreviews.length > 0 && (
        <div className="images-preview-grid">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="image-preview-item">
              <img src={preview} alt={`Preview ${index + 1}`} />
              <button
                type="button"
                className="remove-image"
                onClick={() => removeImage(index)}
                title="Remove this image"
              >
                ×
              </button>
            </div>
          ))}
          {imagePreviews.length > 1 && (
            <button
              type="button"
              className="remove-all-images"
              onClick={removeAllImages}
              title="Remove all images"
            >
              Clear All ({imagePreviews.length})
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <button
            type="button"
            className="image-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload images"
          >
            📎
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
            className={`send-button ${message.trim() || selectedImages.length > 0 ? 'active' : ''}`}
            disabled={!message.trim() && selectedImages.length === 0}
          >
            <span className="send-icon">➤</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatInput