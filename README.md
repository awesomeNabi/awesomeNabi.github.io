# 谢思宇 · Siyu Xie — Personal Homepage

一个零依赖的静态个人主页，围绕 `About / Research / Intern / Projects` 四个主栏目展开。

视觉上采用“秋招雷达”的冷白浅蓝背景、状态信号与编号信息卡；结构上参考 setsaile 的左侧个人档案栏和右侧学术内容区。Intern 呈现蚂蚁集团数据智能引擎的 MemX / Ekko 实习项目，聚焦群聊环境下的多模态 Agent 记忆链路，按“在线接入 / 异步建模 / 检索回流 / 实习流程事项”展开；Projects 保留 Geek Mind 具身 Agent 平台与操作中构建记忆系统两个同级案例。

## 本地预览

在项目目录启动任意静态文件服务器，例如：

```powershell
python -m http.server 4173
```

然后打开 `http://127.0.0.1:4173`。

## 部署

站点无需构建步骤。GitHub Pages 从仓库根目录发布；腾讯云 EdgeOne 可上传 `dist/` 文件夹或 `siyu-xie-homepage.zip`，并确保 `index.html` 位于上传根目录。

请勿上传整个工作目录：简历 PDF、原始视频、GIF 和参考链接文件仅作为本地素材，其中简历包含不适合直接公开的个人信息。

如需长期稳定的中国大陆访问地址，请在腾讯云 EdgeOne Pages 选择包含中国大陆的加速区域，并绑定已完成 ICP 备案的自定义域名。
