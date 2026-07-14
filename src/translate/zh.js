/**
 * Chinese translation layer.
 * Maps API entries to Chinese titles, descriptions, and category names.
 */
const fs = require('fs-extra');
const path = require('path');
const { NOTE_ZH } = require('./note-zh');

// Load extracted translations from old jquery-chm
let rawTranslations = {};
try {
  rawTranslations = require('./zh-translations.json');
} catch (e) {
  console.warn('No zh-translations.json found, Chinese output will be empty');
}

// Category name translations
const CATEGORY_ZH = {
  'Ajax': 'Ajax',
  'Attributes': '属性',
  'Callbacks Object': '回调对象',
  'Core': '核心',
  'CSS': 'CSS',
  'Data': '数据',
  'Deferred Object': '延迟对象',
  'Dimensions': '尺寸',
  'Effects': '效果',
  'Events': '事件',
  'Forms': '表单',
  'Internals': '内部',
  'Manipulation': '文档处理',
  'Miscellaneous': '其他',
  'Offset': '偏移',
  'Properties': '属性',
  'Selectors': '选择器',
  'Traversing': '遍历',
  'Utilities': '工具',
  // Sub-categories
  'Global Ajax Event Handlers': '全局 Ajax 事件处理',
  'Helper Functions': '辅助函数',
  'Low-Level Interface': '底层接口',
  'Shorthand Methods': '快捷方法',
  'Browser Events': '浏览器事件',
  'Document Loading': '文档加载',
  'Event Handler Attachment': '事件处理绑定',
  'Event Object': '事件对象',
  'Form Events': '表单事件',
  'Keyboard Events': '键盘事件',
  'Mouse Events': '鼠标事件',
  'Basic': '基本',
  'Basic Filter': '基本过滤',
  'Attribute': '属性',
  'Child Filter': '子元素过滤',
  'Content Filter': '内容过滤',
  'Form': '表单',
  'Hierarchy': '层级',
  'jQuery Extensions': 'jQuery 扩展',
  'Visibility Filter': '可见性过滤',
  'Class Attribute': '类属性',
  'Copying': '复制',
  'DOM Insertion, Around': 'DOM 插入，外部',
  'DOM Insertion, Inside': 'DOM 插入，内部',
  'DOM Insertion, Outside': 'DOM 插入，外侧',
  'DOM Removal': 'DOM 移除',
  'DOM Replacement': 'DOM 替换',
  'General Attributes': '通用属性',
  'Style Properties': '样式属性',
  'Filtering': '过滤',
  'Miscellaneous Traversing': '其他遍历',
  'Tree Traversal': '树遍历',
  'Basics': '基础',
  'Custom': '自定义',
  'Fading': '淡入淡出',
  'Sliding': '滑动',
  'Collection Manipulation': '集合操作',
  'Data Storage': '数据存储',
  'DOM Element Methods': 'DOM 元素方法',
  'Setup Methods': '设置方法',
  'Properties of jQuery Object Instances': 'jQuery 对象实例属性',
  'Properties of the Global jQuery Object': '全局 jQuery 对象属性'
};

