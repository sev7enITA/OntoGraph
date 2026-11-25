(() => {
  'use strict';

  const root = document.getElementById('research-room');
  const payload = document.getElementById('room-data');
  if (!root || !payload) return;

  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function button(label, className, handler) {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('click', handler);
    return node;
  }
  let docs;
  try {
    const parsed = JSON.parse(payload.textContent);
    if (!Array.isArray(parsed)) throw new Error();
    docs = parsed.filter(doc => doc && typeof doc.title === 'string');
  } catch {
    root.textContent = t('The collection could not be read. Reload the page to retry.', '无法读取资料集。请刷新页面重试。');
    root.setAttribute('role', 'alert');
    return;
  }
  const titleOf = doc => (zh && doc.zhTitle) || doc.title;
  const summaryOf = doc => (zh && doc.zhSummary) || doc.summary || '';
  const categoryOf = doc => (zh && doc.zhCategory) || doc.category || '';
  const query = new URLSearchParams(location.search);
  const initial = Number(query.get('d') || 0);
  let selected = Number.isInteger(initial) && initial >= 0 && initial < docs.length ? initial : 0;
  let area = 'report';

  const banner = element('div', 'rr-banner');
  const pageTitle = element('h1', '', t('Research room', '研究资料室'));
  const language = element('a', 'rr-language', t('简体中文', 'English'));
  language.lang = zh ? 'en' : 'zh-Hans';
  language.hreflang = language.lang;
  banner.append(pageTitle, language);
  const workspace = element('div', 'rr-workspace');
  const menu = element('details', 'rr-index');
  const mobile = matchMedia('(max-width: 800px)');
  menu.open = !mobile.matches;
  mobile.addEventListener('change', () => { menu.open = !mobile.matches; });
  const menuTitle = element('summary', 'rr-index-title', t('Research index', '资料索引'));
  const tools = element('div', 'rr-index-tools');
  const searchLabel = element('label', 'rr-search');
  searchLabel.append(element('span', 'rr-sr', t('Search titles and topics', '搜索标题和主题')));
  const search = element('input');
  search.type = 'search';
  search.placeholder = t('Search titles or topics', '搜索标题或主题');
  search.autocomplete = 'off';
  search.spellcheck = false;
  searchLabel.append(search);
  const topicLabel = element('label', 'rr-topic');
  topicLabel.append(element('span', '', t('Topic', '主题')));
  const topic = element('select');
  const all = element('option', '', t('All topics', '所有主题'));
  all.value = '';
  topic.append(all);
  const categories = new Map(docs.filter(d => d.category).map(d => [d.category, categoryOf(d)]));
  for (const [value, label] of [...categories].sort((a, b) => a[1].localeCompare(b[1]))) {
    const option = element('option', '', label);
    option.value = value;
    topic.append(option);
  }
  topicLabel.append(topic);
  const count = element('p', 'rr-count');
  count.setAttribute('role', 'status');
  const list = element('div', 'rr-docs');
  tools.append(searchLabel, topicLabel, count);
  menu.append(menuTitle, tools, list);

  const reader = element('section', 'rr-reader');
  reader.setAttribute('aria-label', t('Document reader', '文档阅读器'));
  workspace.append(menu, reader);
  root.replaceChildren(banner, workspace);

  // Parse in an inert template. Copy only recognized document elements and explicit safe attributes.
  const permitted = new Set('P H1 H2 H3 H4 H5 H6 OL UL LI EM STRONG B I TABLE CAPTION THEAD TBODY TFOOT TH TD TR BLOCKQUOTE PRE CODE A HR BR DL DD DT SUP SUB S DEL'.split(' '));
  const dropped = new Set('SCRIPT STYLE TEMPLATE NOSCRIPT IFRAME OBJECT EMBED IMG VIDEO AUDIO FORM SVG MATH LINK META BASE'.split(' '));
  function documentContent(html) {
    const template = document.createElement('template');
    template.innerHTML = typeof html === 'string' ? html : '';
    const unique = new Map();
    const headings = [];
    const anchors = new Map();
    function copy(from, parent) {
      for (const node of from.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          parent.append(document.createTextNode(node.textContent));
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE || dropped.has(node.tagName)) continue;
        if (!permitted.has(node.tagName)) { copy(node, parent); continue; }
        const tag = node.tagName.toLowerCase();
        const safe = element(tag === 'h1' ? 'h2' : tag);
        if (tag === 'a') {
          const raw = node.getAttribute('href') || '';
          if (raw.startsWith('#')) {
            anchors.set(safe, raw.slice(1));
          } else {
            try {
              const url = new URL(raw);
              if (url.protocol === 'https:' || url.protocol === 'http:') {
                safe.href = url.href;
                safe.rel = 'noreferrer noopener';
                safe.referrerPolicy = 'no-referrer';
                unique.set(url.href, node.textContent.trim() || url.hostname);
              }
            } catch { /* Preserve the label of unsupported links as plain text. */ }
          }
        }
        if (tag === 'td' || tag === 'th') {
          for (const attr of ['colspan', 'rowspan']) {
            const n = Number(node.getAttribute(attr));
            if (Number.isInteger(n) && n > 1 && n < 128) safe.setAttribute(attr, String(n));
          }
          if (tag === 'th' && ['row', 'col'].includes(node.getAttribute('scope'))) safe.scope = node.getAttribute('scope');
        }
        if (/^h[1-6]$/.test(tag)) {
          headings.push({node: safe, originalId: node.id, level: Number(tag[1])});
        }
        if (tag === 'table') {
          const scroller = element('div', 'rr-table');
          scroller.tabIndex = 0;
          scroller.setAttribute('role', 'region');
          scroller.setAttribute('aria-label', t('Scrollable data table', '可滚动数据表'));
          parent.append(scroller);
          scroller.append(safe);
        } else {
          parent.append(safe);
        }
        copy(node, safe);
      }
    }
    const content = element('div', 'rr-prose');
    copy(template.content, content);
    const ids = new Map();
    for (const [i, h] of headings.entries()) {
      h.node.id = 'rr-section-' + i;
      h.node.tabIndex = -1;
      if (h.originalId) ids.set(h.originalId, h.node.id);
    }
    for (const [link, id] of anchors) {
      if (ids.has(id)) link.href = '#' + ids.get(id);
    }
    return {content, headings, unique};
  }

  function drawList() {
    const term = search.value.trim().toLocaleLowerCase();
    const matches = docs.map((doc, index) => ({doc, index})).filter(({doc}) => {
      const text = [doc.title, doc.zhTitle, doc.category, doc.zhCategory, ...(Array.isArray(doc.tags) ? doc.tags : [])];
      return (!topic.value || topic.value === doc.category) && text.join(' ').toLocaleLowerCase().includes(term);
    });
    count.textContent = t(matches.length + (matches.length === 1 ? ' document' : ' documents'), matches.length + ' 份文档');
    list.replaceChildren();
    for (const {doc, index} of matches) {
      const entry = button('', 'rr-doc', () => {
        selected = index;
        area = 'report';
        drawList();
        drawReader();
        if (mobile.matches) menu.open = false;
        reader.querySelector('h2')?.focus({preventScroll: !mobile.matches});
      });
      if (index === selected) entry.setAttribute('aria-current', 'true');
      const line = element('span', 'rr-doc-meta');
      line.textContent = [doc.date, categoryOf(doc)].filter(Boolean).join(' · ');
      entry.append(line, element('span', 'rr-doc-title', titleOf(doc)));
      list.append(entry);
    }
    if (!matches.length && docs.length) {
      list.append(element('p', 'rr-empty', t('No matching documents.', '未找到匹配的文档。')),
        button(t('Clear filters', '清除筛选'), 'rr-reset', () => {
          search.value = ''; topic.value = ''; drawList(); search.focus();
        }));
    }
  }

  function drawReader() {
    const nextURL = new URL(location.pathname, location.origin);
    if (!zh) nextURL.searchParams.set('lang', 'zh-Hans');
    if (selected) nextURL.searchParams.set('d', String(selected));
    language.href = nextURL.pathname + nextURL.search;
    reader.replaceChildren();
    const doc = docs[selected];
    if (!doc) {
      reader.append(element('p', 'rr-empty', t('No documents are available.', '暂无文档。')));
      return;
    }
    const {content, headings, unique} = documentContent((zh && doc.zhHtml) || doc.html);
    const articleLang = zh && doc.zhHtml ? 'zh-Hans' : 'en';
    content.lang = articleLang;
    // The room supplies the display title independently of an optional Markdown H1.
    const first = headings[0];
    if (first && first.level === 1 && [doc.title, titleOf(doc)].includes(first.node.textContent.trim())) {
      first.node.remove();
      headings.shift();
    }
    const heading = element('div', 'rr-heading');
    const meta = element('p', 'rr-meta', [categoryOf(doc), doc.date].filter(Boolean).join(' · '));
    const title = element('h2', 'rr-title', titleOf(doc));
    title.tabIndex = -1;
    heading.append(meta, title);
    if (summaryOf(doc)) heading.append(element('p', 'rr-summary', summaryOf(doc)));
    if (zh && !doc.zhHtml) heading.append(element('p', 'rr-language-note', '正文为英文原文。'));
    const nav = element('div', 'rr-views');
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', t('Reading view', '阅读视图'));
    const contentArea = element('div', 'rr-body');
    const sources = element('ol', 'rr-sources');
    for (const [href, label] of unique) {
      const link = element('a', '', label);
      link.href = href; link.rel = 'noreferrer noopener'; link.referrerPolicy = 'no-referrer';
      const row = element('li');
      row.append(link, element('span', '', new URL(href).hostname));
      sources.append(row);
    }
    const outline = element('details', 'rr-outline');
    const summary = element('summary', '', t('On this page', '本页目录'));
    const links = element('div', 'rr-outline-links');
    for (const {node, level} of headings.filter(h => h.level <= 3)) {
      const jump = button(node.textContent.trim(), 'rr-level-' + level, () => {
        outline.open = false;
        node.focus({preventScroll:true});
        node.scrollIntoView({block:'start'});
      });
      links.append(jump);
    }
    outline.append(summary, links);
    const reportButton = button(t('Report', '报告'), 'rr-view', () => switchArea('report'));
    const sourcesButton = button(t('Sources', '来源') + ' (' + unique.size + ')', 'rr-view', () => switchArea('sources'));
    const print = button(t('Print report', '打印报告'), 'rr-print', () => window.print());
    nav.append(reportButton, sourcesButton, print);
    contentArea.append(outline, content, sources);
    const noSources = element('p', 'rr-empty', t('This report has no external source links.', '本报告未提供外部来源链接。'));
    contentArea.append(noSources);
    function switchArea(next) {
      area = next;
      const reading = next === 'report';
      reportButton.setAttribute('aria-pressed', String(reading));
      sourcesButton.setAttribute('aria-pressed', String(!reading));
      content.hidden = !reading; outline.hidden = !reading || !links.childElementCount;
      sources.hidden = reading || !unique.size;
      noSources.hidden = reading || !!unique.size;
    }
    reader.append(heading, nav, contentArea);
    switchArea(area);
  }
  search.addEventListener('input', drawList);
  topic.addEventListener('change', drawList);
  drawList();
  drawReader();
})();
