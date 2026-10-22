chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CAPTURE_ANNOTATED_SCREENSHOT" && Number.isInteger(message.tabId)) {
    chrome.tabs.get(message.tabId, (tab) => {
      if (chrome.runtime.lastError || typeof tab?.windowId !== "number") {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message || "无法找到当前浏览器窗口。" });
        return;
      }
      chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          sendResponse({ ok: false, error: chrome.runtime.lastError?.message || "浏览器未能截取当前页面。" });
          return;
        }
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        chrome.downloads.download({ url: dataUrl, filename: `page-layout-annotated-${stamp}.png`, saveAs: true }, (downloadId) => {
          const error = chrome.runtime.lastError;
          sendResponse(error ? { ok: false, error: error.message } : { ok: true, downloadId });
        });
      });
    });
    return true;
  }

  if (message?.type !== "DOWNLOAD_LAYOUT" || !message.data || !message.format) return;

  const rows = Array.isArray(message.data.elements) ? message.data.elements : [];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `page-layout-${stamp}.${message.format}`;
  let content;
  let mime;

  if (message.format === "json") {
    content = JSON.stringify(message.data, null, 2);
    mime = "application/json;charset=utf-8";
  } else {
    const columns = [
      ["tag", "标签"], ["selector", "选择器"], ["context", "元素上下文"], ["contextUrl", "上下文页面"], ["text", "文本"],
      ["viewportWidth", "视口宽度"], ["viewportHeight", "视口高度"], ["devicePixelRatio", "设备像素比 DPR"], ["visualScale", "视觉视口缩放"], ["scrollX", "页面滚动 X"], ["scrollY", "页面滚动 Y"],
      ["x", "视口X"], ["y", "视口Y"], ["pageX", "页面X"], ["pageY", "页面Y"],
      ["width", "可视宽度"], ["height", "可视高度"], ["cssWidth", "CSS宽度"], ["cssHeight", "CSS高度"],
      ["margin", "外边距"], ["padding", "内边距"], ["border", "边框"], ["boxSizing", "box-sizing"],
      ["display", "display"], ["position", "position"], ["gap", "gap"],
      ["rowGap", "row-gap"], ["columnGap", "column-gap"], ["flexDirection", "flex-direction"], ["flexWrap", "flex-wrap"],
      ["justifyContent", "justify-content"], ["alignItems", "align-items"], ["gridTemplateColumns", "grid-template-columns"], ["gridTemplateRows", "grid-template-rows"],
      ["fontFamily", "字体"], ["fontSize", "字号"], ["fontWeight", "字重"], ["lineHeight", "行高"],
      ["color", "文字颜色"], ["computedStyles", "常用计算样式"], ["styleInfo", "CSS规则与继承来源"],
      ["imageSrc", "图片地址"], ["naturalWidth", "图片原始宽度"], ["naturalHeight", "图片原始高度"], ["pairwiseGaps", "元素间距"]
    ];
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const page = message.data.page || {};
    const pageValue = {
      viewportWidth: page.viewport?.width,
      viewportHeight: page.viewport?.height,
      devicePixelRatio: page.viewport?.devicePixelRatio,
      visualScale: page.viewport?.visualScale,
      scrollX: page.scroll?.x,
      scrollY: page.scroll?.y
    };
    content = [columns.map(([, label]) => quote(label)).join(",")];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      content.push(columns.map(([key]) => {
        if (key === "pairwiseGaps") {
          return quote((message.data.pairwiseGaps || []).filter((gap) => gap.from === index + 1 || gap.to === index + 1)
            .map((gap) => `${gap.from}↔${gap.to}:横${gap.horizontal}px/纵${gap.vertical}px`).join("; "));
        }
        const value = row[key] ?? pageValue[key];
        return quote(value && typeof value === "object" ? JSON.stringify(value) : value);
      }).join(","));
    }
    content = "\uFEFF" + content.join("\r\n");
    mime = "text/csv;charset=utf-8";
  }

  const url = `data:${mime},${encodeURIComponent(content)}`;
  chrome.downloads.download({ url, filename, saveAs: true }, (downloadId) => {
    const error = chrome.runtime.lastError;
    sendResponse(error ? { ok: false, error: error.message } : { ok: true, downloadId, filename });
  });
  return true;
});
