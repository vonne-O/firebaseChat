import { initializeApp, getApps } from "firebase/app"
import { getDatabase, ref, set, get } from "firebase/database"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHXxOBy0MUvSlSRacupIr6HO946s4-y6w",
  authDomain: "cilchat-201e9.firebaseapp.com",
  // If you don't have a databaseURL, you need to create a Realtime Database first
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://cilchat-201e9-default-rtdb.firebaseio.com",
  projectId: "cilchat-201e9",
  storageBucket: "cilchat-201e9.firebasestorage.app",
  messagingSenderId: "164218920654",
  appId: "1:164218920654:web:0686542070500bbfb23a9f",
  measurementId: "G-TTLEY6DCM3",
}

// Initialize Firebase only if it hasn't been initialized already and if we're in a browser environment
let firebaseApp
let db
let databaseError = null

if (typeof window !== "undefined") {
  try {
    if (!getApps().length) {
      console.log("Initializing Firebase app")
      firebaseApp = initializeApp(firebaseConfig)
    } else {
      console.log("Firebase app already initialized")
      firebaseApp = getApps()[0]
    }

    if (!firebaseConfig.databaseURL || firebaseConfig.databaseURL.includes("your-project-id")) {
      databaseError = "Firebase Realtime Database URL is missing. You need to create a Realtime Database first."
      console.error(databaseError)
    } else {
      console.log("Getting Firebase database reference")
      db = getDatabase(firebaseApp)
      console.log("Firebase database initialized with URL:", firebaseConfig.databaseURL)
    }
  } catch (error) {
    databaseError = error.message
    console.error("Firebase initialization error:", error)
  }
}

// Function to check if database is properly configured
export const isDatabaseConfigured = () => {
  return !!db && !databaseError
}

// Function to get database error if any
export const getDatabaseError = () => {
  return databaseError
}

// Function to get user profile by ID
export const getUserProfile = async (userId) => {
  if (!db) {
    throw new Error(databaseError || "Database not initialized")
  }

  try {
    const userRef = ref(db, `users/${userId}`)
    const snapshot = await get(userRef)

    if (snapshot.exists()) {
      return snapshot.val()
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

// Function to test database connection and permissions
export const testDatabaseConnection = async () => {
  if (!db) {
    return {
      success: false,
      error: databaseError || "Database not initialized",
      needsSetup: true,
    }
  }

  try {
    // Test write permission
    const testRef = ref(db, "permissionTest")
    const testData = { timestamp: Date.now(), test: true }
    await set(testRef, testData)

    // Test read permission
    const snapshot = await get(testRef)

    if (snapshot.exists()) {
      return {
        success: true,
        data: snapshot.val(),
        message: "Database connection and permissions verified",
      }
    } else {
      return {
        success: false,
        error: "Could not read test data",
      }
    }
  } catch (error) {
    console.error("Database permission test failed:", error)
    return {
      success: false,
      error: error.message,
      details: "This is likely a Firebase permissions issue. Please check your database rules.",
    }
  }
}

// Direct function to create a chat
export const createChat = async (userId, participantId) => {
  if (!db) {
    throw new Error(databaseError || "Database not initialized. You need to create a Realtime Database first.")
  }

  try {
    // Get user profiles
    const currentUserProfile = await getUserProfile(userId)
    const participantProfile = await getUserProfile(participantId)

    const senderName = currentUserProfile?.displayName || "Anonymous User"
    const recipientName = participantProfile?.displayName || "Anonymous User"

    // Generate a simple ID
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Create basic chat data
    const chatData = {
      id: chatId,
      createdAt: Date.now(),
      createdBy: userId,
      isGroup: false,
      name: recipientName, // Use recipient's name instead of ID
      recipientId: participantId,
      participants: {
        [userId]: { joined: true, name: senderName },
        [participantId]: { joined: true, name: recipientName },
      },
      lastMessage: "Chat created",
    }

    // Write directly to all required locations
    const updates = {}
    updates[`chats/${chatId}`] = chatData
    updates[`userChats/${userId}/${chatId}`] = chatData
    updates[`userChats/${participantId}/${chatId}`] = {
      ...chatData,
      name: senderName, // For the recipient, show the sender's name
    }
    updates[`chatMessages/${chatId}/welcome`] = {
      text: "Chat created. Say hello!",
      senderId: "system",
      senderName: "System",
      timestamp: Date.now(),
    }

    // Write all updates at once
    for (const path in updates) {
      await set(ref(db, path), updates[path])
    }

    return { success: true, chatData }
  } catch (error) {
    console.error("Error creating chat:", error)
    throw error
  }
}

// Direct function to create a group
export const createGroup = async (userId, groupName, participants) => {
  if (!db) {
    throw new Error(databaseError || "Database not initialized. You need to create a Realtime Database first.")
  }

  try {
    // Get user profiles
    const currentUserProfile = await getUserProfile(userId)
    const senderName = currentUserProfile?.displayName || "Anonymous User"

    // Get participant profiles and names
    const participantsObj = {
      [userId]: { joined: true, name: senderName },
    }

    for (const participantId of participants) {
      const profile = await getUserProfile(participantId)
      const name = profile?.displayName || "Anonymous User"
      participantsObj[participantId] = { joined: true, name }
    }

    // Generate a simple ID
    const chatId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Create basic group data
    const chatData = {
      id: chatId,
      createdAt: Date.now(),
      createdBy: userId,
      creatorName: senderName,
      isGroup: true,
      name: groupName,
      participants: participantsObj,
      lastMessage: "Group created",
    }

    // Write directly to all required locations
    const updates = {}
    updates[`chats/${chatId}`] = chatData
    updates[`userChats/${userId}/${chatId}`] = chatData

    // Add to all participants' chats
    for (const participantId of participants) {
      updates[`userChats/${participantId}/${chatId}`] = chatData
    }

    updates[`chatMessages/${chatId}/welcome`] = {
      text: `Group "${groupName}" created by ${senderName}. Say hello!`,
      senderId: "system",
      senderName: "System",
      timestamp: Date.now(),
    }

    // Write all updates at once
    for (const path in updates) {
      await set(ref(db, path), updates[path])
    }

    return { success: true, chatData }
  } catch (error) {
    console.error("Error creating group:", error)
    throw error
  }
}

export { firebaseApp, db }

