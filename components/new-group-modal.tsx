"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { testDatabaseConnection, createGroup, isDatabaseConfigured, getDatabaseError } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NewGroupModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onGroupCreated: (group: any) => void
}

export default function NewGroupModal({ isOpen, onClose, userId, onGroupCreated }: NewGroupModalProps) {
  const [groupName, setGroupName] = useState("")
  const [participantId, setParticipantId] = useState("")
  const [participants, setParticipants] = useState<string[]>([])
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

  const addParticipant = () => {
    if (!participantId.trim() || participantId === userId || participants.includes(participantId)) {
      setError(
        participantId === userId
          ? "You are already in the group"
          : participants.includes(participantId)
            ? "This user is already added"
            : "Please enter a valid user ID",
      )
      return
    }

    setParticipants([...participants, participantId])
    setParticipantId("")
    setError(null)
  }

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p !== id))
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name")
      return
    }

    if (participants.length === 0) {
      setError("Please add at least one participant")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("Creating group:", groupName, "with participants:", [userId, ...participants])

      // Use the direct createGroup function
      const result = await createGroup(userId, groupName, participants)

      if (result.success) {
        console.log("Group created successfully:", result.chatData)

        toast({
          title: "Group created",
          description: "Your group has been created successfully",
        })

        onGroupCreated(result.chatData)
        onClose()
      } else {
        throw new Error("Failed to create group")
      }
    } catch (error) {
      console.error("Error creating group:", error)
      setError(`Failed to create group: ${error.message}`)
      toast({
        title: "Error",
        description: `Failed to create group: ${error.message}`,
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
          setGroupName("")
          setParticipantId("")
          setParticipants([])
          setError(null)
          setConnectionStatus(null)
          setTestResult(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Group Chat</DialogTitle>
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
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Add Participants</label>
            <div className="flex space-x-2">
              <Input
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="Enter user ID"
                className="flex-1"
              />
              <Button onClick={addParticipant} disabled={!participantId.trim() || (testResult && !testResult.success)}>
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-500">Enter the unique IDs of users you want to add to the group.</p>
          </div>

          {participants.length > 0 && (
            <div>
              <label className="text-sm font-medium">Participants ({participants.length})</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {participants.map((id) => (
                  <div key={id} className="bg-gray-100 px-3 py-1 rounded-full flex items-center text-sm">
                    <span className="mr-2 truncate max-w-[150px]">{id}</span>
                    <button onClick={() => removeParticipant(id)} className="text-gray-500 hover:text-gray-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={
              !groupName.trim() || participants.length === 0 || isLoading || (testResult && !testResult.success)
            }
          >
            {isLoading ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

