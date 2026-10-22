# 页面布局测量器 | Page Layout Inspector

一个 Chrome Manifest V3 扩展，用于在当前网页上测量元素的尺寸、位置、盒模型、布局样式和元素间距，并导出 JSON 或 CSV 清单。

A Chrome Manifest V3 extension for measuring element dimensions, positions, box model, layout styles, and spacing on the current page, with JSON and CSV export.

## 功能 | Features

- 点击页面元素加入或移出测量清单；高亮显示所选元素。
- 查看可视宽高、CSS 宽高、视口坐标、页面坐标、内边距、外边距和边框。
- 查看 `display`、`position`、`gap`、Flex 和 Grid 属性。
- 对含文字的元素显示字体、字号、字重、行高、字距、颜色和对齐方式。
- 展开元素详情查看分组后的常用计算 CSS 样式、匹配规则及近层祖先的继承来源。
- 在页面检查器中查看尺寸、坐标、CSS 级联和间距的测量原理说明。
- 用颜色叠层区分外边距、边框、内边距和内容区域，并显示四边数值；悬停时显示尺寸标签及最近邻间距标尺。
- 面板标题栏可拖动到不遮挡内容的位置，也可以收起成小标题栏。
- 按网站来源记住面板位置、收起状态和盒模型显示偏好；弹窗显示扩展版本并给出页面访问诊断。
- 从元素卡片复制计算样式 CSS，并通过父级/子级按钮沿 DOM 层级调整选区。
- 对图片显示图片地址与原始像素尺寸。
- 同时选择多个元素时，计算两两之间的横向和纵向最小边界距离。
- 页面滚动或调整窗口大小后，选区的视口坐标、可视尺寸和间距会自动刷新。
- 导出 JSON 或 CSV 文件，附带视口尺寸、设备像素比、视觉视口缩放和滚动位置。
- 导出带元素编号标记的当前视口 PNG 截图。

## 安装 | Installation

1. 下载并解压项目，或克隆仓库。
2. 在 Chrome 中打开 `chrome://extensions`，或在 Edge 中打开 `edge://extensions`，启用“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择项目文件夹。
4. 打开一个普通网站，点击工具栏中的“页面布局测量器”，再点击“开始测量”。

如果已安装旧版本，请在 Chrome 和 Edge 各自的扩展管理页刷新扩展，再刷新目标网页；两种浏览器需要分别更新。旧版弹窗可能只显示通用的页面错误提示。

The extension requests access to the active tab only after you open its popup. It uses `scripting` to inject the inspector into that tab and `downloads` to save exports. It does not request persistent access to every website.

If an older copy is installed, reload the extension from each browser's extension manager, then refresh the target webpage. Chrome and Edge maintain separate extension installations.

## 使用 | Usage

1. 点击扩展弹窗中的“开始测量”。
2. 点击网页中的元素以加入清单；再次点击已选元素可将其移除。
3. 悬停或选中元素时查看盒模型颜色叠层：橙色外边距、黄色边框、绿色内边距、蓝色内容区；图例列出各边数值。
4. 使用页面测量面板查看结果；按 `Esc` 或点击“停止测量”退出。
5. 展开 CSS 规则来源可按需扫描当前页的可读样式表；也可从弹窗导出 JSON、CSV 或当前视口标注截图。

JSON includes page metadata, element measurements, commonly used computed-style values, readable matching CSS declarations, element context and pairwise gaps. CSV includes the computed styles and rule-source data as JSON cells, and is intended for spreadsheet review. The annotated PNG captures the currently visible viewport and selected-element number labels.

## 实现原理 | How it works

- 点击扩展弹窗后，扩展通过 `chrome.scripting` 按需注入 `content.js`；检查器 UI 放在 Shadow DOM 中，减少与网页自身 CSS 的冲突。
- 点击元素只立即读取布局和计算样式；CSSOM 规则索引在展开规则来源或导出时按需构建，并在同一文档内复用，避免每次选择都重新遍历样式表。
- 选中元素时，`getBoundingClientRect()` 提供渲染后的边界框和视口坐标；页面坐标通过加上当前滚动位置计算。
- `getComputedStyle()` 提供浏览器完成级联和继承后的计算值。面板按类别列出常用尺寸、盒模型、布局、字体和外观属性。
- 规则来源通过遍历浏览器允许访问的 `document.styleSheets` 和 adopted stylesheets，匹配所选元素及最多六层祖先；同时收集相关内联样式声明。开放 Shadow DOM 使用其自身样式表。
- 规则列表只是 CSSOM 可读取范围内的选择器匹配结果，并不负责重新实现浏览器的完整级联算法。浏览器可能禁止读取跨域样式表的规则源码。
- 元素间距基于两个边界矩形分别计算横向和纵向的间隔；如果矩形在某个轴向重叠，该轴间距记为 `0`。

## 隐私 | Privacy

- 检查器只在用户打开扩展弹窗后注入当前标签页。
- 测量数据在当前页面的扩展脚本内存中处理；本项目不包含遥测、分析或向远程服务器上传网页内容的代码。
- 标注截图只在用户点击截图导出后截取当前可见视口，并由浏览器下载到本地。
- 导出文件会包含页面 URL、所选元素的文字摘要、图片地址、计算样式及浏览器允许读取的 CSS 规则来源。分享导出文件前，请检查是否包含敏感信息。
- 关闭或刷新页面后，当前选择会清空。插件不会把测量结果写入云端或持久化存储。
- `activeTab` 用于临时访问当前标签页，`scripting` 用于按需注入检查器，`downloads` 用于保存用户主动请求的导出文件，`storage` 仅用于本地保存面板偏好。

## 限制 | Limitations

- Chrome 内部页面（如 `chrome://extensions`）和 Chrome 网上应用店页面不允许扩展注入。
- 自动接入可访问的同源 iframe 和开放 Shadow DOM。跨域 iframe 与关闭的 Shadow DOM 受浏览器安全边界限制，无法直接检查。
- 彩色盒模型按轴对齐边界近似绘制；带旋转等复杂 `transform` 的元素不保证各边缘像素级精确。
- 跨域样式表可能不允许读取 CSS 规则源码；浏览器计算后的样式仍可查看。页面中的匹配规则也不等同于最终胜出的级联声明。
- `file://` 本地文件页面需要在 Chrome 扩展详情中手动开启“允许访问文件网址”。
- 网页跳转或刷新后，当前页面的测量选择会清空。

## 开发 | Development

本项目无构建步骤。修改源文件后，在 `chrome://extensions` 中点击扩展的刷新按钮，再刷新目标网页。

No build step is required. After editing source files, reload the extension from `chrome://extensions` or `edge://extensions`, then refresh the target page.

后续功能优先级见 [ROADMAP.md](ROADMAP.md)。

See [ROADMAP.md](ROADMAP.md) for planned improvements.

## 许可证 | License

MIT. See [LICENSE](LICENSE).
