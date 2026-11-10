# Siyu Xie · Mind, Memory & Motion

谢思宇的静态个人主页。古希腊石雕、柱式和暖纸张色调，与毛玻璃导航、悬浮卡片及轻量交互结合。无需安装依赖或构建，GitHub Pages 从仓库根目录发布。

## 页面与交互

- `index.html`：个人介绍、四个项目档案、两篇论文、三段实习、教育背景与联系入口。
- `athena.css`：主站响应式样式；390 px 手机、平板和桌面布局；系统减少动态效果与打印支持。
- `athena.js`：手机导航、项目筛选、锚点联动、视频弹窗、邮箱复制、阅读进度和动态开关。无 JavaScript 时正文、项目档案和链接仍可使用。
- `projects/scene-graph.html`：保留原有 Rerun 录屏、近景放大和历史输出，以 `project-theme.css` 统一视觉。
- `styles.css`、`scene-graph.css`、`scene-graph-demo.js`：保留的项目页布局和媒体逻辑。旧 `script.js` 已不被首页加载。

预览：在此目录运行 `python -m http.server 4175 --bind 127.0.0.1`，打开 http://127.0.0.1:4175/ 。

## 内容依据与边界

内容核对日期：2026-11-10。

- 用户提供的《谢思宇_Agent.pdf》：教育、经历、个人职责、论文状态和记忆评测成绩。不上传原始简历、手机号或业务数据。
- [Geek Mind](https://github.com/awesomeNabi/Geek-Mind)：多本体任务闭环、Microduck 仿真、Optimus 和 StarDojo 的独立指标口径。
- [TreeMem / mem_cg](https://github.com/awesomeNabi/mem_cg)：Session Tree、两层检索、原始轮次回溯、GME 与 ATTRS 方法概述。仓库需访问权限。
- memx：参考项目说明与简历，只展示个人工作和概念流程，不发布内部代码、文档、客户数据或运行配置。
- [Scene Graph](https://github.com/awesomeNabi/scence-graph)：保留在线几何与离线关系构建的界限、上游归属、历史输出误差及实例编号可能切换等说明。仓库需访问权限。

87.73% / 92.20% 是简历报告的 LLM-as-a-Judge 得分，不与 24.36% 的 Minecraft 五组平均成功率混用。TreeMem 不单独挂载上述记忆成绩，避免未经证实的归因。AAAI 2027 工作按简历标为在审。

## 美术资产

`assets/athena-marble.webp` 为本次使用内置 Imagegen 生成的装饰性视觉，已转为约 188 KiB 的 WebP。项目截图、论文方法图和视频仍使用原有素材；CSS 示意图在页面标明用途。

生成提示词（内置工具，非 CLI）：

> Use case: stylized-concept. Asset type: atmospheric editorial photograph for a personal AI researcher portfolio website, ancient Greek classical art combined with contemporary minimalism. Create a beautifully art-directed composition, a weathered ivory marble bust of Athena with a delicate simple classical helmet, viewed in three-quarter profile looking to the left, on a fluted Ionic column plinth. In the background: a single monumental Greek column and a warm sunlit limestone gallery wall with soft architectural shadows. A thin antique brass armillary sphere ring curves behind the bust as a subtle symbol of reasoning and memory, no complex sci-fi elements. Sculptural museum photography, exquisite natural stone pores and age patina, muted warm ivory, parchment, sand and aged bronze palette. Dramatic but soft afternoon side light, restrained contrast and rich shadows. Vertical 4:5 composition, bust fills the central 65%, generous breathing room, beautiful sculptural silhouette, slightly grainy vintage editorial aesthetic. No letters, words, numbers, watermark, interface, frames or logos. Not a website screenshot.

`assets/folio-mark.svg` 为手工绘制的柱式图标。网页不依赖外部字体、CDN、分析追踪器或付费模型调用。
