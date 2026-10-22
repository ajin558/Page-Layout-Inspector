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
- 对图片显示图片地址与原始像素尺寸。
- 同时选择多个元素时，计算两两之间的横向和纵向最小边界距离。
- 导出 JSON 或 CSV 文件。

## 安装 | Installation

1. 下载并解压项目，或克隆仓库。
2. 在 Chrome 中打开 `chrome://extensions`，启用“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择项目文件夹。
4. 打开一个普通网站，点击工具栏中的“页面布局测量器”，再点击“开始测量”。

The extension requests access to the active tab only after you open its popup. It uses `scripting` to inject the inspector into that tab and `downloads` to save exports. It does not request persistent access to every website.

## 使用 | Usage

1. 点击扩展弹窗中的“开始测量”。
2. 点击网页中的元素以加入清单；再次点击已选元素可将其移除。
3. 使用页面右上角面板查看测量结果；按 `Esc` 或点击“停止测量”退出。
4. 打开扩展弹窗，点击“导出 JSON”或“导出 CSV”。

JSON includes page metadata, element measurements, commonly used computed-style values, readable matching CSS declarations and pairwise gaps. CSV includes the computed styles and rule-source data as JSON cells, and is intended for spreadsheet review.

## 实现原理 | How it works

- 点击扩展弹窗后，扩展通过 `chrome.scripting` 按需注入 `content.js`；检查器 UI 放在 Shadow DOM 中，减少与网页自身 CSS 的冲突。
- 选中元素时，`getBoundingClientRect()` 提供渲染后的边界框和视口坐标；页面坐标通过加上当前滚动位置计算。
- `getComputedStyle()` 提供浏览器完成级联和继承后的计算值。面板按类别列出常用尺寸、盒模型、布局、字体和外观属性。
- 规则来源通过遍历浏览器允许访问的 `document.styleSheets` 和 adopted stylesheets，匹配所选元素及最多六层祖先；同时收集相关内联样式声明。
- 规则列表只是 CSSOM 可读取范围内的选择器匹配结果，并不负责重新实现浏览器的完整级联算法。浏览器可能禁止读取跨域样式表的规则源码。
- 元素间距基于两个边界矩形分别计算横向和纵向的间隔；如果矩形在某个轴向重叠，该轴间距记为 `0`。

## 隐私 | Privacy

- 检查器只在用户打开扩展弹窗后注入当前标签页。
- 测量数据在当前页面的扩展脚本内存中处理；本项目不包含遥测、分析或向远程服务器上传网页内容的代码。
- 导出文件会包含页面 URL、所选元素的文字摘要、图片地址、计算样式及浏览器允许读取的 CSS 规则来源。分享导出文件前，请检查是否包含敏感信息。
- 关闭或刷新页面后，当前选择会清空。插件不会把测量结果写入云端或持久化存储。
- `activeTab` 用于临时访问当前标签页，`scripting` 用于按需注入检查器，`downloads` 用于保存用户主动请求的导出文件。

## 限制 | Limitations

- Chrome 内部页面（如 `chrome://extensions`）和 Chrome 网上应用店页面不允许扩展注入。
- 当前版本检查主文档；跨域 iframe 中的元素需要单独切换到对应页面上下文，目前不支持直接检查。
- 跨域样式表可能不允许读取 CSS 规则源码；浏览器计算后的样式仍可查看。页面中的匹配规则也不等同于最终胜出的级联声明。
- `file://` 本地文件页面需要在 Chrome 扩展详情中手动开启“允许访问文件网址”。
- 网页跳转或刷新后，当前页面的测量选择会清空。

## 开发 | Development

本项目无构建步骤。修改源文件后，在 `chrome://extensions` 中点击扩展的刷新按钮，再刷新目标网页。

No build step is required. After editing source files, reload the extension from `chrome://extensions` and refresh the target page.

## 许可证 | License

MIT. See [LICENSE](LICENSE).
