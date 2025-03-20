"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, UserPlus, Copy } from "lucide-react"
import { useState } from "react"
import { db } from "@/lib/firebase"
import { ref, update } from "firebase/database"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface ChatInfoProps {
  chat: any
  onClose: () => void
  userId: string
}

export default function ChatInfo({ chat, onClose, userId }: ChatInfoProps) {
  const [newParticipantId, setNewParticipantId] = useState("")
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The ID has been copied to your clipboard.",
    })
  }

  const addParticipant = async () => {
    if (!newParticipantId.trim() || !chat.isGroup) return

    try {
      // Update chat participants
      const chatRef = ref(db, `chats/${chat.id}/participants/${newParticipantId}`)
      await update(chatRef, { joined: true })

      // Add chat to new participant's chats
      const userChatRef = ref(db, `userChats/${newParticipantId}/${chat.id}`)
      await update(userChatRef, {
        ...chat,
        lastMessage: "You were added to this group",
      })

      setNewParticipantId("")
      toast({
        title: "Participant added",
        description: "The user has been added to the group.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add participant.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium">Chat Info</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-2">Chat ID</h4>
            <div className="flex items-center space-x-2">
              <div className="bg-gray-100 p-2 rounded text-xs font-mono flex-1 truncate">{chat.id}</div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(chat.id)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {chat.isGroup && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-2">Participants</h4>
                {chat.participants ? (
                  <div className="space-y-2">
                    {Object.keys(chat.participants).map((participantId) => (
                      <div key={participantId} className="bg-gray-100 p-2 rounded text-sm">
                        <div className="font-mono text-xs truncate">{participantId}</div>
                        {participantId === userId && <span className="text-xs text-gray-500">(You)</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No participants</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Add Participant</h4>
                <div className="flex space-x-2">
                  <Input
                    value={newParticipantId}
                    onChange={(e) => setNewParticipantId(e.target.value)}
                    placeholder="Enter user ID"
                    className="flex-1"
                  />
                  <Button size="icon" onClick={addParticipant} disabled={!newParticipantId.trim()}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {!chat.isGroup && (
            <div>
              <h4 className="text-sm font-medium mb-2">Participant</h4>
              <div className="bg-gray-100 p-2 rounded text-sm">
                <div className="font-mono text-xs truncate">
                  {Object.keys(chat.participants || {}).find((id) => id !== userId) || "Unknown"}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

