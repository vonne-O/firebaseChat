"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { testDatabaseConnection, createChat, isDatabaseConfigured, getDatabaseError } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onChatCreated: (chat: any) => void
}

export default function NewChatModal({ isOpen, onClose, userId, onChatCreated }: NewChatModalProps) {
  const [participantId, setParticipantId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      // Check if database is configured
      if (!isDatabaseConfigured()) {
        const dbError = getDatabaseError()
        setConnectionStatus(`❌ Firebase Database Error: ${dbError || "Database not configured"}`)
        setTestResult({
          success: false,
          error: dbError || "Database not configured",
          needsSetup: true,
        })
        return
      }

      // Test database connection when modal opens
      setConnectionStatus("Testing database connection...")
      testDatabaseConnection().then((result) => {
        setTestResult(result)
        if (result.success) {
          setConnectionStatus("✅ Connected to Firebase successfully")
        } else {
          setConnectionStatus(`❌ Firebase connection error: ${result.error}`)
          if (result.details) {
            setConnectionStatus(`❌ Firebase connection error: ${result.error}. ${result.details}`)
          }
        }
      })
    }
  }, [isOpen])

  const handleCreateChat = async () => {
    if (!participantId.trim()) {
      setError("Please enter a valid user ID")
      return
    }

    if (participantId === userId) {
      setError("You cannot chat with yourself")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("Creating chat between", userId, "and", participantId)

      // Use the direct createChat function
      const result = await createChat(userId, participantId)

      if (result.success) {
        console.log("Chat created successfully:", result.chatData)

        toast({
          title: "Chat created",
          description: "Your chat has been created successfully",
        })

        onChatCreated(result.chatData)
        onClose()
      } else {
        throw new Error("Failed to create chat")
      }
    } catch (error) {
      console.error("Error creating chat:", error)
      setError(`Failed to create chat: ${error.message}`)
      toast({
        title: "Error",
        description: `Failed to create chat: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
          // Reset state when closing
          setParticipantId("")
          setError(null)
          setConnectionStatus(null)
          setTestResult(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {connectionStatus && (
            <Alert variant={connectionStatus.includes("❌") ? "destructive" : "default"}>
              <AlertDescription>{connectionStatus}</AlertDescription>
            </Alert>
          )}

          {testResult && testResult.needsSetup && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm">
              <p className="font-medium text-red-800">Firebase Realtime Database Not Set Up</p>
              <p className="mt-1 text-red-700">You need to create a Realtime Database in your Firebase project:</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-red-700">
                <li>
                  Go to the{" "}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Firebase Console
                  </a>
                </li>
                <li>Select your project "cilchat-201e9"</li>
                <li>In the left sidebar, click on "Build" and then select "Realtime Database"</li>
                <li>Click "Create Database"</li>
                <li>Choose a location (select the one closest to your users)</li>
                <li>
                  Start in <strong>test mode</strong> for development
                </li>
                <li>Copy the database URL (should look like https://cilchat-201e9-default-rtdb.firebaseio.com)</li>
                <li>Update the databaseURL in your lib/firebase.ts file</li>
              </ol>
            </div>
          )}

          {testResult && !testResult.success && !testResult.needsSetup && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm">
              <p className="font-medium text-red-800">Firebase Database Permission Error</p>
              <p className="mt-1 text-red-700">
                It looks like your Firebase database rules are preventing write operations. Please update your rules to
                allow read and write access:
              </p>
              <pre className="mt-2 bg-red-100 p-2 rounded text-xs overflow-x-auto">
                {`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}
              </pre>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Enter User ID to Chat With</label>
            <Input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="User ID"
              autoFocus
            />
            <p className="text-xs text-gray-500">Enter the unique ID of the user you want to chat with.</p>
          </div>

          <div className="bg-gray-100 p-3 rounded-md">
            <p className="text-xs text-gray-500">Your ID (for sharing):</p>
            <div className="flex items-center mt-1">
              <p className="font-mono text-xs break-all flex-1">{userId}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs ml-2"
                onClick={() => {
                  navigator.clipboard.writeText(userId)
                  toast({
                    title: "ID copied",
                    description: "Your ID has been copied to clipboard",
                  })
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={
              !participantId.trim() || participantId === userId || isLoading || (testResult && !testResult.success)
            }
          >
            {isLoading ? "Creating..." : "Start Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

