# Blind Collage / Visual Mad Libs — 开发交接文档

版本：v2.0 · 2026-11-17 · 目标版本需求（非已实现功能）  
项目作者：Mingfu Yang  
用途：提供给编程 Agent，基于旧版项目重构并交付可本地运行、可部署到 GitHub Pages 的静态网站。

> **v2.1 author changes (2026-11-17), these override the text below:**
> - 5 prompt categories: `mouth`, `falling`, `moving`, `noise`, `out_of_place`. `electricity` has been removed.
> - The home page scrolls down into a visible gallery of scene backgrounds; clicking a scene starts the collage (instead of a random start background). RANDOMIZE and ON/OFF remain in ARRANGE.
> - Assets are Riso scans cut out into `assets/riso/`; see ASSETS.md.

## 0. 给开发 Agent 的任务

阅读本文件及已有项目 `blind_collage_local_vscode.zip` 解压后的代码。保留可复用的画布、背景、交互与导出逻辑，替换旧版的“10 个剪影选 5 个”机制。先检查现有文件及素材实际路径，再进行修改；不得将旧规则与新规则混合。不要擅自添加 AI 生成、评分、用户账号、数据库或复杂视觉装饰。

交付可运行的完整项目、README、素材清单和测试结果。如需在聊天中提供代码，按完整文件提供，不只提供修改片段。不要声称未验证的功能已经测试通过。

## 1. 项目概念

以 Mad Libs 的填空机制为灵感，将语言提示转换为视觉拼贴中的占位元素。用户先在背景中安排带有趣味语义的 Prompt，但不知道具体会得到哪件物品。完成构图后，系统从对应素材池随机抽取图像，统一揭晓。用户最后为画面取名，用语言解释意外的视觉关系。

研究重点是用户如何面对不可预测的组合、发现新的联系并进行幽默表达，而非让机器自动生成幽默。用户控制构图、类别和最终命名，系统只负责随机构成具体内容。

## 2. 已确认的产品方向与建议默认值

| 项目 | 规则 |
|---|---|
| 核心玩法 | 放置文字 Prompt → 随机图片揭晓 → 为整幅画命名 |
| Prompt 分类 | 六种基于物品属性的趣味分类，不采用严格词性 |
| 背景 | 随机选择照片背景，可关闭、重新随机 |
| 构图 | 拖动、旋转、等比缩放、调整图层 |
| 揭晓 | 所有已放置 Prompt 同时变成对应图像 |
| 文字 | 最后写标题，不要求完整故事或前后两次写作 |
| 视觉 | 浅灰页面、老式网页等宽字体、两侧角落文字引导、Riso 素材为视觉主体 |
| 开发 | VS Code 本地开发，沿用 p5.js 2.x，部署到 GitHub Pages |

以下属于建议的 MVP 默认值，可在不改变核心机制的情况下调整：每局放置 1–5 个 Prompt（推荐 3–5），同类别可重复，揭晓后锁定构图，允许重新开始；不再强制显示故事开头，因为背景与 Prompt 本身提供叙事引导。如果保留旧开头，作为可选设置而非必填环节。标题允许为空时保存为 Untitled。

## 3. 六种 Prompt 与素材分类

英文文案用于网站界面，中文仅供开发和素材整理参考。以下为当前讨论版本，不视为永久锁定文案；第 5、6 类是已讨论的候选方向，仍可后续由作者调整。类别内部既有符合直觉的物体，也有出乎意料但仍符合提示逻辑的物体。

| ID | English UI copy | 中文 | 素材池示例 |
|---|---|---|---|
| mouth | Something you could maybe put in your mouth | 或许可以放进嘴里的东西 | 糖果、水果、面包、骰子、灯泡、石头、钥匙 |
| falling | Something you don't want falling on your head | 砸在头上会出大事的东西 | 台球桌、飞机、冰箱、雕塑、大钟、家具 |
| electricity | Something that won't do much without electricity | 没有电就跑不了的东西 | 电视、手机、收音机、电灯、电风扇、电脑 |
| moving | Something that moves — or looks like it might | 会动的，或者看起来会动的东西 | 人物、动物、自行车、车、风扇、钟摆 |
| noise | Something that makes noise | 会发出声音的东西 | 收音机、乐器、鸟、闹钟、警报器、嘴巴 |
| out_of_place | Something that really shouldn't be here | 不该出现在这里的东西 | 奇怪角色、错位用品、巨大食物、违和物件 |

注意：嘴巴类仅为荒诞的视觉提示，不是现实中吞咽物品的建议。类别允许重叠，一个风扇可同时标记 electricity、moving、noise。图库不重复存储同一张图。out_of_place 在 MVP 采用作者标记的奇怪素材池，不进行 AI 场景识别；未来才考虑基于背景的语义标签过滤。

建议素材比例：约 70% 直觉合理、30% 意外（只是策展参考，不是当前必须实现的算法）。随机选取在单局尽量不重复图片；如果池子不足才允许重复。禁止为了满足分类将不匹配的素材静默伪装成合适图片。

## 4. 用户流程与交互

### 00 / BEGIN

