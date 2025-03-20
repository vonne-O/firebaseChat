"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"
import { MessageSquare, Users } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { db } from "@/lib/firebase"
import { ref, set } from "firebase/database"

export default function Home() {
  const [userId, setUserId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [firebaseError, setFirebaseError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user ID and name exist in local storage
    const storedUserId = localStorage.getItem("chatUserId")
    const storedDisplayName = localStorage.getItem("chatUserName")

    if (storedUserId) {
      setUserId(storedUserId)
    }

    if (storedDisplayName) {
      setDisplayName(storedDisplayName)
    }

    // Import Firebase dynamically to avoid "require is not defined" error
    import("@/lib/firebase")
      .then(({ db }) => {
        if (!db) {
          setFirebaseError(true)
        }
      })
      .catch((error) => {
        console.error("Firebase error:", error)
        setFirebaseError(true)
      })
  }, [])

  const generateUserId = () => {
    const newUserId = uuidv4()
    setUserId(newUserId)
    localStorage.setItem("chatUserId", newUserId)
  }

  const handleStartChatting = async () => {
    if (!userId) {
      generateUserId()
    }

    // Ensure display name is set
    const nameToUse = displayName.trim() || "Anonymous User"
    setDisplayName(nameToUse)
    localStorage.setItem("chatUserName", nameToUse)

    // Save user profile to Firebase if database is available
    if (db && userId) {
      try {
        const userRef = ref(db, `users/${userId}`)
        await set(userRef, {
          id: userId,
          displayName: nameToUse,
          createdAt: Date.now(),
        })
        console.log("User profile saved to Firebase")
      } catch (error) {
        console.error("Error saving user profile:", error)
      }
    }

    router.push("/chat")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Chat App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {firebaseError && (
            <Alert variant="destructive">
              <AlertTitle>Firebase Configuration Error</AlertTitle>
              <AlertDescription>
                Please update your Firebase configuration in lib/firebase.ts with valid values from your Firebase
                project. Make sure the databaseURL is in the format: https://your-project-id.firebaseio.com
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              {userId
                ? "You already have a unique ID. You can start chatting or generate a new ID."
                : "Generate a unique ID to start chatting without authentication."}
            </p>

            {userId && (
              <div className="p-3 bg-gray-100 rounded-md">
                <p className="text-xs text-gray-500">Your unique ID:</p>
                <p className="font-mono text-sm break-all">{userId}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full"
            />
            <p className="text-xs text-gray-500">This name will be shown to others in chats</p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button onClick={generateUserId} variant="outline" className="w-full">
              {userId ? "Generate New ID" : "Generate Unique ID"}
            </Button>
            <Button onClick={handleStartChatting} className="w-full" disabled={firebaseError}>
              Start Chatting
            </Button>
          </div>

          <div className="pt-4">
            <div className="flex justify-center space-x-8">
              <div className="flex flex-col items-center">
                <div className="p-3 bg-primary/10 rounded-full mb-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Single Chat</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-3 bg-primary/10 rounded-full mb-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Group Chat</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

