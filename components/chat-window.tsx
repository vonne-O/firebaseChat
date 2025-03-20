"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Info, MessageSquare, Users } from "lucide-react"
import { db, getUserProfile } from "@/lib/firebase"
import { ref, push, onValue, set } from "firebase/database"
import ChatMessage from "@/components/chat-message"
import ChatInfo from "@/components/chat-info"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ChatWindowProps {
  chat: any
  userId: string
}

export default function ChatWindow({ chat, userId }: ChatWindowProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [showInfo, setShowInfo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Load user profile
    const loadUserProfile = async () => {
      try {
        const profile = await getUserProfile(userId)
        setUserProfile(profile)
      } catch (error) {
        console.error("Error loading user profile:", error)
      }
    }

    if (userId) {
      loadUserProfile()
    }
  }, [userId])

  useEffect(() => {
    if (!chat || !db) return

    console.log("Loading messages for chat:", chat.id)
    setIsLoading(true)
    setError(null)

    try {
      // Fetch messages for the selected chat
      const messagesRef = ref(db, `chatMessages/${chat.id}`)
      const unsubscribe = onValue(
        messagesRef,
        (snapshot) => {
          setIsLoading(false)
          const data = snapshot.val()
          console.log("Chat messages data:", data)

          if (data) {
            const messageArray = Object.entries(data)
              .map(([id, msg]) => ({
                id,
                ...msg,
              }))
              .sort((a, b) => {
                // Handle case where timestamp might be null or undefined
                if (!a.timestamp) return -1
                if (!b.timestamp) return 1
                return a.timestamp - b.timestamp
              })

            console.log("Processed messages:", messageArray)
            setMessages(messageArray)

            // Scroll to bottom on new messages
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
            }, 100)
          } else {
            console.log("No messages found for this chat")
            setMessages([])
          }
        },
        (error) => {
          setIsLoading(false)
          console.error("Error fetching messages:", error)
          setError("Failed to load messages. Please check your Firebase configuration.")
        },
      )

      // Set a timeout to ensure we don't get stuck in loading state
      const timeout = setTimeout(() => {
        setIsLoading(false)
      }, 3000)

      return () => {
        unsubscribe()
        clearTimeout(timeout)
      }
    } catch (error) {
      setIsLoading(false)
      console.error("Error setting up message listener:", error)
      setError("Failed to load messages. Please check your Firebase configuration.")
    }
  }, [chat])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !chat || !db) return

    try {
      console.log("Sending message to chat:", chat.id)
      const messagesRef = ref(db, `chatMessages/${chat.id}`)
      const newMessageRef = push(messagesRef)

      // Get the user's display name
      const displayName = userProfile?.displayName || localStorage.getItem("chatUserName") || "Anonymous User"

      const messageData = {
        text: message,
        senderId: userId,
        senderName: displayName,
        timestamp: Date.now(),
      }

      console.log("Message data:", messageData)
      await set(newMessageRef, messageData)
      console.log("Message sent successfully")

      // Update last message in chat
      const chatRef = ref(db, `chats/${chat.id}`)
      await set(chatRef, {
        ...chat,
        lastMessage: message,
        lastMessageTime: Date.now(),
      })
      console.log("Chat updated with last message")

      // Update in user chats
      const userChatRef = ref(db, `userChats/${userId}/${chat.id}`)
      await set(userChatRef, {
        ...chat,
        lastMessage: message,
        lastMessageTime: Date.now(),
      })
      console.log("User chat updated with last message")

      // Update for other participants
      if (chat.participants) {
        Object.keys(chat.participants).forEach(async (participantId) => {
          if (participantId !== userId) {
            const participantChatRef = ref(db, `userChats/${participantId}/${chat.id}`)
            await set(participantChatRef, {
              ...chat,
              lastMessage: `${displayName}: ${message}`,
              lastMessageTime: Date.now(),
            })
            console.log(`Participant ${participantId}'s chat updated`)
          }
        })
      }

      setMessage("")
    } catch (error) {
      console.error("Error in send message flow:", error)
      setError("Failed to send message. Please check your Firebase configuration.")
    }
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No chat selected</h3>
          <p className="text-gray-500 mt-2 mb-6">Select a chat or start a new conversation</p>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="font-medium mb-2">Start a new conversation</h4>
              <p className="text-sm text-gray-500 mb-3">
                Click the "New Chat" button in the sidebar and enter the user ID of the person you want to chat with.
              </p>
              <div className="flex items-center justify-center bg-gray-100 p-3 rounded-md">
                <p className="text-xs text-gray-500 mr-2">Your ID:</p>
                <p className="font-mono text-xs">{userId}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="font-medium mb-2">Create a group chat</h4>
              <p className="text-sm text-gray-500">
                Click the "New Group" button in the sidebar to create a group chat and add multiple participants.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          {chat.isGroup ? (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              <span className="text-sm font-medium">{chat.name?.charAt(0).toUpperCase() || "?"}</span>
            </div>
          )}
          <div>
            <h3 className="font-medium">{chat.name || "Chat"}</h3>
            <p className="text-xs text-gray-500">
              {chat.isGroup ? `${Object.keys(chat.participants || {}).length} participants` : "Direct message"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowInfo(!showInfo)}>
          <Info className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {error && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Loading messages...</p>
                </div>
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} isOwnMessage={msg.senderId === userId} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="mb-2">No messages yet</p>
                  <p className="text-sm">Type a message below to start the conversation</p>
                </div>
              </div>
            )}
          </ScrollArea>

          <form onSubmit={sendMessage} className="p-4 border-t bg-white">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!message.trim() || !db}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {showInfo && <ChatInfo chat={chat} onClose={() => setShowInfo(false)} userId={userId} />}
      </div>
    </div>
  )
}

