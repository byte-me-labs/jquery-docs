# jQuery API Documentation — CHM + Web

jQuery API 参考文档，支持中英文双版本，自动构建 CHM 离线包和在线文档。

## 在线地址

- **English**: https://byte-me-labs.github.io/jquery-docs/en/
- **中文**: https://byte-me-labs.github.io/jquery-docs/zh/

## 下载

从 [Releases](https://github.com/byte-me-labs/jquery-docs/releases) 下载最新 CHM 离线包：

- `jquery-api-reference-en.chm` — 英文版
- `jquery-api-reference-zh.chm` — 中文版

## 特性

- 356 个 API 页面，覆盖 jQuery 全部方法/选择器/属性
- 中英文双版本，翻译覆盖率 100%
- 速查表支持搜索 + 版本范围筛选 + API 状态标识
- 侧边栏分类导航，支持折叠和筛选
- Windows CHM 格式，适配 IE7/8 引擎
- GitHub Actions 自动构建：检测上游更新 → 翻译缺口 → 部署

## 本地构建

```bash
# 安装依赖
npm install

# 克隆上游数据
git clone --depth 1 https://github.com/jquery/api.jquery.com.git upstream

# 构建 HTML
node scripts/build.js --source="./upstream" --skip-chm

# 构建 CHM（仅 Windows）
node scripts/chm-compile.js --lang=both
```

### 按语言构建 CHM

```bash
node scripts/chm-compile.js --lang=en   # 仅英文
node scripts/chm-compile.js --lang=zh   # 仅中文
node scripts/chm-compile.js --lang=both # 两者
```

## 翻译验证

```bash
node scripts/validate-translate.js
```

输出覆盖率和长度问题清单。

## 工作流

| 触发 | 行为 |
|------|------|
| 每日定时 | 检测上游新版本 → 翻译缺口 → 创建 PR |
| 手动触发 | 同上 + 构建 CHM → 发布 Release |
| PR 合并到 main | 自动部署 GitHub Pages |

自动翻译使用 [GitHub Models](https://github.com/marketplace/models) (GPT-4o-mini)，免费无需 API key。

## 数据来源

- [api.jquery.com](https://github.com/jquery/api.jquery.com) — API 参考数据
- [jquery-chm](https://github.com/byte-me-labs/jquery-chm) — 中文翻译参考 (2013, jQuery 1.10.3)

## 许可

MIT
