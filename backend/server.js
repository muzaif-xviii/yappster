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
io.on("connection", (socket) => {

  // Send last 20 messages to the newly connected user
  Message.find()
    .sort({ createdAt: -1 }) // oldest first
    .limit(20)
    .then(messages => { 
      socket.emit("loadMessages", messages.reverse());
    })
    .catch(err => console.error("Error loading messages:", err));

  // Handle incoming messages
  socket.on("sendMessage", async (msgData) => {
    try {
        // Save message to database
        const message = new Message(msgData);
        const savedMessage = await message.save(); // contains createdAt, _id, etc.
        //console.log("saved:", savedMessage);

        // Broadcast saved message to all connected clients
        io.emit("message", savedMessage);
    } catch (err) {
        console.error("Error saving message:", err);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
