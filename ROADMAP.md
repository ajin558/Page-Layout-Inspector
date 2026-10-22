# Roadmap

The roadmap prioritizes practical inspection workflows for designers and frontend developers. Priorities may change as people use the extension and report issues.

## 1.3.0 — usability and measurement context

- [x] Show the installed extension version in the popup and explain restricted page types.
- [x] Remember panel position, collapsed state, and box-model overlay preference per website, using local extension storage.
- [x] Make the box-model legend show color swatches and top/right/bottom/left values.
- [x] Include viewport size, device-pixel ratio, visual viewport scale, and scroll position in JSON and CSV exports.

## 1.4.0 — faster measurement

- [ ] Add a point-to-point ruler for measuring gaps inside and between elements, with horizontal, vertical, and diagonal distances.
- [ ] Compare selected elements side by side, including size, box model, typography, and layout-property differences.
- [ ] Add configurable keyboard shortcuts for starting/stopping inspection, clearing the current selection, and switching measurement modes.

## 1.5.0 — reusable reports

- [ ] Export a standalone HTML report with element cards, computed styles, CSS rule sources, and pairwise gaps.
- [ ] Add a typography and color summary for selected elements to help review design consistency.
- [ ] Improve large-selection workflows with search, grouping, and batch removal.

## Later

- Review browser-supported options for richer iframe inspection while preserving the browser's cross-origin security boundaries.
- Evaluate a local measurement-session format so users can save and reopen a selection without sending page data to a server.
