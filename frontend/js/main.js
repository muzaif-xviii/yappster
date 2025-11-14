(async () => {
  // --- Get username from URL or generate random one ---
  const params = new URLSearchParams(window.location.search);
  const username = params.get("name") || "Yapper" + Math.floor(1000 + Math.random() * 9000);

  // --- Connect to backend Socket.IO server ---
  async function getWsToken() {
    const res = await fetch("/ws-token");
    const data = await res.json();
    return data.token;
  }
  const token = await getWsToken();
  const socket = io({
    auth: {token}
  });

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

    const safeText = text;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgData = { username, userId, userColor, userCountry, text: safeText, time };
    socket.emit("sendMessage", msgData);
    input.value = "";
  }

  // --- Display message ---
  function displayMessage(msgData) {
    const flag = msgData.userCountry || "🌍";

    const newMessage = document.createElement("div");
    newMessage.className = "bubble";

    if (msgData.text.includes(`@${username}`)) newMessage.classList.add("pinged");

    //header
    const header = document.createElement("div");
    header.className = "message-header";

    const nameSpan = document.createElement("span");
    nameSpan.className = "username";
    nameSpan.style.color = msgData.userColor || "#000000"; // server-validated color recommended
    nameSpan.textContent = `${msgData.username} ${flag}`;

    const metaSpan = document.createElement("span");
    metaSpan.className = "userid";
    metaSpan.textContent = `#id:${msgData.userId}~${msgData.time}`;

    header.appendChild(nameSpan);
    header.appendChild(metaSpan);

    //bubble
    const body = document.createElement("div");
    body.className = "message-text";
    body.textContent = msgData.text;

    newMessage.appendChild(header);
    newMessage.appendChild(body);

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

})();