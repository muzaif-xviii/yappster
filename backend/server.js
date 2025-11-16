require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const Message = require("./models/message");
const VALID_WEBSOCKET_TOKEN = process.env.WS_TOKEN || null;

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGODB_URI, {autoIndex:false,})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ Connection error:", err));

// --- Express + HTTP + Socket.IO setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const validClientTokens = new Set();

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

//sanitize function
function sanitizeText(str) {
  return str
    // Block script tags
    .replace(/<\/?script.*?>/gi, "[blocked]")

    // Block iframe tags
    .replace(/<\/?iframe.*?>/gi, "[blocked]")

    // Remove JS events like onclick="", onerror=""
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")

    // Block javascript: URLs
    .replace(/javascript:/gi, "");
}


// --- Socket.IO: handle connections ---
const allowedColors = ["#a12e20", "#3eaf5f", "#2244f5", "#e16efd", "#785651", "#d95de0"];

//route for temporary websockets 
app.get("/ws-token", (req, res) => {
  const temp = Math.random().toString(36).substring(2) + Date.now();
  validClientTokens.add(temp);

  //auto expire token
  setTimeout(() => validClientTokens.delete(temp), 1800000);
  res.json({token: temp });
});

io.on("connection", (socket) => {

  //authentication
  const clientToken = socket.handshake.auth?.token;

  if (!validClientTokens.has(clientToken)) {
    console.log("Unauthorized websocket connection blocked");
    return socket.disconnect();
  }

  validClientTokens.delete(clientToken);

  console.log("⚡ User connected:", socket.id);

  // Send last 20 messages to new connection
  Message.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .then(messages => socket.emit("loadMessages", messages.reverse()))
    .catch(err => console.error("Error loading messages:", err));

  // Handle incoming messages
  socket.on("sendMessage", async (msgData) => {
    try {
      // sanitize message
      const cleanMessage = {
        username: msgData.username.substring(0, 50),
        userId: msgData.userId,
        userColor: msgData.userColor,
        userCountry: msgData.userCountry || "🌍",
        text: sanitizeText(msgData.text.substring(0, 500)),
        time: msgData.time,
      };

      const message = new Message(cleanMessage);
      const savedMessage = await message.save();

      io.emit("message", savedMessage);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", (reason) => {
    console.warn("Socket disconnected:", reason);
    //auto reconnect
    if (reason === "transport close" || "io server disconnect") {
      socket.connect();
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