极简标题和简短说明：`Place your prompts. Reveal the unexpected. Give it a name.` 点击 BEGIN 进入画布。背景默认开启，随机选定一张背景（不是每帧随机）。

### 01 / ARRANGE

显示固定比例的画布（建议沿用旧版 4:3），以及六种可选择的英文 Prompt，选项以文字呈现。

- 点击某个 Prompt，在画布中添加一个带文字的占位元素；允许从面板直接拖入画布作为增强功能。
- 占位框表示图像的目标范围，用户可移动、旋转、缩放，支持删掉单个占位框并重新添加。
- 保留拖拽、滚轮缩放、Q/E 旋转、[/] 图层操作；提供简明操作提示。选中元素有细线边框或角标即可。
- 用 `BACKGROUND: ON/OFF` 切换背景，用 `RANDOMIZE` 更换背景；关闭时为浅灰空白画布。
- 占位元素允许叠加；选中不应自动改变已设置的层级（建议修复旧版点击即置顶行为）。
- 未放置任何元素时 Reveal 不可用；达到数量上限时禁止新增并提示。
- 背景切换不重置 Prompt 的位置、大小、角度或图层。

### 02 / REVEAL

点击 REVEAL ALL 后，锁定编辑状态。按照每个占位元素的 promptId 从合法素材池抽取图片。只加载本轮选中的图片，等待所有图片成功后一次性替换占位框；加载过程中显示简洁进度，禁止重复触发。

- 图片中心、旋转角度、图层与占位框一致；按原始宽高比等比 contain 在占位范围内，不拉伸图片。
- 保留当前背景和画布构图；裁切范围与预览一致。
- 不再显示 Prompt 文字或选择边框。MVP 无需复杂揭晓动画。
- 揭晓失败时显示具体问题，提供重试或回到编辑阶段；不要把占位图冒充为成功揭晓。

### 03 / TITLE & EXPORT

提问 `What would you call this picture?`，用户填写标题。提供 `SAVE PNG` 导出最终画作（包含背景、真实素材和标题，不含操作界面）；建议 1200×900 的作品区域，若有额外标题带可相应增加总高度。提供 `START OVER`，重置状态并开启新一轮。揭晓后不得自动重抽，标题修改不得影响图片结果。

## 5. UI 与布局规范

- 页面基底 #e9e9e9，墨色 #242424，辅助文字 #777777，字体 Courier New / monospace。
- 左上角项目名/当前操作引导，右上角阶段名称；保持英文作为默认界面语言。
- 不添加大标题海报、卡片网格装饰、渐变、玻璃拟态、复杂圆角面板或人为 Riso 滤镜。Riso 质感来自作者实际印刷与扫描的图片。
- 背景照片仅在拼贴画布内显示，等比 cover 居中裁切；素材按画布边界裁切，不能遮挡界面。
- 采用明确的 HTML/CSS 布局容器或统一布局计算，保证顶部引导、Prompt 控件、画布、底部操作和标题输入不重叠。窄屏允许换行或滚动，不要求把所有内容硬塞进视口。
- p5.js 中带宽高的 `text()` 使用文本框坐标，避免把中心 x 误当成左边界；优先用 DOM 文本实现外围引导。
- 窗口变化时保留构图比例：使用固定的逻辑画布坐标，渲染时做缩放和坐标转换，不根据视口尺寸直接存储物体绝对像素位置。

## 6. 技术方案及项目结构

无后端的静态网站；不需要 Node 服务、API key、Google Sheet 或账号。使用 HTML/CSS/JS 和 p5.js 2.x（旧项目引用 2.3.4；开发时检查实际依赖版本），建议将已确认版本的 p5 库本地化，避免部署依赖第三方 CDN。可使用 VS Code Live Server 或 `python3 -m http.server 8000` 运行；禁止依赖 file://。

```text
blind-collage/
  index.html
  style.css
  js/
    sketch.js       # 画布渲染、事件连接
    game.js         # 阶段、状态、命名、新一轮
    collage.js      # 元素变换、命中测试、图层、导出
    assets.js       # 素材校验、随机抽取、按需加载、缓存
  data/
    library.json    # 分类与素材映射的唯一数据源
  assets/           # 可保留旧版 PNG 路径，避免盲目迁移
  background/       # bg01.jpg、bg02.jpg 等
  vendor/           # 可选：本地 p5 依赖
  README.md
  DEVELOPMENT_SPEC.md
```

目录拆分可按现有架构调整，但需保持数据与逻辑解耦。所有资源路径相对于项目根目录解析，兼容 GitHub Pages 的仓库子路径，不使用 `/assets/...` 根路径；避免远程 Web Editor 特有的素材 URL。旧项目中的格式、文件名和大小写以实际目录为准。

### 6.1 素材清单结构

```json
{
  "version": 1,
  "prompts": [
    {"id": "electricity", "label": "Something that won't do much without electricity"},
    {"id": "noise", "label": "Something that makes noise"}
  ],
  "assets": [
    {"id": "radio-01", "file": "assets/radio.png", "prompts": ["electricity", "noise"]}
  ],
  "backgrounds": [
    {"id": "bg01", "file": "background/bg01.jpg"},
    {"id": "bg02", "file": "background/bg02.jpg"}
  ]
}
```

