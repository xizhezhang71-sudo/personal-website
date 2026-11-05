# 个人网站文件结构
按页面和可复用功能划分。网站正文使用英文；此文档为维护入口。

```text
website/
  STRUCTURE.md             本目录说明与运行方法
  index.html               E 版首页
  pages/
    work.html              作品索引
    experience.html        职业与教育经历，可打印
    research.html          研究问题及本科论文
    about.html             个人简介
    projects/
      turtle.html          VR 海龟保护体验
      gleam.html           AI 短片制作
      embrace.html         电影美术案例
  assets/
    css/
      base.css             字体、颜色、导航、正文、响应式
      hero.css             首页场景与图注
      carousel.css         精选作品与切换反馈
    js/
      hero.js              Three.js 舞台、滚动响应及静态降级
      carousel.js          作品切换、触摸和键盘操作
      print.js             打印网页版 CV
    images/                三张原创概念封面，非项目截图
    vendor/three.min.js    本地 Three.js 运行库
```

直接用浏览器打开 index.html。所有路径均相对当前页面，离线可浏览。共用导航采用各页 HTML 中的普通链接。各项目页保存各自的内容，首页精选作品的数据在 carousel.js 中维护。Experience 页可通过浏览器打印或另存 PDF。

## 修订后的层级和操作
Work = index.html（首页）。姓名只作署名。pages/work.html 为下一级 Archive，三个项目详情属于 Archive。Experience、Research、About 与 Work 并列。assets/css/interactions.css 管理焦点、触摸目标、封面预览和展开状态。鼠标拖动、横滑和方向键切换精选项目；纵向滑动保持页面滚动。

## Complete work collection
- assets/js/work-data.js — project metadata for the selected reel.
- assets/css/archive.css — responsive 3-by-3 archive and card reveal styles.
- pages/work.html — complete nine-item collection.
- pages/projects/{mixue,beyond-river,wan,wukong,guanfu,scare-out}.html — CV-based contribution pages.
- assets/images/{mixue,beyond-river,wan,wukong,guanfu,scare-out}.svg — labeled conceptual covers.


## Scroll manifesto interlude

- `index.html`: semantic Creative approach paragraph; four strong keywords.
- `assets/css/manifesto.css`: typography, fixed-stage composition, mobile and reduced-motion fallback.
- `assets/js/manifesto.js`: shared exit/work scroll cues and right-to-left entrance / upward exit.
- `assets/js/hero.js`: calls the manifesto update alongside the camera and vertical Selected Work reveal.
- `ROBOT-MOTION.md`: current camera and scroll timing documentation.
