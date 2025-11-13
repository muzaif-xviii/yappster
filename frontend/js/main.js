// --- Get username from URL or generate random one ---
const params = new URLSearchParams(window.location.search);
const username = params.get("name") || "Yapper" + Math.floor(1000 + Math.random() * 9000);

// --- Connect to backend Socket.IO server ---
const socket = io();

// --- Get page elements ---
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
//const joinBtn = document.getElementById("joinBtn");

// --- Country flag setup ---
let userCountry = "🌍"; // default flag
input.disabled = true;

fetch("https://ipapi.co/json/")
  .then(res => res.json())
  .then(data => {
    const countryCode = data.country_code; // e.g. "IN"
    userCountry = String.fromCodePoint(...[...countryCode].map(c => 127397 + c.charCodeAt()));
    input.disabled = false;
  })
  .catch(() => {
    console.warn("Couldn't fetch country. Using default 🌍");
    input.disabled = false;
  });

// --- Generate random color and unique ID for the user ---
function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

const userColor = getRandomColor();
const userId = Math.floor(10000 + Math.random() * 90000);

// --- Function to send a message ---
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const msgData = {
    username,
    userId,
    userColor,
    userCountry,
    text,
    time,
  };

  // Send to backend
  socket.emit("sendMessage", msgData);

  // Clear input
  input.value = "";
}

// --- Display message helper ---
function displayMessage(msgData) {
  const flag = msgData.userCountry || "🌍"; // fallback flag
  const newMessage = document.createElement("div");
  newMessage.classList.add("bubble");

  // Only allow approved colors
  const allowedColors = ["#a12e20", "#3eaf5f", "#2244f5", "#e16efd", "#785651", "#d95de0"];
  const userColor = allowedColors.includes(msgData.userColor) ? msgData.userColor : "#000000";

  // Highlight if the user is mentioned
  if (msgData.text.includes(`@${username}`)) {
    newMessage.classList.add("pinged");
  }

  newMessage.innerHTML = `
    <div class="message-header">
      <span class="username" style="color:${userColor}">
        ${msgData.username} ${flag}
      </span>
      <span class="userid">#id:${msgData.userId}~${msgData.time}</span>
    </div>
    <div class="message-text">${msgData.text}</div>
  `;

  messagesDiv.appendChild(newMessage);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


// --- Socket.IO events ---
// Load old messages on connect
socket.on("loadMessages", (messages) => {  
  messages
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach(displayMessage);
});

// Display new messages from others
socket.on("message", displayMessage);

/*//joined pop up 
function joinedChat() {

}*/

// --- Event listeners ---
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});