示例仅展示结构，正式清单应包含六类和所有可用素材。每张图可增加 `tags`、来源、版权信息、尺寸等可选字段。用户后续只需添加素材文件并更新清单，不必改随机逻辑。

### 6.2 状态模型（建议）

```js
const state = {
  stage: 'arrange', // intro | arrange | revealing | revealed
  backgroundId: 'bg01',
  useBackground: true,
  pieces: [
    { id: 'piece-1', promptId: 'moving', x: 600, y: 450,
      width: 300, height: 180, rotation: 0, assetId: null }
  ],
  selectedPieceId: null,
  title: ''
};
```

使用 1200×900 逻辑坐标；pieces 数组顺序即图层顺序。assetId 在揭晓时填入，成功后本轮固定。图片缓存与游戏状态分离。重开时清掉本轮内容、活动选中、标题、加载错误，但可复用已缓存的图像。

### 6.3 加载策略

初始化只读取 JSON 和当前随机背景。未揭晓阶段不下载全部物件图片；揭晓时抽样 → 加载必要图片 → 全部成功再切换显示。p5.js 2.x 使用 `async setup()`/`await loadImage()` 或经过验证的等效加载方式，不使用旧版 `preload()`。开发中检查实际 HTTP 响应、路径及文件扩展名，不把资源找不到一概归因于并行或循环。背景切换加载应避免旧请求覆盖新选项；揭晓与重新开始应隔离过期异步结果。

## 7. 当前已有素材及迁移边界

旧版 ZIP `blind_collage_local_vscode.zip` 是迁移起点，包含 10 张演示透明 PNG（camera、chicken、clock、duck、dumpster、frog、gumball、mouse、radio、shark），以及 `background/bg01.jpg`、`background/bg02.jpg`。旧版已经编写了剪影、背景开关、编辑和导出功能，但不代表新版 Prompt 已实现，也不代表所有交互已经在浏览器通过测试。

初始临时标记建议：radio → electricity/noise；clock → noise（如闹钟）/moving（若强调指针）；camera → electricity（确认类型）；chicken/duck/frog/mouse/shark → moving，部分可按具体图像标记 noise；dumpster → falling；gumball 是口香糖机而非糖果本身，不能直接归入口部池。禁止凭文件名添加不匹配标签。现有素材不足以覆盖全部六类（尤其 mouth），优先明确标记缺口；与作者确认或添加明确标注的临时演示素材。正式 Riso 图由作者后续替换。

图片准备：原稿成组印刷、高质量扫描、保留物件内部油墨颗粒和套色偏差、只移除外部纸张底色。网站使用独立透明 PNG 或适当的透明 WebP；保留高分辨率印刷原稿在网站外。推荐单张网页版约 100–400 KB（按细节调整），避免为了体积过度损失印刷纹理。源图版权及使用许可需作者确认，公开部署前处理。

## 8. 实施顺序与验收清单

1. 检查 ZIP/项目目录，建立本地服务器并验证旧版能启动。
2. 建立六类 Prompt 清单和已有素材标签，缺失分类明确标记。
3. 重构阶段逻辑、占位元素和操作面板，移除旧剪影选择流程。
4. 实现随机背景、遮罩、按需素材加载、统一揭晓、标题与 PNG 导出。
5. 实际浏览器测试并修复，再提供 GitHub Pages 部署说明；未经授权不要推送或公开发布。

| 验收项 | 通过条件 |
|---|---|
| 本地运行 | HTTP 服务启动后页面正常，无未处理异常或 404 |
| 素材清单 | ID 唯一、类别合法、路径存在；空池有提示，不静默回退 |
| Prompt | 同类可重复，添加/删除、上限限制和编辑正确 |
| 构图 | 旋转、拖动、缩放、层级、选中命中及窗口变化后位置正确 |
| 背景 | 随机切换、开关均正常，且不改变元素构图 |
| 揭晓 | 只从合法池抽图，全部成功后同时显示；不拉伸，不改变构图；失败可处理 |
| 标题与导出 | 输入可编辑；PNG 与画布一致，包含标题，无 UI；实测下载文件 |
| 重开 | 标题、占位元素、结果和错误状态重置，旧异步请求不污染新一轮 |
| 响应式 | 至少测试 1280×800、窄桌面和手机宽度；控制文字不重叠 |
| 性能 | 首屏不下载完整素材库；网络检查确认仅加载必要资源 |
| GitHub Pages | 仓库子路径下资源可正常加载；README 有启动、增添素材与部署步骤 |

## 9. 不在当前 MVP 范围内

AI 生成图片/故事/标题、自动幽默评分、用户上传素材、账号与云数据库、作品公开画廊、多人协作、自动识别图片类别、复杂粒子动画、物理模拟、完整图像编辑器。若以后需要研究数据采集，另行讨论隐私、参与者告知和存储机制；不要默认收集用户信息。

最终目标：以最低的交互负担制造一个有趣的未知组合，让玩家通过命名完成自己的表达。不要为了功能丰富而削弱“先安排，后揭晓”的惊喜。
