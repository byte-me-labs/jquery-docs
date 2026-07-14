// CHM detection + style
var isCHM = false;
try { isCHM = (location.protocol || '').indexOf('mk:') === 0; } catch(e) {}
if (isCHM) {
  document.write('<style>body{margin:0 8px;padding:0}#sidebar{display:none}#content{margin-left:0;max-width:none;padding:4px 32px;min-height:100vh}.api-top-bar{margin-top:0;margin-bottom:2px}.api-header{margin-bottom:10px}.lang-switch-inline{display:none}</style>');
}

// Language switch
(function() {
  var cur = (location.pathname || '').indexOf('/zh/') !== -1 ? 'zh' : 'en';
  var links = document.getElementsByClassName('lang-switch-link');
  for (var i = 0; i < links.length; i++) {
    links[i].className += (links[i].getAttribute('data-lang') === cur ? ' active' : '');
    links[i].onclick = function() {
      var path = location.pathname || '';
      path = path.replace('/' + cur + '/', '/' + this.getAttribute('data-lang') + '/');
      location.href = path;
      return false;
    };
  }
})();

// Sidebar init
$(function() {
  var $sidebar = $('#sidebar'), $inner = $('#sidebar-inner');
  var pagePrefix = window.PAGE_PREFIX || '';
  var pageId = window.PAGE_ID || '';
  var html = window.SIDEBAR_HTML || '';
  if (!html) return;

  $inner.html(html);

  // Fix link prefixes for pages in subdirectories
  if (pagePrefix) {
    $('#sidebar .nav-link[href]').each(function() {
      var href = $(this).attr('href');
      if (href && href.indexOf('api/') === 0) $(this).attr('href', pagePrefix + href);
    });
  }

  // Highlight active link
  if (pageId === 'cheatsheet') {
    $('#sidebar .nav-cheatsheet').addClass('active');
  } else if (pageId) {
    $('#sidebar .nav-link[href$="' + pageId + '.html"]').addClass('active');
  }

  // Language dropdown
  var $lang = $('#nav-lang');
  var curLang = (location.pathname || '').indexOf('/zh/') !== -1 ? 'zh' : 'en';
  $lang.val(curLang);
  $lang.on('change', function() {
    var path = location.pathname || '';
    path = path.replace('/' + curLang + '/', '/' + this.value + '/');
    location.href = path;
  });

  // Move controls above scroll area
  var $ctrls = $('.nav-fixed-controls');
  if ($ctrls.length) {
    $sidebar.prepend($ctrls);
    $ctrls.css({position:'relative', zIndex:2, background:'#f8fafc'});
    $inner.css('top', $ctrls.outerHeight(true) + 'px');
  }

  // Sidebar search + version filter
  var $search = $('#nav-search'), $version = $('#nav-version');
  function parseVer(v) {
    if (!v) return 0;
    var c = String(v).replace(/-and-.*$/, '').split('.');
    return parseInt(c[0],10)*1000000 + parseInt(c[1]||0,10)*1000 + (parseInt(c[2],10)||0);
  }
  function versionMatch(el, fv, tv) {
    if (!fv) return true;
    var $el = $(el);
    var added = parseVer($el.attr('data-added')||'1.0');
    var removed = $el.attr('data-removed');
    if (added >= parseVer(tv||'999.999.999')) return false;
    if (removed && parseVer(removed) <= parseVer(fv)) return false;
    return true;
  }
  function updateSidebar() {
    var q = ($search.val()||'').toLowerCase().trim();
    var $opt = $version.find('option:selected');
    var fv = $opt.attr('data-from')||'', tv = $opt.attr('data-to')||'';
    $('#sidebar .nav-link').each(function() {
      var $l = $(this);
      var m = (!q || $l.text().toLowerCase().indexOf(q) !== -1) && versionMatch(this, fv, tv);
      $l.parent().toggle(m);
    });
    $('#sidebar .nav-category').each(function() {
      $(this).toggle(!q || $(this).find('.nav-link:visible').length > 0);
    });
    if ($version.length) $(document).trigger('versionchange');
  }
  $search.on('input', updateSidebar);
  $version.on('change', updateSidebar);

  // Category collapse
  $sidebar.on('click', '.nav-cat-title', function() { $(this).toggleClass('collapsed'); });

  // Scroll active link into view
  var $active = $('#sidebar .nav-link.active');
  if ($active.length) {
    var pos = $active.offset().top - $inner.offset().top + $inner.scrollTop() - 12;
    $inner.scrollTop(Math.max(0, pos));
  }
});
