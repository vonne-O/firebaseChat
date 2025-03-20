import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface ChatMessageProps {
  message: any
  isOwnMessage: boolean
}

export default function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  // Format timestamp if it exists
  const formattedTime = message.timestamp ? format(new Date(message.timestamp), "HH:mm") : ""

  return (
    <div className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2",
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-900",
        )}
      >
        {!isOwnMessage && message.senderId !== "system" && (
          <p className="text-xs font-medium mb-1 text-blue-600">{message.senderName || "Unknown"}</p>
        )}
        {message.senderId === "system" && (
          <p className="text-xs font-medium mb-1 text-gray-500">{message.senderName || "System"}</p>
        )}
        <p className="text-sm">{message.text}</p>
        <p className={cn("text-xs mt-1 text-right", isOwnMessage ? "text-primary-foreground/70" : "text-gray-500")}>
          {formattedTime}
        </p>
      </div>
    </div>
  )
}

