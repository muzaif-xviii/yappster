// --- Get username from URL or generate random one ---
const params = new URLSearchParams(window.location.search);
const username = params.get("name") || "Yapper" + Math.floor(1000 + Math.random() * 9000);

// --- Connect to backend Socket.IO server ---
const socket = io();

// --- Get page elements ---
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");

// --- Country flag setup ---
let userCountry = "🌍"; 
input.disabled = true;

fetch("https://ipapi.co/json/")
  .then(res => res.json())
  .then(data => {
    const countryCode = data.country_code;
    userCountry = String.fromCodePoint(...[...countryCode].map(c => 127397 + c.charCodeAt()));
    input.disabled = false;
  })
  .catch(() => { input.disabled = false; });

// --- Generate random color and unique ID ---
function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

const userColor = getRandomColor();
const userId = Math.floor(10000 + Math.random() * 90000);

// --- Send message ---
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // sanitize input
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const msgData = { username, userId, userColor, userCountry, text: safeText, time };
  socket.emit("sendMessage", msgData);
  input.value = "";
}

// --- Display message ---
function displayMessage(msgData) {
  const flag = msgData.userCountry || "🌍"; 
  const newMessage = document.createElement("div");
  newMessage.classList.add("bubble");

  if (msgData.text.includes(`@${username}`)) newMessage.classList.add("pinged");

  newMessage.innerHTML = `
    <div class="message-header">
      <span class="username" style="color:${msgData.userColor}">
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
socket.on("loadMessages", messages => {
  messages.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach(displayMessage);
});
socket.on("message", displayMessage);

// --- Event listeners ---
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", event => { 
  if (event.key === "Enter") { 
    event.preventDefault(); 
    sendMessage(); 
  } 
});
