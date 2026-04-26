/**
 * Orion Extension — Content Script
 * Handles UI notifications and bridges communication between pages and background.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ORION_NOTIFICATION") {
    showNotification(message.text, message.notifType, message.interactive, message.action, message.data);
  }
});

/**
 * Renders a Tron-styled notification on the page.
 */
function showNotification(text, type = "info", interactive = false, action = null, data = null) {
  const existing = document.getElementById("orion-notif-container");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "orion-notif-container";
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(10, 10, 20, 0.95);
    border: 1px solid ${type === "error" ? "#ff4444" : "#00f3ff"};
    box-shadow: 0 0 15px ${type === "error" ? "rgba(255, 68, 68, 0.5)" : "rgba(0, 243, 255, 0.5)"};
    padding: 15px;
    border-radius: 8px;
    color: #fff;
    z-index: 1000000;
    font-family: 'Inter', sans-serif;
    min-width: 300px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    animation: orionFadeIn 0.5s ease-out;
  `;

  const header = document.createElement("div");
  header.style.cssText = "display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: bold; color: #00f3ff; text-transform: uppercase; letter-spacing: 1px;";
  header.innerHTML = `<span>Orion Neural</span><span style="cursor:pointer" onclick="this.parentElement.parentElement.remove()">✕</span>`;
  container.appendChild(header);

  const body = document.createElement("div");
  body.innerText = text;
  body.style.fontSize = "14px";
  container.appendChild(body);

  if (interactive) {
    const btn = document.createElement("button");
    btn.innerText = "Aceitar Sugestão";
    btn.style.cssText = "margin-top: 12px; background: #00f3ff; color: #000; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;";
    btn.onclick = () => {
      chrome.runtime.sendMessage({ type: "ORION_PROACTIVE_RESPONSE", action, data });
      container.remove();
    };
    container.appendChild(btn);
  }

  document.body.appendChild(container);
  if (!interactive) setTimeout(() => container.remove(), 5000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = \`
  @keyframes orionFadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
\`;
document.head.appendChild(style);