// UI labels
const UI_ZH = {
  'jQuery API Documentation': 'jQuery API 文档',
  'jQuery API Cheatsheet': 'jQuery API 速查表',
  'Search APIs...': '搜索 API...',
  'All Versions': '所有版本',
  'Active': '活跃',
  'Deprecated': '废弃',
  'Removed': '已移除',
  'Filter APIs...': '筛选API...',
  'Redirecting to': '正在跳转到',
  'Cheatsheet': '速查表',
  'APIs': 'API',
  'Versions Covered': '版本覆盖',
  'Generated from': '数据来源',
  'Examples': '示例',
  'Description': '描述',
  'Signatures': '签名',
  'Additional Notes': '附加说明',
  'Returns': '返回值',
  'Example': '示例',
  'jQuery': 'jQuery 代码',
  'HTML': 'HTML 代码',
  'CSS': 'CSS 代码',
  'Parameters': '参数',
  'Parameter': '参数',
  'Type': '类型',
  'optional': '可选',
  'Callback parameters': '回调参数',
  'Added': '添加于',
  'Deprecated since jQuery': '自 jQuery 起废弃',
  'Removed in jQuery': '自 jQuery 起移除',
  'Available since jQuery': '自 jQuery 起可用',
  'method': '方法',
  'property': '属性',
  'selector': '选择器',
  'Returns:': '返回值:',
  'Returns': '返回值',
  'Signatures': '签名',
  'Sample': '示例',
  'Description': '描述',
  'Examples': '示例',
  'Example': '示例',
  'jQuery': 'jQuery 代码',
  'HTML': 'HTML 代码',
  'CSS': 'CSS 代码',
  'Parameters': '参数',
  'Parameter': '参数',
  'Type': '类型',
  'optional': '可选',
  'Callback parameters': '回调参数',
  'Added': '添加于',
  'Deprecated since jQuery': '自 jQuery 起废弃',
  'Removed in jQuery': '自 jQuery 起移除',
  'Available since jQuery': '自 jQuery 起可用',
  'method': '方法',
  'property': '属性',
  'selector': '选择器',
  'Additional Notes': '附加说明',
  'Removed': '已移除',
  'Deprecated': '已废弃',
  'Active': '活跃'
};

/**
 * Translate a single entry
 */
function translateEntry(entry) {
  const raw = rawTranslations[entry.id];
  if (!raw) return entry;

  const zh = { ...entry };

  // Use translated title if it differs from English (applies to selectors, events, etc.)
  if (raw.title && raw.title.length > 2 && raw.title !== entry.title) {
    zh.title = raw.title.trim();
    if (entry.type === 'selector') {
      var pattern = entry.title.match(/\[.+\]/) || entry.title.match(/\([^)]+\)/);
      if (pattern && zh.title.indexOf(pattern[0]) === -1) zh.title += ' ' + pattern[0];
    }
  } else {
    zh.title = entry.title;
  }

  // Translate description
  if (raw.desc && raw.desc.length > 5) {
    zh.desc = raw.desc;
  }

  // Translate parameter descriptions — exact match only
  if (zh.signatures && rawTranslations._paramTrans) {
    var pt = rawTranslations._paramTrans;
    zh.signatures.forEach(function(sig) {
      if (sig.arguments) sig.arguments.forEach(function(arg) {
        if (arg.desc && pt[arg.desc]) arg.desc = pt[arg.desc];
      });
    });
  }

  // Translate longdesc if available
  if (raw._longdesc && raw._longdesc.length > 10) {
    zh.longdesc = raw._longdesc;
  }

  // Translate example descriptions if available
  if (raw._exampleDescs && raw._exampleDescs.length > 0) {
    zh.examples = (zh.examples || []).map(function(ex, i) {
      var desc = raw._exampleDescs[i] || raw._exampleDescs[raw._exampleDescs.length - 1] || '';
      if (desc) return { ...ex, desc: desc };
      return ex;
    });
  }

  return zh;
}

/**
 * Translate category tree (in-place)
 */
function translateCategories(tree) {
  const zhName = CATEGORY_ZH[tree.name] || tree.name;
  const translated = {
    ...tree,
    name: zhName,
    desc: tree.desc // keep original desc for now
  };
  if (tree.children) {
    translated.children = tree.children.map(c => translateCategories(c));
  }
  return translated;
}

/**
 * Build full translated API data
 */
function buildChineseData(apiJson) {
  const zhEntries = apiJson.entries.map(e => translateEntry(e));
  const zhCategories = translateCategories(apiJson.categories);

  // Replace notes with Chinese translations
  const zhNotes = { ...apiJson.notes };
  Object.keys(NOTE_ZH).forEach(k => { zhNotes[k] = NOTE_ZH[k]; });

  return {
    ...apiJson,
    entries: zhEntries,
    categories: zhCategories,
    notes: zhNotes,
    displayCategories: zhCategories.children
      ? zhCategories.children.filter(c =>
          c.slug !== 'version' && c.slug !== 'deprecated' &&
          c.slug !== 'removed' && c.slug !== 'uncategorized')
      : [],
    categoryEntries: apiJson.categoryEntries, // same ids, just translated names
    ui: UI_ZH
  };
}

module.exports = { buildChineseData, translateEntry, CATEGORY_ZH, UI_ZH };
