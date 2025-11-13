const mongoose = require("mongoose");

// Define how every message should look in the database
const messageSchema = new mongoose.Schema({
  username: String,    // person’s username
  userId: String,      // their unique id
  userColor: String,   // color assigned to them
  userCountry: String,     // emoji flag (🌍🇮🇳 etc.)
  text: String,        // the message content
  time: String,        // time message was sent (from frontend)
}, { timestamps: true }); // auto adds createdAt & updatedAt fields

// Export the model so we can use it in server.js
module.exports = mongoose.model("Message", messageSchema, "messages");
