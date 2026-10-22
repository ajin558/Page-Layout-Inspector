const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const countText = document.getElementById("countText");
const message = document.getElementById("message");
let activeTabId = null;

function setMessage(text = "") { message.textContent = text; }

function updateState(state) {
  statusDot.className = `status-dot${state?.inspecting ? " active" : ""}`;
  statusText.textContent = state?.inspecting ? "测量模式已开启" : "当前网页已就绪";
  countText.textContent = `已选中 ${state?.selectedCount || 0} 个元素`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  if (!activeTabId) throw new Error("找不到当前标签页。");
  return tab;
}

async function sendToPage(messageObject) {
  const tab = await getActiveTab();
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch (error) {
    const detail = error?.message || String(error);
    throw new Error(`脚本注入失败：${detail}。如果刚安装或更新扩展，请先在扩展管理页重载扩展，再刷新此网页。`);
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, messageObject);
  } catch (error) {
    const detail = error?.message || String(error);
    throw new Error(`页面脚本没有响应：${detail}。请重载扩展并刷新此网页后重试。`);
  }
}

async function refresh() {
  setMessage("");
  try {
    await getActiveTab();
    const state = await sendToPage({ type: "GET_STATE" });
    updateState(state);
  } catch (error) {
    statusDot.className = "status-dot error";
    statusText.textContent = "无法连接当前网页";
    countText.textContent = "重载扩展并刷新网页后重试";
    setMessage(error.message);
  }
}

document.getElementById("startButton").addEventListener("click", async () => {
  try { updateState(await sendToPage({ type: "SET_INSPECTING", value: true })); setMessage(""); }
  catch (error) { setMessage(error.message); }
});
document.getElementById("stopButton").addEventListener("click", async () => {
  try { updateState(await sendToPage({ type: "SET_INSPECTING", value: false })); setMessage(""); }
  catch (error) { setMessage(error.message); }
});
document.getElementById("clearButton").addEventListener("click", async () => {
  try { updateState(await sendToPage({ type: "CLEAR_SELECTIONS" })); setMessage(""); }
  catch (error) { setMessage(error.message); }
});

async function exportLayout(format) {
  setMessage("");
  try {
    const response = await sendToPage({ type: "GET_LAYOUT" });
    if (!response?.data?.elements?.length) throw new Error("请先在网页上选择至少一个元素。");
    const result = await chrome.runtime.sendMessage({ type: "DOWNLOAD_LAYOUT", format, data: response.data });
    if (!result?.ok) throw new Error(result?.error || "导出失败，请重试。");
    setMessage(`已导出 ${response.data.elements.length} 个元素。`);
    updateState({ ...response.state, selectedCount: response.data.elements.length });
  } catch (error) { setMessage(error.message); }
}

document.getElementById("jsonButton").addEventListener("click", () => exportLayout("json"));
document.getElementById("csvButton").addEventListener("click", () => exportLayout("csv"));
refresh();
