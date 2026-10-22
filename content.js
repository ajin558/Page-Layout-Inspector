(() => {
  if (window.__pageLayoutInspectorLoaded) return;
  window.__pageLayoutInspectorLoaded = true;

  const selected = [];
  let inspecting = false;
  let hovered = null;
  let host = null;
  let shadow = null;

  const STYLE_GROUPS = [
    { title: "尺寸与盒模型", properties: [["width", "宽度"], ["height", "高度"], ["min-width", "最小宽度"], ["max-width", "最大宽度"], ["min-height", "最小高度"], ["max-height", "最大高度"], ["box-sizing", "盒模型"], ["margin-top", "上外边距"], ["margin-right", "右外边距"], ["margin-bottom", "下外边距"], ["margin-left", "左外边距"], ["padding-top", "上内边距"], ["padding-right", "右内边距"], ["padding-bottom", "下内边距"], ["padding-left", "左内边距"], ["border-top-width", "上边框"], ["border-right-width", "右边框"], ["border-bottom-width", "下边框"], ["border-left-width", "左边框"], ["border-radius", "圆角"]] },
    { title: "定位与布局", properties: [["display", "display"], ["position", "position"], ["top", "top"], ["right", "right"], ["bottom", "bottom"], ["left", "left"], ["z-index", "z-index"], ["float", "float"], ["overflow", "overflow"], ["overflow-x", "overflow-x"], ["overflow-y", "overflow-y"], ["gap", "gap"], ["row-gap", "row-gap"], ["column-gap", "column-gap"], ["flex-direction", "flex-direction"], ["flex-wrap", "flex-wrap"], ["flex-grow", "flex-grow"], ["flex-shrink", "flex-shrink"], ["flex-basis", "flex-basis"], ["justify-content", "justify-content"], ["align-items", "align-items"], ["align-self", "align-self"], ["grid-template-columns", "grid-template-columns"], ["grid-template-rows", "grid-template-rows"], ["grid-column", "grid-column"], ["grid-row", "grid-row"]] },
    { title: "文字与字体", properties: [["font-family", "字体"], ["font-size", "字号"], ["font-weight", "字重"], ["font-style", "字形"], ["line-height", "行高"], ["letter-spacing", "字距"], ["word-spacing", "词距"], ["color", "文字颜色"], ["text-align", "对齐方式"], ["text-decoration-line", "文字装饰"], ["text-transform", "大小写转换"], ["white-space", "空白处理"], ["word-break", "断词方式"], ["direction", "文字方向"]] },
    { title: "外观与效果", properties: [["background-color", "背景颜色"], ["opacity", "透明度"], ["visibility", "可见性"], ["border-top-style", "上边框样式"], ["border-top-color", "上边框颜色"], ["box-shadow", "阴影"], ["object-fit", "图片填充"], ["aspect-ratio", "宽高比"], ["transform", "变换"], ["cursor", "鼠标指针"]] }
  ];
  const STYLE_PROPERTY_NAMES = new Set(STYLE_GROUPS.flatMap((group) => group.properties.map(([name]) => name)));
  const RULE_PROPERTY_NAMES = new Set([
    ...STYLE_PROPERTY_NAMES, "margin", "padding", "border", "border-width", "border-style", "border-color", "border-radius",
    "font", "text-decoration", "background", "flex", "grid", "inset", "overflow", "place-items", "place-content"
  ]);
  const INHERITED_PROPERTY_NAMES = new Set([
    "color", "font", "font-family", "font-size", "font-style", "font-weight", "font-variant", "line-height", "letter-spacing",
    "word-spacing", "text-align", "text-indent", "text-transform", "visibility", "white-space", "word-break", "overflow-wrap", "direction", "cursor"
  ]);

  const cssText = `
    :host { all: initial; color: #182230; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .frame { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
    .highlight { position: fixed; display: none; border: 2px solid #2478ff; background: #2478ff18; box-shadow: 0 0 0 1px #fff; pointer-events: none; }
    .highlight.hover { border-style: dashed; background: #2478ff0b; }
    .panel { position: fixed; top: 16px; right: 16px; width: 338px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden;
      pointer-events: auto; border: 1px solid #e1e7ef; border-radius: 13px; background: #fff; box-shadow: 0 14px 48px #10233e2b;
      color: #17212b; font-size: 12px; line-height: 1.45; }
    .head { display: flex; align-items: center; justify-content: space-between; padding: 12px 13px; border-bottom: 1px solid #edf0f4; background: #fbfcfe; }
    .title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; }
    .badge { width: 23px; height: 23px; display: grid; place-items: center; border-radius: 7px; color: white; background: #1769e8; }
    .close { border: 0; background: transparent; color: #8390a0; cursor: pointer; font-size: 18px; line-height: 1; }
    .toolbar { display: flex; gap: 6px; padding: 10px 12px 8px; }
    button { font: inherit; cursor: pointer; }
    .tool { border: 0; border-radius: 7px; padding: 7px 9px; color: #235bb1; background: #eaf2ff; font-size: 11px; font-weight: 600; }
    .tool:hover { background: #dceaff; }
    .tool.mode { color: white; background: #1769e8; }
    .tool.mode.off { color: #435063; background: #e9edf2; }
    .summary { padding: 0 13px 9px; color: #7b8795; font-size: 11px; }
    .list { overflow: auto; padding: 0 10px 10px; flex: 1 1 auto; min-height: 0; }
    .empty { padding: 17px 12px; border: 1px dashed #dce3eb; border-radius: 9px; color: #8a95a3; text-align: center; }
    .card { position: relative; margin: 0 0 8px; padding: 10px; border: 1px solid #e8edf3; border-radius: 9px; background: #fff; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 7px; }
    .selector { min-width: 0; overflow-wrap: anywhere; color: #155ac1; font: 600 11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .remove { flex: 0 0 auto; border: 0; color: #a1aab5; background: transparent; cursor: pointer; font-size: 15px; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 10px; color: #596678; font-size: 10px; }
    .metric b { color: #243144; font-weight: 600; }
    .sub { margin-top: 7px; padding-top: 7px; border-top: 1px solid #f0f2f5; color: #7b8795; font-size: 10px; overflow-wrap: anywhere; }
    .gaps { margin: 0 10px 10px; padding: 9px 10px; border-radius: 8px; background: #f4f7fb; }
    .gaps strong { display: block; margin-bottom: 4px; color: #445164; font-size: 10px; }
    .gap-row { padding: 2px 0; color: #707d8d; font-size: 10px; }
    .style-details { margin-top: 9px; border-top: 1px solid #f0f2f5; padding-top: 7px; }
    .style-details > summary, .principles > summary, .rules > summary { color: #155ac1; cursor: pointer; font-size: 10px; font-weight: 700; }
    .style-content { padding-top: 7px; }
    .style-group { margin: 0 0 8px; }
    .style-group h4 { margin: 0 0 4px; color: #445164; font-size: 10px; }
    .style-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 3px 8px; }
    .style-row { display: contents; }
    .style-row span { color: #7b8795; overflow-wrap: anywhere; }
    .style-row code { color: #27364a; font: 10px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; overflow-wrap: anywhere; }
    .rules { margin-top: 8px; padding-top: 7px; border-top: 1px solid #f0f2f5; }
    .rule { margin-top: 7px; padding: 7px; border-radius: 6px; background: #f5f7fa; }
    .rule-head { display: flex; flex-direction: column; gap: 2px; }
    .rule-selector { color: #155ac1; font: 10px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; overflow-wrap: anywhere; }
    .rule-source, .rule-condition, .rule-empty { color: #7b8795; font-size: 9px; overflow-wrap: anywhere; }
    .rule pre { margin: 5px 0 0; color: #445164; font: 9px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .style-note { margin: 0 0 8px; padding: 7px; border-radius: 6px; color: #657386; background: #f4f7fb; font-size: 9px; }
    .principles { margin: 0 10px 10px; padding: 8px 10px; border-radius: 8px; background: #f4f7fb; }
    .principles-body { padding-top: 6px; color: #707d8d; font-size: 9px; }
    .principles-body div { margin-top: 4px; }
    .foot { padding: 8px 13px; border-top: 1px solid #edf0f4; color: #8a95a3; font-size: 10px; }
    .foot.on { color: #1769e8; }
    .panel * { box-sizing: border-box; }
  `;

  function ensureUI() {
    if (host?.isConnected) return;
    host = document.createElement("div");
    host.id = "__page_layout_inspector_host";
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = cssText;
    const frame = document.createElement("div");
    frame.className = "frame";
    frame.innerHTML = `<div class="highlight hover"></div><section class="panel" aria-label="页面布局测量器">
      <div class="head"><div class="title"><span class="badge">尺</span>页面布局测量器</div><button class="close" title="关闭面板" aria-label="关闭">×</button></div>
      <div class="toolbar"><button class="tool mode">开始测量</button><button class="tool clear">清空选区</button></div>
      <div class="summary">已选中 <b class="count">0</b> 个元素</div>
      <div class="list"></div><div class="gaps" hidden></div>
      <details class="principles"><summary>测量原理与样式说明</summary><div class="principles-body">
        <div><b>可视尺寸/视口位置</b>：读取浏览器布局后的边界矩形（CSS 像素）；页面坐标是在视口坐标上加滚动距离。</div>
        <div><b>CSS 计算样式</b>：读取浏览器完成级联、继承后的样式。CSS 宽高与可视尺寸可能因盒模型、边框或 transform 而不同。</div>
        <div><b>规则来源</b>：列出当前元素及近层祖先中可读取且匹配的 CSS 规则；匹配规则不代表每条声明都是最终胜出值。</div>
        <div><b>间距</b>：分别计算两个矩形在横向和纵向的边界间隔，轴向重叠时该方向记为 0。</div>
      </div></details>
      <div class="foot">点击页面元素加入清单 · Esc 停止测量</div>
    </section>`;
    shadow.append(style, frame);
    document.documentElement.append(host);
    shadow.querySelector(".mode").addEventListener("click", () => setInspecting(!inspecting));
    shadow.querySelector(".clear").addEventListener("click", clearSelections);
    shadow.querySelector(".close").addEventListener("click", () => { setInspecting(false); host.remove(); });
    render();
  }

  function rectOf(element) {
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  }

  function selectorOf(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let node = element;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      let part = node.localName;
      if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
      const classes = Array.from(node.classList || []).slice(0, 2);
      if (classes.length) part += `.${classes.map((name) => CSS.escape(name)).join(".")}`;
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((item) => item.localName === node.localName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
      if (parts.length >= 5) break;
    }
    return parts.join(" > ");
  }

  function measure(element) {
    const rect = rectOf(element);
    const style = getComputedStyle(element);
    const px = (name) => style.getPropertyValue(name);
    const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180);
    const isImage = element instanceof HTMLImageElement;
    const hasText = Boolean(text);
    const data = {
      tag: element.localName,
      selector: selectorOf(element),
      text,
      x: round(rect.x), y: round(rect.y), right: round(rect.right), bottom: round(rect.bottom),
      pageX: round(rect.x + window.scrollX), pageY: round(rect.y + window.scrollY),
      width: round(rect.width), height: round(rect.height),
      cssWidth: px("width"), cssHeight: px("height"), boxSizing: style.boxSizing,
      margin: { top: px("margin-top"), right: px("margin-right"), bottom: px("margin-bottom"), left: px("margin-left") },
      padding: { top: px("padding-top"), right: px("padding-right"), bottom: px("padding-bottom"), left: px("padding-left") },
      border: { top: px("border-top-width"), right: px("border-right-width"), bottom: px("border-bottom-width"), left: px("border-left-width") },
      display: style.display, position: style.position,
      gap: px("gap"), rowGap: px("row-gap"), columnGap: px("column-gap"),
      flexDirection: px("flex-direction"), flexWrap: px("flex-wrap"), justifyContent: px("justify-content"), alignItems: px("align-items"),
      gridTemplateColumns: px("grid-template-columns"), gridTemplateRows: px("grid-template-rows"),
      overflow: style.overflow, zIndex: style.zIndex,
      fontFamily: hasText ? style.fontFamily : "", fontSize: hasText ? style.fontSize : "", fontWeight: hasText ? style.fontWeight : "",
      lineHeight: hasText ? style.lineHeight : "", letterSpacing: hasText ? style.letterSpacing : "", color: hasText ? style.color : "",
      textAlign: hasText ? style.textAlign : "", textDecoration: hasText ? style.textDecorationLine : "",
      imageSrc: isImage ? element.currentSrc || element.src : "",
      naturalWidth: isImage ? element.naturalWidth : "", naturalHeight: isImage ? element.naturalHeight : "",
      computedStyles: readComputedStyles(style), styleInfo: readStyleRules(element)
    };
    return data;
  }

  function readComputedStyles(style) {
    const values = {};
    for (const group of STYLE_GROUPS) for (const [name] of group.properties) values[name] = style.getPropertyValue(name).trim();
    return values;
  }

  function readStyleRules(element) {
    const matchedRules = [];
    const inheritedRules = [];
    const ancestors = [];
    for (let node = element, depth = 0; node instanceof Element && depth < 7; node = node.parentElement, depth++) ancestors.push(node);
    let unreadableStylesheets = 0;
    let scannedRules = 0;
    let scanLimitReached = false;
    const maxScannedRules = 6000;
    const maxDirectRules = 16;
    const maxInheritedRules = 10;
    const maxDeclarationsPerRule = 40;

    function captureDeclarations(style, inheritedOnly = false) {
      const declarations = {};
      for (let index = 0; index < style.length; index++) {
        const name = style.item(index);
        if (!RULE_PROPERTY_NAMES.has(name) || (inheritedOnly && !INHERITED_PROPERTY_NAMES.has(name))) continue;
        const rawValue = style.getPropertyValue(name).trim();
        const value = rawValue.length > 240 ? `${rawValue.slice(0, 237)}…` : rawValue;
        declarations[name] = `${value}${style.getPropertyPriority(name) ? " !important" : ""}`;
        if (Object.keys(declarations).length >= maxDeclarationsPerRule) break;
      }
      return declarations;
    }

    function addRule(target, rule, source, conditions, matchedNode, inheritedOnly = false) {
      if (target.length >= (inheritedOnly ? maxInheritedRules : maxDirectRules)) return;
      const declarations = captureDeclarations(rule.style, inheritedOnly);
      if (!Object.keys(declarations).length) return;
      target.push({
        selector: rule.selectorText || "内联 style 属性",
        matchedOn: matchedNode === element ? "当前元素" : selectorOf(matchedNode),
        source,
        conditions: conditions.join(" / "),
        declarations
      });
    }

    function visitRules(rules, source, conditions = [], depth = 0) {
      if (!rules || depth > 12 || scanLimitReached) return;
      for (const rule of rules) {
        scannedRules++;
        if (scannedRules > maxScannedRules) { scanLimitReached = true; return; }
        if (rule.selectorText && rule.style) {
          let match = null;
          for (const node of ancestors) {
            try { if (node.matches(rule.selectorText)) { match = node; break; } } catch { /* Skip selectors unsupported by Element.matches. */ }
          }
          if (match === element) addRule(matchedRules, rule, source, conditions, match);
          else if (match) addRule(inheritedRules, rule, source, conditions, match, true);
        }
        const nestedConditions = rule.conditionText || (rule.name && rule.cssRules ? `@${rule.name}` : "");
        if (rule.cssRules) visitRules(rule.cssRules, source, nestedConditions ? [...conditions, nestedConditions] : conditions, depth + 1);
        if (rule.styleSheet) {
          try { visitSheet(rule.styleSheet, rule.href || source, nestedConditions ? [...conditions, nestedConditions] : conditions, depth + 1); }
          catch { unreadableStylesheets++; }
        }
        if (scanLimitReached) return;
      }
    }

    const visitedSheets = new Set();
    function visitSheet(sheet, source, conditions = [], depth = 0) {
      if (!sheet || visitedSheets.has(sheet) || depth > 12) return;
      visitedSheets.add(sheet);
      try { visitRules(sheet.cssRules, source, conditions, depth); }
      catch { unreadableStylesheets++; }
    }

    const sheets = Array.from(document.styleSheets || []);
    const adoptedSheets = Array.from(document.adoptedStyleSheets || []);
    sheets.forEach((sheet, index) => visitSheet(sheet, sheet.href || `内嵌 <style> #${index + 1}`));
    adoptedSheets.forEach((sheet, index) => visitSheet(sheet, sheet.href || `adoptedStyleSheets #${index + 1}`));

    for (const node of ancestors) {
      if (!node.style?.length) continue;
      const isCurrent = node === element;
      const inlineRule = { selectorText: "内联 style 属性", style: node.style };
      addRule(isCurrent ? matchedRules : inheritedRules, inlineRule, "style 属性", [], node, !isCurrent);
    }

    return { matchedRules, inheritedRules, unreadableStylesheets, scannedRules, scanLimitReached };
  }

  function round(value) { return Math.round(value * 100) / 100; }

  function render() {
    if (!shadow?.querySelector(".panel")) return;
    shadow.querySelector(".count").textContent = String(selected.length);
    const list = shadow.querySelector(".list");
    if (!selected.length) {
      list.innerHTML = `<div class="empty">开启测量后点击页面中的元素<br>可查看尺寸、位置和样式</div>`;
    } else {
      list.innerHTML = selected.map((item, index) => `<article class="card" data-index="${index}">
        <div class="card-head"><div class="selector">${escapeHTML(item.selector)}</div><button class="remove" title="移除此元素">×</button></div>
        <div class="metrics">
          <div class="metric"><b>可视尺寸</b> ${item.width} × ${item.height}px</div>
          <div class="metric"><b>CSS尺寸</b> ${escapeHTML(item.cssWidth)} × ${escapeHTML(item.cssHeight)}</div>
          <div class="metric"><b>视口位置</b> ${item.x}, ${item.y}px</div>
          <div class="metric"><b>页面位置</b> ${item.pageX}, ${item.pageY}px</div>
          <div class="metric"><b>盒模型</b> ${escapeHTML(item.boxSizing)}</div>
          <div class="metric"><b>外边距</b> ${escapeHTML(formatSides(item.margin))}</div>
          <div class="metric"><b>内边距</b> ${escapeHTML(formatSides(item.padding))}</div>
          <div class="metric"><b>显示</b> ${escapeHTML(item.display)} · ${escapeHTML(item.position)}</div>
          <div class="metric"><b>布局间隔</b> ${escapeHTML(item.gap || "normal")}</div>
        </div>
        ${item.fontFamily ? `<div class="sub">字体：${escapeHTML(item.fontFamily)} · ${escapeHTML(item.fontSize)} / ${escapeHTML(item.fontWeight)} · 行高 ${escapeHTML(item.lineHeight)}</div>` : ""}
        ${item.display.includes("flex") || item.display.includes("grid") ? `<div class="sub">布局：${escapeHTML(item.display)} · 主轴 ${escapeHTML(item.flexDirection || "—")} · 对齐 ${escapeHTML(item.justifyContent)} / ${escapeHTML(item.alignItems)} · 间隔 ${escapeHTML(item.rowGap)} × ${escapeHTML(item.columnGap)}</div>` : ""}
        ${item.imageSrc ? `<div class="sub">图片原始尺寸：${item.naturalWidth} × ${item.naturalHeight}px</div>` : ""}
        ${item.text ? `<div class="sub">${escapeHTML(item.text)}</div>` : ""}
        ${renderStyleDetails(item)}
      </article>`).join("");
      list.querySelectorAll(".remove").forEach((button) => button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.closest(".card").dataset.index);
        selected.splice(index, 1);
        render();
      }));
    }
    updateHighlights();
    renderGaps();
    const foot = shadow.querySelector(".foot");
    foot.className = `foot${inspecting ? " on" : ""}`;
    foot.textContent = inspecting ? "测量模式已开启 · 点击元素加入清单 · Esc 停止" : "点击“开始测量”后选择元素 · 可在插件弹窗导出";
    const mode = shadow.querySelector(".mode");
    mode.textContent = inspecting ? "停止测量" : "开始测量";
    mode.classList.toggle("off", inspecting);
  }

  function renderStyleDetails(item) {
    const values = item.computedStyles || {};
    const styleInfo = item.styleInfo || { matchedRules: [], inheritedRules: [], unreadableStylesheets: 0 };
    const count = Object.keys(values).length;
    const computed = STYLE_GROUPS.map((group) => `<section class="style-group"><h4>${escapeHTML(group.title)}</h4><div class="style-grid">${group.properties.map(([name, label]) => `<div class="style-row"><span>${escapeHTML(label)}</span><code title="${escapeHTML(values[name] || "（空）")}">${escapeHTML(displayStyleValue(values[name]))}</code></div>`).join("")}</div></section>`).join("");
    const directRules = styleInfo.matchedRules || [];
    const inheritedRules = styleInfo.inheritedRules || [];
    const ruleList = [...directRules.map((rule) => ({ ...rule, isInherited: false })), ...inheritedRules.map((rule) => ({ ...rule, isInherited: true }))];
    const rulesHTML = ruleList.length ? ruleList.map((rule) => {
      const declarations = Object.entries(rule.declarations || {}).map(([name, value]) => `  ${name}: ${value};`).join("\n");
      return `<div class="rule"><div class="rule-head"><span class="rule-selector">${rule.isInherited ? `祖先 ${escapeHTML(rule.matchedOn)} · ` : ""}${escapeHTML(rule.selector)}</span><span class="rule-source">${escapeHTML(rule.source)}</span>${rule.conditions ? `<span class="rule-condition">${escapeHTML(rule.conditions)}</span>` : ""}</div><pre>${escapeHTML(declarations)}</pre></div>`;
    }).join("") : `<div class="rule-empty">没有找到可展示的匹配规则；计算样式仍可查看。</div>`;
    const accessNote = styleInfo.unreadableStylesheets
      ? `另有 ${styleInfo.unreadableStylesheets} 个跨域或受限样式表无法读取规则源码。`
      : "跨域样式表可能限制规则源码读取。";
    const truncatedNote = styleInfo.scanLimitReached ? "规则扫描已达到保护上限，结果可能不完整。" : "";
    return `<details class="style-details"><summary>CSS 样式详情（${count} 项重点计算样式）</summary><div class="style-content">
      <div class="style-note">上方按类别展示常用计算样式，反映浏览器最终解析值。下方仅列出可读取规则中的相关声明；选择器匹配结果可能受优先级、条件规则或继承影响，并不等同于最终胜出声明。</div>
      ${computed}
      <details class="rules"><summary>匹配规则与继承来源（${directRules.length} + ${inheritedRules.length}）</summary>${rulesHTML}<div class="rule-empty">${escapeHTML(`${accessNote} ${truncatedNote}`.trim())}</div></details>
    </div></details>`;
  }

  function displayStyleValue(value) {
    const text = String(value || "—");
    return text.length > 180 ? `${text.slice(0, 177)}…` : text;
  }

  function formatSides(sides) { return `${sides.top} ${sides.right} ${sides.bottom} ${sides.left}`; }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function updateHighlights() {
    if (!shadow) return;
    const frame = shadow.querySelector(".frame");
    frame.querySelectorAll(".selected-highlight").forEach((el) => el.remove());
    const makeBox = (rect, isHover = false, index = 0) => {
      const box = document.createElement("div");
      box.className = `highlight${isHover ? " hover" : " selected-highlight"}`;
      const colors = ["#2478ff", "#e55353", "#16a36a", "#9159d8", "#db8b19", "#00a1b2"];
      const color = colors[index % colors.length];
      box.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${Math.max(0, rect.width)}px;height:${Math.max(0, rect.height)}px;border-color:${color};background:${color}18`;
      frame.append(box);
    };
    for (const item of selected) {
      const element = item.__element;
      if (element?.isConnected) makeBox(element.getBoundingClientRect(), false, selected.indexOf(item));
    }
    const hoverBox = frame.querySelector(".highlight:not(.selected-highlight)");
    if (hovered?.isConnected && inspecting) {
      const rect = hovered.getBoundingClientRect();
      if (hoverBox) {
        hoverBox.style.display = "block";
        hoverBox.style.left = `${rect.left}px`; hoverBox.style.top = `${rect.top}px`;
        hoverBox.style.width = `${Math.max(0, rect.width)}px`; hoverBox.style.height = `${Math.max(0, rect.height)}px`;
      }
    } else if (hoverBox) hoverBox.style.display = "none";
  }

  function renderGaps() {
    const section = shadow.querySelector(".gaps");
    if (selected.length < 2) { section.hidden = true; section.innerHTML = ""; return; }
    const pairs = [];
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = selected[i], b = selected[j];
        const gapX = Math.max(0, Math.max(a.x - b.right, b.x - a.right));
        const gapY = Math.max(0, Math.max(a.y - b.bottom, b.y - a.bottom));
        pairs.push(`<div class="gap-row">${i + 1} ↔ ${j + 1}：横向 ${round(gapX)}px · 纵向 ${round(gapY)}px</div>`);
      }
    }
    section.hidden = false;
    section.innerHTML = `<strong>选中元素之间的最小边界距离</strong>${pairs.join("")}`;
  }

  function setInspecting(value) {
    inspecting = Boolean(value);
    ensureUI();
    render();
    if (!inspecting) { hovered = null; updateHighlights(); }
    emitState();
    return getState();
  }

  function clearSelections() { selected.length = 0; render(); emitState(); return getState(); }

  function getState() { return { inspecting, selectedCount: selected.length }; }

  function getLayout() {
    const elements = selected.map(({ __element, ...item }) => ({ ...item }));
    const gaps = [];
    for (let i = 0; i < elements.length; i++) for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i], b = elements[j];
      gaps.push({ from: i + 1, to: j + 1, horizontal: round(Math.max(0, Math.max(a.x - b.right, b.x - a.right))), vertical: round(Math.max(0, Math.max(a.y - b.bottom, b.y - a.bottom))) });
    }
    return {
      data: {
        page: { title: document.title, url: location.href, capturedAt: new Date().toISOString(), viewport: { width: window.innerWidth, height: window.innerHeight }, scroll: { x: window.scrollX, y: window.scrollY } },
        elements, pairwiseGaps: gaps
      },
      state: getState()
    };
  }

  function emitState() {
    try { chrome.runtime.sendMessage({ type: "LAYOUT_STATE_CHANGED", state: getState() }); } catch { /* Popup may be closed. */ }
  }

  document.addEventListener("pointermove", (event) => {
    if (!inspecting || event.composedPath().includes(host)) return;
    const target = event.target;
    if (!(target instanceof Element) || target === document.documentElement || target === document.body) return;
    hovered = target;
    ensureUI();
    updateHighlights();
  }, true);

  document.addEventListener("click", (event) => {
    if (!inspecting || event.composedPath().includes(host)) return;
    const target = event.target;
    if (!(target instanceof Element) || target === document.documentElement) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const existing = selected.findIndex((item) => item.__element === target);
    if (existing >= 0) selected.splice(existing, 1);
    else selected.push({ ...measure(target), __element: target });
    ensureUI();
    render();
    emitState();
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && inspecting) setInspecting(false);
  }, true);
  window.addEventListener("scroll", () => updateHighlights(), true);
  window.addEventListener("resize", () => updateHighlights());

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "SET_INSPECTING") sendResponse(setInspecting(message.value));
    else if (message?.type === "CLEAR_SELECTIONS") sendResponse(clearSelections());
    else if (message?.type === "GET_STATE") sendResponse(getState());
    else if (message?.type === "GET_LAYOUT") sendResponse(getLayout());
    return true;
  });
})();
