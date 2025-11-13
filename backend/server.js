require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const Message = require("./models/message");

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ Connection error:", err));

// --- Express + HTTP + Socket.IO setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// --- Socket.IO: handle connections ---
const allowedColors = ["#a12e20", "#3eaf5f", "#2244f5", "#e16efd", "#785651", "#d95de0"];

io.on("connection", (socket) => {

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
        text: msgData.text.substring(0, 500),
        time: msgData.time,
      };

      const message = new Message(cleanMessage);
      const savedMessage = await message.save();

      io.emit("message", savedMessage);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {});
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
