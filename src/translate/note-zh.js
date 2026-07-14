/**
 * Chinese translations for notes.xsl templates.
 * Key = note ID from notes.xsl
 */
const NOTE_ZH = {
  'data-doesnt-accept-undefined': '<code>undefined</code>不被识别为数据值。像 <code>{{data-title}}( {{data-parameters}}, undefined )</code> 这样的调用会返回其调用的jQuery对象以便链式调用。',
  'jquery-data-doesnt-accept-undefined': '<code>undefined</code>不被识别为数据值。像 <code>{{data-title}}( {{data-parameters}}, undefined )</code> 这样的调用会返回"name"对应的数据，因此等同于 <code>{{data-title}}( {{data-parameters}} )</code>。',
  'dimensions-number': '与尺寸相关的API（包括 <code>{{data-title}}</code>）返回的数字在某些情况下可能是小数。代码不应假设它是整数。此外，当用户缩放页面时尺寸可能不准确；浏览器没有暴露检测此情况的API。',
  'disconnected-manipulation': 'jQuery 1.9之前，如果集合中第一个节点未连接到文档，<code>{{data-title}}</code> 会尝试添加或更改当前jQuery集合中的节点，并在这些情况下返回一个新集合而非原始集合。从jQuery 1.9开始，<code>.after()</code>、<code>.before()</code> 和 <code>.replaceWith()</code> 始终返回原始未修改的集合。对没有父节点的节点使用这些方法无效。',
  'document-order': '被选中的元素按照它们在文档中出现的顺序排列。',
  'domlint': '表单及其子元素不应使用与表单属性冲突的input名称或id，如 <code>submit</code>、<code>length</code> 或 <code>method</code>。名称冲突可能导致令人困惑的失败。',
  'hidden-element-dimensions': '<code>{{data-title}}</code> 报告的值在元素或其父元素被隐藏时不保证准确。要获取准确的值，请确保元素在使用 <code>{{data-title}}</code> 之前是可见的。jQuery会尝试临时显示然后重新隐藏元素以测量尺寸，但这是不可靠的，且（即使准确）也会显著影响页面性能。此显示-重隐藏测量功能可能在jQuery的未来版本中被移除。',
  'jquery-selector-extension': '因为 <code>{{data-selector}}</code> 是jQuery扩展而非CSS规范的一部分，使用 <code>{{data-selector}}</code> 的查询无法利用原生DOM <code>querySelectorAll()</code> 方法提供的性能提升。要获得最佳性能，请先使用纯CSS选择器选择元素，然后使用 <a href="/filter/"><code>.filter("{{data-selector}}")</code></a>。',
  'jquery-selector-extension-alt': '因为 <code>{{data-selector}}</code> 是jQuery扩展而非CSS规范的一部分，使用 <code>{{data-selector}}</code> 的查询无法利用原生DOM <code>querySelectorAll()</code> 方法提供的性能提升。在现代浏览器中获得更好性能，请使用 <code>{{data-alt}}</code> 代替。',
  'jquery.fx.off': '所有jQuery效果，包括 <code>{{data-title}}</code>，可以通过设置 <code>jQuery.fx.off = true</code> 全局关闭。更多信息请见 <a href="/jquery.fx.off/">jQuery.fx.off</a>。',
  'no-data-on-xml': '请注意，此方法目前不提供跨平台支持在XML文档上设置数据，因为Internet Explorer不允许通过expando属性附加数据。',
  'prop-memory-leaks': '在Internet Explorer 9之前的版本中，使用 <code><a href="/prop/">.prop()</a></code> 将DOM元素属性设置为非简单原始值（数字、字符串或布尔值）时，如果在DOM元素从文档中移除之前未使用 <a href="/removeProp/"><code>.removeProp()</code></a> 移除该属性，可能导致内存泄漏。要安全地在DOM对象上设置值而不引起内存泄漏，请使用 <a href="/data/"><code>.data()</code></a>。',
  'propagation-for-live-or-delegate': '由于 <a href="/live/"><code>.live()</code></a> 方法在事件传播到文档顶部后处理事件，因此无法阻止live事件的传播。同样，由 <code><a href="/delegate/">.delegate()</a></code> 处理的事件将传播到委托的元素上；在DOM树中位于其下方的元素上绑定的事件处理程序在委托事件处理程序被调用时已经执行完毕。因此，这些处理程序可以通过调用 <code><a href="/event.stopPropagation/">event.stopPropagation()</a></code> 或返回 <code>false</code> 来阻止委托处理程序被触发。',
  'removes-data': '<code>{{data-title}}</code> 方法会移除与被移除节点关联的所有数据和事件处理程序。',
  'same-origin-policy': '由于浏览器安全限制，大多数"Ajax"请求受 <a title="Same Origin Policy on Wikipedia" href="https://en.wikipedia.org/wiki/Same_origin_policy">同源策略</a> 限制；请求无法从不同的域、子域、端口或协议成功获取数据。',
  'same-origin-policy-exceptions': '脚本和JSONP请求不受同源策略限制。',
  'use-ajaxerror': '如果使用 {{data-title}} 的请求返回错误代码，它将静默失败，除非脚本也调用了全局 <a href="/ajaxError/"><code>ajaxError</code></a> 事件。另外，从jQuery 1.5开始，{{data-title}} 返回的 <code>jqXHR</code> 对象的 <code>.error()</code> 方法也可用于错误处理。',
  'ajax-global-false': '如果 <code><a href="/jQuery.ajax/">$.ajax()</a></code> 或 <code><a href="/jQuery.ajaxSetup/">$.ajaxSetup()</a></code> 被调用时设置了 <code>global</code> 选项为 <code>false</code>，则 <code>{{data-title}}</code> 事件不会触发。',
  'slide-in-ie': '如果在无序列表（<code>&lt;ul&gt;</code>）上调用 <code>{{data-title}}</code> 并且其 <code>&lt;li&gt;</code> 元素有定位（relative、absolute或fixed），效果可能在IE6到至少IE9中不正常工作，除非 <code>&lt;ul&gt;</code> 具有"layout"。要解决此问题，请向 <code>ul</code> 添加 <code>position: relative;</code> 和 <code>zoom: 1;</code> CSS声明。',
  'html-code-execution': '根据设计，任何接受HTML字符串的jQuery构造函数或方法——<a href="/jQuery/">jQuery()</a>、<a href="/append/">.append()</a>、<a href="/after/">.after()</a> 等——都可能执行代码。这可能通过注入script标签或使用执行代码的HTML属性（例如 <code>&lt;img onload=""&gt;</code>）发生。不要使用这些方法插入从不可信来源（如URL查询参数、cookies或表单输入）获取的字符串。这样做可能导致跨站脚本（XSS）漏洞。在添加内容到文档之前，移除或转义任何用户输入。',
  'hidden-forces-layout': '大量使用此选择器可能影响性能，因为它可能强制浏览器在确定可见性之前重新渲染页面。通过其他方法（例如使用类）跟踪元素的可见性可以提供更好的性能。',
  'global-ajax-event': '从jQuery 1.9开始，所有 <a href="/category/ajax/global-ajax-event-handlers/">jQuery全局Ajax事件</a> 的处理程序，包括那些使用 <code>.on( "{{data-title}}", ... )</code> 添加的处理程序，<em>必须</em>被绑定到 <code>document</code> 上。',
  'svg-support': "jQuery不官方支持SVG。在SVG文档上使用jQuery方法，除非该方法明确记录支持，否则可能导致意外行为。从jQuery 3.0开始支持SVG的方法示例包括 <code>addClass</code> 和 <code>removeClass</code>。"
};

module.exports = { NOTE_ZH };
