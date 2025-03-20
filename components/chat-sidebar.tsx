"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Users, Plus, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  chats: any[]
  selectedChat: any
  onSelectChat: (chat: any) => void
  onNewChat: () => void
  onNewGroup: () => void
  userId: string
}

export default function ChatSidebar({
  chats,
  selectedChat,
  onSelectChat,
  onNewChat,
  onNewGroup,
  userId,
}: ChatSidebarProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"direct" | "group">("direct")

  const handleLogout = () => {
    localStorage.removeItem("chatUserId")
    localStorage.removeItem("chatUserName")
    router.push("/")
  }

  const filteredChats = chats.filter(
    (chat) => (activeTab === "direct" && !chat.isGroup) || (activeTab === "group" && chat.isGroup),
  )

  // Get user's display name
  const displayName = localStorage.getItem("chatUserName") || "Anonymous User"

  return (
    <div className="w-80 border-r bg-white flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">Chats</h2>
            <p className="text-xs text-gray-500">Logged in as {displayName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
          <Button
            variant={activeTab === "direct" ? "default" : "ghost"}
            size="sm"
            className="flex-1 flex items-center justify-center"
            onClick={() => setActiveTab("direct")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Direct
          </Button>
          <Button
            variant={activeTab === "group" ? "default" : "ghost"}
            size="sm"
            className="flex-1 flex items-center justify-center"
            onClick={() => setActiveTab("group")}
          >
            <Users className="h-4 w-4 mr-2" />
            Groups
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "flex items-center p-3 rounded-md cursor-pointer hover:bg-gray-100",
                  selectedChat?.id === chat.id && "bg-gray-100",
                )}
                onClick={() => onSelectChat(chat)}
              >
                <div className="flex-shrink-0 mr-3">
                  {chat.isGroup ? (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium">{chat.name?.charAt(0).toUpperCase() || "?"}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{chat.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500 truncate">{chat.lastMessage || "No messages yet"}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No {activeTab === "direct" ? "direct" : "group"} chats yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={activeTab === "direct" ? onNewChat : onNewGroup}
              >
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === "direct" ? "Start a chat" : "Create a group"}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onNewChat} variant="outline" className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <Button onClick={onNewGroup} variant="outline" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <p className="text-xs text-gray-500">Your ID:</p>
          <p className="font-mono text-xs break-all">{userId}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 text-xs w-full"
            onClick={() => {
              navigator.clipboard.writeText(userId)
              alert("ID copied to clipboard!")
            }}
          >
            Copy ID
          </Button>
        </div>
      </div>
    </div>
  )
}

