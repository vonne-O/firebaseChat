"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ChatSidebar from "@/components/chat-sidebar"
import ChatWindow from "@/components/chat-window"
import NewChatModal from "@/components/new-chat-modal"
import NewGroupModal from "@/components/new-group-modal"
import { db } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function ChatPage() {
  const [userId, setUserId] = useState("")
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false)
  const [firebaseError, setFirebaseError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user ID exists in local storage
    const storedUserId = localStorage.getItem("chatUserId")
    if (!storedUserId) {
      router.push("/")
      return
    }

    setUserId(storedUserId)

    // Check if Firebase is properly configured
    if (!db) {
      console.error("Firebase database not initialized")
      setFirebaseError(true)
      setIsLoading(false)
      return
    }

    try {
      console.log("Fetching chats for user:", storedUserId)
      // Fetch user's chats
      const userChatsRef = ref(db, `userChats/${storedUserId}`)
      const unsubscribe = onValue(
        userChatsRef,
        (snapshot) => {
          setIsLoading(false) // Set loading to false regardless of result
          const data = snapshot.val()
          console.log("User chats data:", data)

          if (data) {
            const chatArray = Object.entries(data).map(([id, chat]) => ({
              id,
              ...chat,
            }))
            console.log("Processed chat array:", chatArray)
            setChats(chatArray)

            // If no chat is selected and we have chats, select the first one
            if (!selectedChat && chatArray.length > 0) {
              setSelectedChat(chatArray[0])
            }
          } else {
            console.log("No chats found for user")
            setChats([])
          }
        },
        (error) => {
          console.error("Firebase error:", error)
          setFirebaseError(true)
          setIsLoading(false)
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
      console.error("Firebase error:", error)
      setFirebaseError(true)
      setIsLoading(false)
    }
  }, [router, selectedChat])

  const handleChatCreated = (newChat) => {
    console.log("New chat created:", newChat)

    // Force refresh the chat list
    if (db && userId) {
      console.log("Refreshing chat list after creation")
      const userChatsRef = ref(db, `userChats/${userId}`)
      onValue(
        userChatsRef,
        (snapshot) => {
          const data = snapshot.val()
          console.log("Refreshed chat data:", data)

          if (data) {
            const chatArray = Object.entries(data).map(([id, chat]) => ({
              id,
              ...chat,
            }))
            setChats(chatArray)

            // Find and select the newly created chat
            const createdChat = chatArray.find((chat) => chat.id === newChat.id)
            if (createdChat) {
              console.log("Selecting newly created chat:", createdChat)
              setSelectedChat(createdChat)
            } else {
              console.log("Newly created chat not found in the list")
              // If we can't find the exact chat, just select the first one
              if (chatArray.length > 0) {
                setSelectedChat(chatArray[0])
              }
            }
          }
        },
        { onlyOnce: true },
      )
    }
  }

  if (firebaseError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Firebase Configuration Error</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Please update your Firebase configuration in lib/firebase.ts with valid values from your Firebase project.
            </p>
            <p className="mb-2">Make sure the databaseURL is in the format: https://your-project-id.firebaseio.com</p>
            <p className="mb-2">Also ensure that your Firebase Realtime Database rules allow read/write access.</p>
            <Button onClick={() => router.push("/")} className="mt-2">
              Go Back Home
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show loading indicator for a maximum of 3 seconds
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading chats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ChatSidebar
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        onNewChat={() => setIsNewChatModalOpen(true)}
        onNewGroup={() => setIsNewGroupModalOpen(true)}
        userId={userId}
      />

      <ChatWindow chat={selectedChat} userId={userId} />

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        userId={userId}
        onChatCreated={handleChatCreated}
      />

      <NewGroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        userId={userId}
        onGroupCreated={handleChatCreated}
      />
    </div>
  )
}

