(() => {
  if (window.__pageLayoutInspectorLoaded) return;
  window.__pageLayoutInspectorLoaded = true;

  const selected = [];
  let inspecting = false;
  let hovered = null;
  let host = null;
  let shadow = null;
  let showBoxModel = true;
  let visualUpdateQueued = false;
  let styleRuleCache = new WeakMap();

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
    .highlight { position: fixed; z-index: 5; display: none; box-sizing: border-box; border: 2px solid #2478ff; background: #2478ff18; box-shadow: 0 0 0 1px #fff; pointer-events: none; }
    .highlight.hover { border-style: dashed; background: #2478ff0b; }
    .highlight-tag { position: absolute; left: -2px; top: -23px; max-width: 220px; padding: 3px 6px; border-radius: 5px 5px 5px 0; color: #fff; background: #2478ff; font: 10px/1.25 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: nowrap; box-shadow: 0 2px 6px #10233e33; }
    .box-zone { position: fixed; z-index: 2; box-sizing: border-box; pointer-events: none; }
    .box-zone.margin { background: #f4a34055; }
    .box-zone.border { background: #f2d45088; }
    .box-zone.padding { background: #32b77b55; }
    .box-zone.content { background: #3485ef18; outline: 1px solid #3485efaa; }
    .box-legend { position: fixed; z-index: 6; max-width: 240px; padding: 5px 7px; border-radius: 5px; color: #344254; background: #fff; font: 9px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; box-shadow: 0 2px 8px #10233e33; pointer-events: none; }
    .ruler-line { position: fixed; z-index: 1; pointer-events: none; border-color: #f03c62; border-style: dashed; }
    .ruler-line.horizontal { height: 0; border-width: 1px 0 0; }
    .ruler-line.vertical { width: 0; border-width: 0 0 0 1px; }
    .ruler-label { position: fixed; z-index: 2; padding: 2px 4px; border-radius: 4px; color: #fff; background: #e83256; font: 9px/1.3 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: nowrap; pointer-events: none; }
    .panel { position: fixed; z-index: 2147483647; top: 16px; right: 16px; width: 338px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden;
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
    .tool.box-toggle { color: #40516a; background: #eef2f7; }
    .tool.box-toggle.on { color: #fff; background: #596b83; }
    .summary { padding: 0 13px 9px; color: #7b8795; font-size: 11px; }
    .list { overflow: auto; padding: 0 10px 10px; flex: 1 1 auto; min-height: 0; }
    .empty { padding: 17px 12px; border: 1px dashed #dce3eb; border-radius: 9px; color: #8a95a3; text-align: center; }
    .card { position: relative; margin: 0 0 8px; padding: 10px; border: 1px solid #e8edf3; border-radius: 9px; background: #fff; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 7px; }
    .selector { min-width: 0; overflow-wrap: anywhere; color: #155ac1; font: 600 11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .hierarchy { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0 0 7px; color: #8994a2; font-size: 9px; }
    .hierarchy button { max-width: 125px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid #e4eaf2; border-radius: 5px; padding: 2px 5px; color: #52647c; background: #f8fafc; font: 9px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .hierarchy button:hover { color: #155ac1; border-color: #bfd5f5; background: #edf4ff; }
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
    .rule-source-content { padding-top: 6px; }
    .copy-css { margin-top: 7px; border: 0; border-radius: 6px; padding: 5px 7px; color: #155ac1; background: #eaf2ff; font-size: 10px; font-weight: 600; }
    .copy-css:hover { background: #dceaff; }
    .copy-status { margin-left: 6px; color: #18805a; font-size: 9px; }
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
      <div class="toolbar"><button class="tool mode">开始测量</button><button class="tool box-toggle on">盒模型：开</button><button class="tool clear">清空选区</button></div>
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
    shadow.querySelector(".box-toggle").addEventListener("click", () => { showBoxModel = !showBoxModel; render(); });
    shadow.querySelector(".clear").addEventListener("click", clearSelections);
    shadow.querySelector(".close").addEventListener("click", () => { setInspecting(false); host.remove(); });
    render();
  }

  function rectOf(element) {
    const rect = element.getBoundingClientRect();
    let left = rect.left, top = rect.top, width = rect.width, height = rect.height;
    let ownerDocument = element.ownerDocument;
    while (ownerDocument && ownerDocument !== document) {
      let frameElement;
      try { frameElement = ownerDocument.defaultView?.frameElement; } catch { break; }
      if (!frameElement) break;
      const frameRect = frameElement.getBoundingClientRect();
      const frameStyle = frameElement.ownerDocument.defaultView.getComputedStyle(frameElement);
      const scaleX = frameElement.offsetWidth ? frameRect.width / frameElement.offsetWidth : 1;
      const scaleY = frameElement.offsetHeight ? frameRect.height / frameElement.offsetHeight : 1;
      left = frameRect.left + (parseFloat(frameStyle.borderLeftWidth) || 0) * scaleX + left * scaleX;
      top = frameRect.top + (parseFloat(frameStyle.borderTopWidth) || 0) * scaleY + top * scaleY;
      width *= scaleX; height *= scaleY;
      ownerDocument = frameElement.ownerDocument;
    }
    return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height };
  }

  function selectorOf(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    const elementDocument = element.ownerDocument;
    let node = element;
    while (node && node.nodeType === 1 && node !== elementDocument.documentElement) {
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
    const style = element.ownerDocument.defaultView.getComputedStyle(element);
    const px = (name) => style.getPropertyValue(name);
    const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180);
    const isImage = element.localName === "img";
    const hasText = Boolean(text);
    const data = {
      tag: element.localName,
      selector: selectorOf(element),
      context: element.getRootNode()?.host ? "shadow-root" : element.ownerDocument !== document ? "same-origin-iframe" : "document",
      contextUrl: element.ownerDocument !== document ? element.ownerDocument.location?.href || "" : "",
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
      computedStyles: readComputedStyles(style),
      styleInfo: { matchedRules: [], inheritedRules: [], unreadableStylesheets: 0, scannedRules: 0, scanLimitReached: false, status: "pending" }
    };
    return data;
  }

  function refreshSelectedGeometry() {
    for (const item of selected) {
      const element = item.__element;
      if (!element?.isConnected) continue;
      const rect = rectOf(element);
      item.x = round(rect.left);
      item.y = round(rect.top);
      item.right = round(rect.right);
      item.bottom = round(rect.bottom);
      item.width = round(rect.width);
      item.height = round(rect.height);
      item.pageX = round(rect.left + window.scrollX);
      item.pageY = round(rect.top + window.scrollY);
    }
  }

  function updateGeometryReadouts() {
    for (const [index, item] of selected.entries()) {
      const metrics = shadow?.querySelector(`.card[data-index="${index}"] .metrics`);
      const rows = metrics?.querySelectorAll(".metric");
      if (!rows || rows.length < 4) continue;
      rows[0].lastChild.textContent = ` ${item.width} × ${item.height}px`;
      rows[2].lastChild.textContent = ` ${item.x}, ${item.y}px`;
      rows[3].lastChild.textContent = ` ${item.pageX}, ${item.pageY}px`;
    }
  }

  function readComputedStyles(style) {
    const values = {};
    for (const group of STYLE_GROUPS) for (const [name] of group.properties) values[name] = style.getPropertyValue(name).trim();
    return values;
  }

  function readStyleRules(element) {
    const root = element.getRootNode();
    let ruleIndex = styleRuleCache.get(root);
    if (!ruleIndex) {
      ruleIndex = buildStyleRuleIndex(element, root);
      styleRuleCache.set(root, ruleIndex);
    }
    const ancestors = [];
    for (let node = element, depth = 0; node?.nodeType === 1 && depth < 7; depth++) {
      ancestors.push(node);
      const root = node.getRootNode();
      node = node.parentElement || root?.host || null;
    }
    const matchedRules = [];
    const inheritedRules = [];
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
        selector: rule.selector || "内联 style 属性",
        matchedOn: matchedNode === element ? "当前元素" : selectorOf(matchedNode),
        source,
        conditions: conditions.join(" / "),
        declarations
      });
    }

    for (const rule of ruleIndex.rules) {
      let match = null;
      for (const node of ancestors) {
        try { if (node.matches(rule.selector)) { match = node; break; } } catch { /* Skip selectors unsupported by Element.matches. */ }
      }
      if (match === element) addRule(matchedRules, rule, rule.source, rule.conditions, match);
      else if (match) addRule(inheritedRules, rule, rule.source, rule.conditions, match, true);
    }

    for (const node of ancestors) {
      if (!node.style?.length) continue;
      const isCurrent = node === element;
      const inlineRule = { selectorText: "内联 style 属性", style: node.style };
      addRule(isCurrent ? matchedRules : inheritedRules, inlineRule, "style 属性", [], node, !isCurrent);
    }

    return { matchedRules, inheritedRules, unreadableStylesheets: ruleIndex.unreadableStylesheets, scannedRules: ruleIndex.scannedRules, scanLimitReached: ruleIndex.scanLimitReached };
  }

  function buildStyleRuleIndex(element, root) {
    const index = { rules: [], unreadableStylesheets: 0, scannedRules: 0, scanLimitReached: false };
    const maxScannedRules = 6000;
    const visitedSheets = new Set();
    const ownerDocument = element.ownerDocument;
    const inShadowRoot = root?.nodeType === 11 && root.host;

    function visitRules(rules, source, conditions = [], depth = 0) {
      if (!rules || depth > 12 || index.scanLimitReached) return;
      for (const rule of rules) {
        index.scannedRules++;
        if (index.scannedRules > maxScannedRules) { index.scanLimitReached = true; return; }
        if (rule.selectorText && rule.style) index.rules.push({ selector: rule.selectorText, style: rule.style, source, conditions });
        const nestedConditions = rule.conditionText || (rule.name && rule.cssRules ? `@${rule.name}` : "");
        if (rule.cssRules) visitRules(rule.cssRules, source, nestedConditions ? [...conditions, nestedConditions] : conditions, depth + 1);
        if (rule.styleSheet) {
          try { visitSheet(rule.styleSheet, rule.href || source, nestedConditions ? [...conditions, nestedConditions] : conditions, depth + 1); }
          catch { index.unreadableStylesheets++; }
        }
        if (index.scanLimitReached) return;
      }
    }

    function visitSheet(sheet, source, conditions = [], depth = 0) {
      if (!sheet || visitedSheets.has(sheet) || depth > 12) return;
      visitedSheets.add(sheet);
      try { visitRules(sheet.cssRules, source, conditions, depth); }
      catch { index.unreadableStylesheets++; }
    }

    const sheets = inShadowRoot
      ? Array.from(root.querySelectorAll("style, link[rel~='stylesheet']")).map((node) => node.sheet).filter(Boolean)
      : Array.from(ownerDocument.styleSheets || []);
    const adoptedSheets = Array.from(inShadowRoot ? root.adoptedStyleSheets || [] : ownerDocument.adoptedStyleSheets || []);
    sheets.forEach((sheet, sheetIndex) => visitSheet(sheet, sheet.href || `${inShadowRoot ? "ShadowRoot" : "内嵌 <style>"} #${sheetIndex + 1}`));
    adoptedSheets.forEach((sheet, sheetIndex) => visitSheet(sheet, sheet.href || `adoptedStyleSheets #${sheetIndex + 1}`));
    return index;
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
        ${renderHierarchy(item)}
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
        ${item.context !== "document" ? `<div class="sub">元素上下文：${escapeHTML(item.context)}${item.contextUrl ? ` · ${escapeHTML(item.contextUrl)}` : ""}</div>` : ""}
        ${item.text ? `<div class="sub">${escapeHTML(item.text)}</div>` : ""}
        ${renderStyleDetails(item, index)}
      </article>`).join("");
      list.querySelectorAll(".remove").forEach((button) => button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.closest(".card").dataset.index);
        selected.splice(index, 1);
        render();
        emitState();
      }));
      list.querySelectorAll(".hierarchy-pick").forEach((button) => button.addEventListener("click", (event) => navigateHierarchy(event.currentTarget)));
      list.querySelectorAll(".rules").forEach((details) => details.addEventListener("toggle", () => {
        if (details.open) loadStyleInfo(selected[Number(details.closest(".card").dataset.index)], details);
      }));
      list.querySelectorAll(".copy-css").forEach((button) => button.addEventListener("click", (event) => copyComputedCSS(Number(event.currentTarget.closest(".card").dataset.index))));
    }
    updateHighlights();
    renderGaps();
    const foot = shadow.querySelector(".foot");
    foot.className = `foot${inspecting ? " on" : ""}`;
    foot.textContent = inspecting ? "测量模式已开启 · 点击元素加入清单 · Esc 停止" : "点击“开始测量”后选择元素 · 可在插件弹窗导出";
    const mode = shadow.querySelector(".mode");
    mode.textContent = inspecting ? "停止测量" : "开始测量";
    mode.classList.toggle("off", inspecting);
    const boxButton = shadow.querySelector(".box-toggle");
    boxButton.textContent = `盒模型：${showBoxModel ? "开" : "关"}`;
    boxButton.classList.toggle("on", showBoxModel);
  }

  function renderHierarchy(item) {
    const element = item.__element;
    if (!element) return "";
    const parents = [];
    for (let node = parentAcrossShadow(element), depth = 1; node && depth <= 4; node = parentAcrossShadow(node), depth++) parents.push({ node, depth });
    const childRoot = element.shadowRoot || element;
    const children = Array.from(childRoot.children || []).slice(0, 5);
    if (!parents.length && !children.length) return "";
    return `<div class="hierarchy"><span>层级</span>${parents.map(({ node, depth }) => `<button class="hierarchy-pick" data-direction="parent" data-depth="${depth}" title="选择上级 ${escapeHTML(elementLabel(node))}">↑ ${escapeHTML(elementLabel(node))}</button>`).join("")}${children.map((node, childIndex) => `<button class="hierarchy-pick" data-direction="child" data-child="${childIndex}" title="选择子级 ${escapeHTML(elementLabel(node))}">↓ ${escapeHTML(elementLabel(node))}</button>`).join("")}</div>`;
  }

  function elementLabel(element) {
    if (!element) return "—";
    const className = Array.from(element.classList || []).slice(0, 1).join("");
    return `${element.localName}${element.id ? `#${element.id}` : ""}${className ? `.${className}` : ""}`;
  }

  function parentAcrossShadow(element) { return element?.parentElement || element?.getRootNode?.().host || null; }

  function navigateHierarchy(button) {
    const card = button.closest(".card");
    const index = Number(card.dataset.index);
    const current = selected[index]?.__element;
    if (!current) return;
    let target = null;
    if (button.dataset.direction === "parent") {
      target = current;
      for (let depth = Number(button.dataset.depth); depth > 0 && target; depth--) target = parentAcrossShadow(target);
    } else target = (current.shadowRoot || current).children?.[Number(button.dataset.child)] || null;
    if (target?.nodeType !== 1) return;
    const duplicateIndex = selected.findIndex((item, itemIndex) => itemIndex !== index && item.__element === target);
    if (duplicateIndex >= 0) selected.splice(index, 1);
    else selected[index] = { ...measure(target), __element: target };
    render();
    emitState();
  }

  function loadStyleInfo(item, details) {
    if (!item || item.styleInfo?.status === "loading" || item.styleInfo?.status === "ready") return;
    item.styleInfo.status = "loading";
    const summary = details.querySelector("summary");
    const content = details.querySelector(".rule-source-content");
    summary.textContent = "匹配规则与继承来源（正在读取…）";
    content.textContent = "正在按需分析可读取的页面样式规则…";
    whenIdle(() => {
      item.styleInfo = { ...readStyleRules(item.__element), status: "ready" };
      if (!details.isConnected) return;
      summary.textContent = `匹配规则与继承来源（${item.styleInfo.matchedRules.length} + ${item.styleInfo.inheritedRules.length}）`;
      content.innerHTML = renderRuleSources(item.styleInfo);
    }).catch((error) => {
      item.styleInfo.status = "error";
      if (!details.isConnected) return;
      summary.textContent = "匹配规则与继承来源（读取失败）";
      content.textContent = `规则读取失败：${error?.message || String(error)}`;
    });
  }

  function whenIdle(callback) {
    return new Promise((resolve, reject) => {
      const run = () => { try { resolve(callback()); } catch (error) { reject(error); } };
      if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 1200 });
      else window.setTimeout(run, 40);
    });
  }

  function renderRuleSources(styleInfo) {
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
    return `${rulesHTML}<div class="rule-empty">${escapeHTML(`${accessNote} ${truncatedNote}`.trim())}</div>`;
  }

  function renderStyleDetails(item, index) {
    const values = item.computedStyles || {};
    const styleInfo = item.styleInfo || { matchedRules: [], inheritedRules: [], unreadableStylesheets: 0, status: "pending" };
    const count = Object.keys(values).length;
    const computed = STYLE_GROUPS.map((group) => `<section class="style-group"><h4>${escapeHTML(group.title)}</h4><div class="style-grid">${group.properties.map(([name, label]) => `<div class="style-row"><span>${escapeHTML(label)}</span><code title="${escapeHTML(values[name] || "（空）")}">${escapeHTML(displayStyleValue(values[name]))}</code></div>`).join("")}</div></section>`).join("");
    const sourceSummary = styleInfo.status === "ready"
      ? `匹配规则与继承来源（${styleInfo.matchedRules.length} + ${styleInfo.inheritedRules.length}）`
      : styleInfo.status === "loading" ? "匹配规则与继承来源（正在读取…）" : styleInfo.status === "error" ? "匹配规则与继承来源（重新展开重试）" : "匹配规则与继承来源（展开后读取）";
    const sourceContent = styleInfo.status === "ready" ? renderRuleSources(styleInfo) : "展开后按需扫描 CSS 规则；计算样式已即时采集。";
    return `<details class="style-details"><summary>CSS 样式详情（${count} 项重点计算样式）</summary><div class="style-content">
      <div class="style-note">上方按类别展示常用计算样式，反映浏览器最终解析值。下方仅列出可读取规则中的相关声明；选择器匹配结果可能受优先级、条件规则或继承影响，并不等同于最终胜出声明。</div>
      ${computed}
      <details class="rules"><summary>${sourceSummary}</summary><div class="rule-source-content">${sourceContent}</div></details>
      <button class="copy-css" type="button">复制计算样式 CSS</button><span class="copy-status" data-index="${index}" aria-live="polite"></span>
    </div></details>`;
  }

  async function copyComputedCSS(index) {
    const item = selected[index];
    const status = shadow.querySelector(`.copy-status[data-index="${index}"]`);
    if (!item) return;
    const declarations = STYLE_GROUPS.flatMap((group) => group.properties.map(([name]) => [name, item.computedStyles?.[name]])).filter(([, value]) => value);
    const snippet = `${item.selector} {\n${declarations.map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(snippet);
      else throw new Error("Clipboard API unavailable");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = snippet;
      textarea.style.cssText = "position:fixed;left:-10000px;top:0;opacity:0";
      shadow.append(textarea);
      textarea.focus(); textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) { if (status) status.textContent = "复制失败"; return; }
    }
    if (status) status.textContent = "CSS 已复制";
  }

  function displayStyleValue(value) {
    const text = String(value || "—");
    return text.length > 180 ? `${text.slice(0, 177)}…` : text;
  }

  let geometryRefreshPending = false;

  function scheduleVisualUpdate(refreshGeometry = false) {
    geometryRefreshPending ||= refreshGeometry;
    if (visualUpdateQueued) return;
    visualUpdateQueued = true;
    requestAnimationFrame(() => {
      visualUpdateQueued = false;
      if (geometryRefreshPending) {
        geometryRefreshPending = false;
        refreshSelectedGeometry();
        updateGeometryReadouts();
        renderGaps();
      }
      updateHighlights();
    });
  }

  function formatSides(sides) { return `${sides.top} ${sides.right} ${sides.bottom} ${sides.left}`; }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function updateHighlights() {
    if (!shadow) return;
    const frame = shadow.querySelector(".frame");
    frame.querySelectorAll(".selected-highlight, .highlight.hover, .box-zone, .box-legend, .ruler-line, .ruler-label").forEach((el) => el.remove());
    const makeBox = (element, index, label, isHover = false) => {
      const rect = rectOf(element);
      const box = document.createElement("div");
      box.className = `highlight${isHover ? " hover" : " selected-highlight"}`;
      const colors = ["#2478ff", "#e55353", "#16a36a", "#9159d8", "#db8b19", "#00a1b2"];
      const color = colors[index % colors.length];
      box.style.cssText = `display:block;left:${rect.left}px;top:${rect.top}px;width:${Math.max(0, rect.width)}px;height:${Math.max(0, rect.height)}px;border-color:${color};background:${color}18`;
      const tag = document.createElement("span");
      tag.className = "highlight-tag";
      tag.style.background = color;
      tag.textContent = label;
      box.append(tag);
      frame.append(box);
      return rect;
    };
    let firstSelectedRect = null;
    for (const [index, item] of selected.entries()) {
      const element = item.__element;
      if (element?.isConnected) {
        const currentRect = rectOf(element);
        const rect = makeBox(element, index, `#${index + 1} ${round(currentRect.width)}×${round(currentRect.height)}px`);
        if (!firstSelectedRect) firstSelectedRect = rect;
      }
    }
    let hoverRect = null;
    if (hovered?.isConnected && inspecting) {
        const rect = rectOf(hovered);
        hoverRect = makeBox(hovered, 0, `${round(rect.width)}×${round(rect.height)}px`, true);
    }
    const boxTarget = inspecting && hovered?.isConnected ? hovered : selected[0]?.__element;
    if (showBoxModel && boxTarget?.isConnected) drawBoxModel(boxTarget, frame);
    if (hoverRect) drawNearestRuler(hovered, hoverRect, frame);
    else if (firstSelectedRect) drawNearestRuler(selected[0].__element, firstSelectedRect, frame, selected.slice(1).map((item) => item.__element));
  }

  function drawBoxModel(element, frame) {
    const rect = rectOf(element);
    const style = element.ownerDocument.defaultView.getComputedStyle(element);
    const scaleX = rect.width && element.offsetWidth ? rect.width / element.offsetWidth : 1;
    const scaleY = rect.height && element.offsetHeight ? rect.height / element.offsetHeight : 1;
    const number = (property, scale = 1) => Math.max(0, (parseFloat(style.getPropertyValue(property)) || 0) * scale);
    const margin = { top: number("margin-top", scaleY), right: number("margin-right", scaleX), bottom: number("margin-bottom", scaleY), left: number("margin-left", scaleX) };
    const border = { top: number("border-top-width", scaleY), right: number("border-right-width", scaleX), bottom: number("border-bottom-width", scaleY), left: number("border-left-width", scaleX) };
    const padding = { top: number("padding-top", scaleY), right: number("padding-right", scaleX), bottom: number("padding-bottom", scaleY), left: number("padding-left", scaleX) };
    const addZone = (kind, left, top, width, height) => {
      if (width <= 0 || height <= 0) return;
      const zone = document.createElement("div");
      zone.className = `box-zone ${kind}`;
      zone.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
      frame.append(zone);
    };
    addZone("margin", rect.left, rect.top - margin.top, rect.width, margin.top);
    addZone("margin", rect.right, rect.top, margin.right, rect.height);
    addZone("margin", rect.left, rect.bottom, rect.width, margin.bottom);
    addZone("margin", rect.left - margin.left, rect.top, margin.left, rect.height);
    addZone("border", rect.left, rect.top, rect.width, border.top);
    addZone("border", rect.right - border.right, rect.top, border.right, rect.height);
    addZone("border", rect.left, rect.bottom - border.bottom, rect.width, border.bottom);
    addZone("border", rect.left, rect.top, border.left, rect.height);
    const innerLeft = rect.left + border.left, innerTop = rect.top + border.top;
    const innerWidth = Math.max(0, rect.width - border.left - border.right), innerHeight = Math.max(0, rect.height - border.top - border.bottom);
    addZone("padding", innerLeft, innerTop, innerWidth, padding.top);
    addZone("padding", innerLeft + innerWidth - padding.right, innerTop, padding.right, innerHeight);
    addZone("padding", innerLeft, innerTop + innerHeight - padding.bottom, innerWidth, padding.bottom);
    addZone("padding", innerLeft, innerTop, padding.left, innerHeight);
    addZone("content", innerLeft + padding.left, innerTop + padding.top, Math.max(0, innerWidth - padding.left - padding.right), Math.max(0, innerHeight - padding.top - padding.bottom));
    const legend = document.createElement("div");
    legend.className = "box-legend";
    legend.textContent = `橙外边距 · 黄边框 · 绿内边距 · 蓝内容${style.transform !== "none" ? "（transform 下为近似边界）" : ""}`;
    legend.style.cssText += `left:${Math.max(4, rect.left)}px;top:${Math.min(window.innerHeight - 24, Math.max(4, rect.bottom + 5))}px`;
    frame.append(legend);
  }

  function gapBetween(a, b) {
    const horizontal = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
    const vertical = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
    return { horizontal, vertical, score: Math.hypot(horizontal, vertical) };
  }

  function drawNearestRuler(element, rect, frame, explicitCandidates = null) {
    let candidates = (explicitCandidates || selected.map((item) => item.__element)).filter((candidate) => candidate?.isConnected && candidate !== element);
    if (!candidates.length) candidates = Array.from(element.parentElement?.children || []).filter((candidate) => candidate !== element && rectOf(candidate).width && rectOf(candidate).height).slice(0, 120);
    let nearest = null;
    for (const candidate of candidates) {
      const candidateRect = rectOf(candidate);
      const gap = gapBetween(rect, candidateRect);
      if (!nearest || gap.score < nearest.gap.score) nearest = { rect: candidateRect, gap };
    }
    if (!nearest) {
      const edgeText = `距视口：上 ${round(rect.top)} · 右 ${round(window.innerWidth - rect.right)} · 下 ${round(window.innerHeight - rect.bottom)} · 左 ${round(rect.left)}px`;
      const label = document.createElement("div");
      label.className = "box-legend"; label.textContent = edgeText;
      label.style.cssText += `left:${Math.max(4, rect.left)}px;top:${Math.max(4, rect.top + 24)}px`;
      frame.append(label);
      return;
    }
    const other = nearest.rect;
    const overlapY1 = Math.max(rect.top, other.top), overlapY2 = Math.min(rect.bottom, other.bottom);
    const y = overlapY1 <= overlapY2 ? (overlapY1 + overlapY2) / 2 : (rect.bottom < other.top ? (rect.bottom + other.top) / 2 : (other.bottom + rect.top) / 2);
    const overlapX1 = Math.max(rect.left, other.left), overlapX2 = Math.min(rect.right, other.right);
    const x = overlapX1 <= overlapX2 ? (overlapX1 + overlapX2) / 2 : (rect.right < other.left ? (rect.right + other.left) / 2 : (other.right + rect.left) / 2);
    const addRuler = (orientation, left, top, length, value) => {
      if (value <= 0) return;
      const line = document.createElement("div");
      line.className = `ruler-line ${orientation}`;
      line.style.cssText += orientation === "horizontal" ? `left:${left}px;top:${top}px;width:${length}px` : `left:${left}px;top:${top}px;height:${length}px`;
      const label = document.createElement("div");
      label.className = "ruler-label"; label.textContent = `${round(value)}px`;
      label.style.cssText += orientation === "horizontal" ? `left:${left + length / 2 - 18}px;top:${top - 18}px` : `left:${left + 5}px;top:${top + length / 2 - 7}px`;
      frame.append(line, label);
    };
    const left = rect.right <= other.left ? rect.right : other.right <= rect.left ? other.right : 0;
    const top = rect.bottom <= other.top ? rect.bottom : other.bottom <= rect.top ? other.bottom : 0;
    addRuler("horizontal", left, y, nearest.gap.horizontal, nearest.gap.horizontal);
    addRuler("vertical", x, top, nearest.gap.vertical, nearest.gap.vertical);
  }

  function renderGaps() {
    if (!shadow) return;
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

  async function getLayout(includeStyleRules = false) {
    refreshSelectedGeometry();
    if (includeStyleRules) {
      for (const item of selected) {
        if (item.styleInfo?.status === "ready") continue;
        item.styleInfo = { ...(await whenIdle(() => readStyleRules(item.__element))), status: "ready" };
      }
    }
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

  const observedDocuments = new WeakSet();
  const observedFrames = new WeakSet();

  function eventElement(event) {
    for (const node of event.composedPath?.() || [event.target]) if (node?.nodeType === 1) return node;
    return event.target?.nodeType === 1 ? event.target : null;
  }

  function handlePointerMove(event) {
    if (!inspecting || event.composedPath?.().includes(host)) return;
    const target = eventElement(event);
    if (!target || target === target.ownerDocument.documentElement || target === target.ownerDocument.body) return;
    hovered = target;
    ensureUI();
    scheduleVisualUpdate();
  }

  function handlePageClick(event) {
    if (!inspecting || event.composedPath?.().includes(host)) return;
    const target = eventElement(event);
    if (!target || target === target.ownerDocument.documentElement) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const existing = selected.findIndex((item) => item.__element === target);
    if (existing >= 0) selected.splice(existing, 1);
    else selected.push({ ...measure(target), __element: target });
    ensureUI();
    render();
    emitState();
  }

  function attachDocument(doc) {
    if (!doc || observedDocuments.has(doc)) return;
    observedDocuments.add(doc);
    doc.addEventListener("pointermove", handlePointerMove, true);
    doc.addEventListener("click", handlePageClick, true);
    doc.addEventListener("keydown", (event) => { if (event.key === "Escape" && inspecting) setInspecting(false); }, true);
    doc.defaultView?.addEventListener("scroll", () => scheduleVisualUpdate(true), true);
    doc.defaultView?.addEventListener("resize", () => scheduleVisualUpdate(true));
    const Observer = doc.defaultView?.MutationObserver;
    if (Observer && doc.documentElement) {
      const observer = new Observer((records) => {
        if (records.some((record) => record.type === "attributes" && /^(LINK|STYLE)$/.test(record.target?.tagName || "") ||
          record.type === "childList" && (isStylesheetNode(record.target) || [...record.addedNodes].some(isStylesheetNode)))) styleRuleCache = new WeakMap();
        attachFrames(doc);
      });
      observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "rel"] });
    }
    attachFrames(doc);
  }

  function attachFrames(doc) {
    for (const frameElement of doc.querySelectorAll("iframe, frame")) {
      if (observedFrames.has(frameElement)) continue;
      observedFrames.add(frameElement);
      frameElement.addEventListener("load", () => attachFrameDocument(frameElement));
      attachFrameDocument(frameElement);
    }
  }

  function attachFrameDocument(frameElement) {
    try {
      const childDocument = frameElement.contentDocument;
      if (childDocument?.documentElement) attachDocument(childDocument);
    } catch { /* Cross-origin frames require host permissions and remain inaccessible. */ }
  }

  function isStylesheetNode(node) {
    if (node?.nodeType !== 1) return false;
    return /^(LINK|STYLE)$/.test(node.tagName) || Boolean(node.querySelector?.("style, link[rel~='stylesheet']"));
  }

  attachDocument(document);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "SET_INSPECTING") sendResponse(setInspecting(message.value));
    else if (message?.type === "CLEAR_SELECTIONS") sendResponse(clearSelections());
    else if (message?.type === "GET_STATE") sendResponse(getState());
    else if (message?.type === "GET_LAYOUT") {
      getLayout(Boolean(message.includeStyleRules)).then(sendResponse).catch((error) => sendResponse({ error: error?.message || String(error) }));
      return true;
    }
    return true;
  });
})();
