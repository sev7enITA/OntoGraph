(() => {
  'use strict';

  const messages = {
    en: {
      inputs: 'Incoming WBS record',
      team: 'Department on the record',
      teams: { finance: 'Finance', pmo: 'Project Management Office (PMO)', unknown: 'Unknown' },
      source: 'Source file and layout',
      sources: { ledger: 'ledger.csv · Finance v1', schedule: 'schedule.csv · PMO v1', missing: 'No source supplied' },
      naive: 'Using the code alone',
      naiveTitle: 'Both records match 0017',
      naiveDetail: 'A join on WBS alone treats a ledger entry and a work package as the same object. Both contain the text 0017.',
      scoped: 'Using the department and source',
      review: 'Hold for human review',
      noTeam: 'Ask the data owner which department supplied the record. A file name alone cannot establish who supplied this row.',
      noSource: 'Ask for the source file and its layout version. The department label alone cannot identify the field mapping.',
      conflict: 'The department and source layout disagree. Ask the two data owners to confirm the origin before routing the row.',
      next: 'Next step',
      finance: 'Finance posting object',
      financeDetail: 'The Finance ledger layout maps WBS to an accounting object. Route the row to Finance staging for the usual posting checks.',
      pmo: 'PMO work package',
      pmoDetail: 'The PMO schedule layout maps WBS to a work package. Route the row to project planning for the usual schedule checks.',
      hold: 'Keep the row out of both staging routes until the mapping is confirmed.'
    },
    zh: {
      inputs: '传入的 WBS 记录',
      team: '记录中的部门',
      teams: { finance: '财务部', pmo: '项目管理办公室（PMO）', unknown: '未知' },
      source: '源文件和格式版本',
      sources: { ledger: 'ledger.csv · 财务部 v1', schedule: 'schedule.csv · 项目管理办公室 v1', missing: '未提供来源' },
      naive: '仅按编码关联',
      naiveTitle: '两条记录的编码都是 0017',
      naiveDetail: '如果只按 WBS 关联，系统就会把一条总账记录和一个工作包当作同一个对象，因为两者的编码都是文本 0017。',
      scoped: '结合部门和来源判断',
      review: '暂缓处理，提交人工复核',
      noTeam: '请数据负责人确认哪个部门提供了这条记录。仅凭文件名无法确认该行数据的提供方。',
      noSource: '请补充源文件及其格式版本。仅凭部门名称无法确定字段映射。',
      conflict: '记录中的部门与源文件格式不符。请双方的数据负责人核实来源，再分派这条记录。',
      next: '下一步',
      finance: '财务记账对象',
      financeDetail: '在财务总账文件中，WBS 映射到记账对象。将记录送入财务暂存区，按常规流程进行记账检查。',
      pmo: '项目工作包',
      pmoDetail: '在项目进度计划文件中，WBS 映射到工作包。将记录交给项目计划人员，按常规流程检查进度。',
      hold: '在映射得到确认前，两个暂存区都不接收这条记录。'
    }
  };

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }

  function choice(parent, label, options) {
    const wrapper = element('label', label);
    const select = element('select');
    for (const [value, title] of Object.entries(options)) {
      select.add(new Option(title, value));
    }
    wrapper.append(select);
    parent.append(wrapper);
    return select;
  }

  function resultCard(eyebrow, heading, detail) {
    const card = element('div');
    card.className = 'risk-readout';
    const label = element('p', eyebrow);
    label.className = 'risk-readout-label';
    card.append(label, element('h3', heading), element('p', detail));
    return card;
  }

  const lab = document.querySelector('[data-risk-lab]');
  if (!lab) return;
  const controls = lab.querySelector('[data-risk-controls]');
  const result = lab.querySelector('[data-risk-result]');
  if (!controls || !result) return;

  const t = /^zh(?:-|$)/i.test(document.documentElement.lang) ? messages.zh : messages.en;
  const fields = element('fieldset');
  fields.append(element('legend', t.inputs));
  const team = choice(fields, t.team, t.teams);
  const source = choice(fields, t.source, t.sources);
  const baseline = resultCard(t.naive, t.naiveTitle, t.naiveDetail);
  const verdict = element('div');
  verdict.setAttribute('aria-live', 'polite');
  verdict.setAttribute('aria-atomic', 'true');

  function render() {
    const gaps = [];
    if (team.value === 'unknown') gaps.push(t.noTeam);
    if (source.value === 'missing') gaps.push(t.noSource);
    const expectedSource = { finance: 'ledger', pmo: 'schedule' };
    if (!gaps.length && expectedSource[team.value] !== source.value) gaps.push(t.conflict);
    const pending = gaps.length > 0;
    const card = resultCard(t.scoped, pending ? t.review : t[team.value],
      pending ? gaps.join(' ') : t[team.value + 'Detail']);
    if (pending) {
      const next = element('p');
      next.append(element('strong', t.next), ' · ', t.hold);
      card.append(next);
    }
    card.dataset.outcome = pending ? 'review' : team.value;
    verdict.replaceChildren(card);
  }

  render();
  fields.addEventListener('change', render);
  controls.replaceChildren(fields);
  result.replaceChildren(baseline, verdict);
})();
