import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hello! I\'m your Lakbayan Assistant. I can help you with information about places to visit, activities, transportation, bookings, and more about Kitcharao, Agusan del Norte! How can I assist you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const lastAnimatedMessageRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingText]) // Also scroll when typing text updates

  // Typewriter animation effect
  useEffect(() => {
    // Only run if we have messages
    if (messages.length === 0) return

    // Find the last assistant message
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return

    const messageKey = `${messages.length}-${lastMessage.role}-${lastMessage.isTyping}`

    // Only animate if it's a new assistant message that's marked as typing
    if (lastMessage.role === 'assistant' &&
      lastMessage.isTyping &&
      !loading &&
      messageKey !== lastAnimatedMessageRef.current) {

      const fullText = lastMessage.content || ''
      if (!fullText) return

      lastAnimatedMessageRef.current = messageKey

      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Start typing animation
      setIsTyping(true)
      setTypingText('')

      // Typewriter effect - character by character
      let currentIndex = 0
      const typeSpeed = 20 // milliseconds per character (fast but readable)

      const typeCharacter = () => {
        if (currentIndex < fullText.length) {
          setTypingText(fullText.slice(0, currentIndex + 1))
          currentIndex++
          typingTimeoutRef.current = setTimeout(typeCharacter, typeSpeed)
        } else {
          // Animation complete
          setIsTyping(false)
          setTypingText(fullText)
          // Mark message as no longer typing
          setMessages(prev => prev.map((msg, idx) =>
            idx === prev.length - 1 && msg.role === 'assistant'
              ? { ...msg, isTyping: false }
              : msg
          ))
        }
      }

      // Start typing immediately
      typeCharacter()
    }

    // Cleanup on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setTypingText('') // Reset typing text
    setIsTyping(false)

    try {
      const response = await api.post('/chatbot', {
        message: userMessage,
        conversationHistory: messages.slice(-5) // Last 5 messages for context
      })

      // Add message with isTyping flag to trigger animation
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        isTyping: true // Flag to trigger typewriter animation
      }])
    } catch (error) {
      console.error('Chatbot error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support for assistance with Kitcharao tourism information.',
        isTyping: true
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleQuickQuestion = (question) => {
    setInput(question)
    inputRef.current?.focus()
  }

  const quickQuestions = [
    'What are the best places to visit in Kitcharao?',
    'How do I book a place?',
    'How do I request transportation?',
    'What activities are available?'
  ]

  return (
    <>
      {/* Chatbot Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-full shadow-lg hover:shadow-xl transition-all z-50 flex items-center justify-center group"
            aria-label="Open chatbot"
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-pulse"></span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chatbot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 w-full sm:w-[360px] md:w-96 h-full sm:h-[500px] md:h-[600px] sm:max-h-[80vh] bg-white sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden sm:border-2 sm:border-beige-400"
          >
            {/* Header */}
            <div className="bg-primary text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Kitcharao Assistant</h3>
                  <p className="text-xs text-beige-300">Tourism & Travel Help</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, index) => {
                const isLastAssistantMessage = index === messages.length - 1 && msg.role === 'assistant'
                const displayText = isLastAssistantMessage && isTyping ? (typingText || '') : (msg.content || '')

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">
                        {displayText || ''}
                        {isLastAssistantMessage && isTyping && (
                          <span className="inline-block w-0.5 h-4 bg-gray-600 ml-1 align-middle animate-pulse"></span>
                        )}
                      </p>
                    </div>
                  </motion.div>
                )
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
              <div className="px-4 py-2 bg-white border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2 font-semibold">Quick Questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-xs px-3 py-1 bg-beige-50 text-beige-600 rounded-full hover:bg-beige-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Kitcharao..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-beige-400"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}




