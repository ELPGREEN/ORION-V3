/**
 * Orion Proactive Engine — Lifecycle Management
 * Inspired by NemoClaw "Always-on" assistants.
 *
 * Monitors browser events to suggest helpful actions without
 * being intrusive.
 */

let tabHistory = {};
const SIMILAR_TAB_THRESHOLD = 3;

/**
 * Monitors tab navigation to detect patterns.
 */
export async function onTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const domain = url.hostname;

    // Track domain visits in this session
    tabHistory[domain] = (tabHistory[domain] || 0) + 1;

    if (tabHistory[domain] >= SIMILAR_TAB_THRESHOLD) {
      suggestSummary(tabId, domain);
      // Reset after suggestion to avoid spam
      tabHistory[domain] = 0;
    }
  }
}

/**
 * Suggests a summary when multiple tabs from the same domain are open.
 */
function suggestSummary(tabId, domain) {
  console.log(`[Orion Proactive] Detected multiple tabs for ${domain}. Suggesting synthesis.`);
  chrome.tabs.sendMessage(tabId, {
    type: "ORION_NOTIFICATION",
    text: `🔍 Notei que você está pesquisando muito em ${domain}. Quer que eu crie uma síntese de todas as abas abertas?`,
    notifType: "info",
    interactive: true,
    action: "synthesize_domain",
    data: { domain }
  });
}

/**
 * Monitors clipboard for proactive help.
 */
export async function onClipboardChange(text) {
  const urlPattern = /https?:\/\/[^\s]+/i;
  if (urlPattern.test(text)) {
    console.log("[Orion Proactive] URL detected in clipboard. Suggesting scrape.");
    // Notify active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "ORION_NOTIFICATION",
          text: "🔗 URL copiada. Quer que eu extraia o conteúdo para você?",
          notifType: "info",
          interactive: true,
          action: "scrape_clipboard"
        });
      }
    });
  }
}
