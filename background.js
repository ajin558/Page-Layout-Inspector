chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      ["tag", "标签"], ["selector", "选择器"], ["text", "文本"],
      ["x", "视口X"], ["y", "视口Y"], ["pageX", "页面X"], ["pageY", "页面Y"],
      ["width", "可视宽度"], ["height", "可视高度"], ["cssWidth", "CSS宽度"], ["cssHeight", "CSS高度"],
      ["margin", "外边距"], ["padding", "内边距"], ["border", "边框"], ["boxSizing", "box-sizing"],
      ["display", "display"], ["position", "position"], ["gap", "gap"],
      ["rowGap", "row-gap"], ["columnGap", "column-gap"], ["flexDirection", "flex-direction"], ["flexWrap", "flex-wrap"],
      ["justifyContent", "justify-content"], ["alignItems", "align-items"], ["gridTemplateColumns", "grid-template-columns"], ["gridTemplateRows", "grid-template-rows"],
      ["fontFamily", "字体"], ["fontSize", "字号"], ["fontWeight", "字重"], ["lineHeight", "行高"],
      ["color", "文字颜色"], ["imageSrc", "图片地址"], ["naturalWidth", "图片原始宽度"], ["naturalHeight", "图片原始高度"], ["pairwiseGaps", "元素间距"]
    ];
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    content = [columns.map(([, label]) => quote(label)).join(",")];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      content.push(columns.map(([key]) => {
        if (key === "pairwiseGaps") {
          return quote((message.data.pairwiseGaps || []).filter((gap) => gap.from === index + 1 || gap.to === index + 1)
            .map((gap) => `${gap.from}↔${gap.to}:横${gap.horizontal}px/纵${gap.vertical}px`).join("; "));
        }
        const value = row[key];
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
