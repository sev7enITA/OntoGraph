import {propose} from './case-model.js?v=2';

const root=document.querySelector('#hidden-risks');
const $=s=>root.querySelector(s);
const t=(en,cn)=>document.documentElement.lang==='zh-Hans'?cn:en;
const samples={
  library:{
    label:t('Library · one loan, two copies','图书馆 · 一笔借阅，两本副本'),
    brief:t('A library lends physical copies to readers. A loan concerns one copy. Copies may share an ISBN.','图书馆向读者借出实体副本。一次借阅对应一个副本。多个副本可能共用一个 ISBN。'),
    stages:[[t('Which copy is on loan?','哪一本已借出？'),t('Two copies share an ISBN. Marking the edition as borrowed could hide both copies.','两个副本共用一个 ISBN。若将整个版本标为已借出，两本书都可能显示为不可借。')],
      [t('Define the physical copy','定义实体副本'),t('Give each copy an identity of its own. ISBN describes the edition shared by both.','为每个副本赋予独立标识。ISBN 描述两者共有的版本。')],
      [t('Separate objects from events','区分对象和事件'),t('Group the copy with business objects and the loan with events.','将副本归入业务对象，将借阅归入事件。')],
      [t('Link the loan to one copy','关联借阅与具体副本'),t('A loan depends on the physical item. Test that the second copy stays available.','每笔借阅取决于一个具体副本。测试第二本书是否仍然可借。')]]},
  wbs:{
    label:t('WBS · one code, two departments','WBS · 一个编码，两个部门'),
    brief:t('Finance and PMO import CSV files. The same WBS code identifies different objects in each department.','财务部门和项目管理办公室导入 CSV 文件。同一个 WBS 编码在不同部门代表不同对象。'),
    stages:[[t('Can these rows be joined?','可以合并这两行吗？'),t('Two departments use 0017. Joining on that text alone could count the wrong object.','两个部门都使用 0017。只按编码匹配可能会计入错误的对象。')],
      [t('Define WBS in context','按部门定义 WBS'),t('Finance uses the code for a posting object. PMO uses it for a work package.','财务用该编码表示记账对象，项目管理办公室用它表示工作包。')],
      [t('Classify the code and its owner','区分编码与所属部门'),t('Place WBS under identifiers and the department under participants.','将 WBS 归为标识符，将部门归为参与者。')],
      [t('Tie the code to its source','把编码关联到来源'),t('Review the links from WBS to its department and source record before accepting the match.','接受匹配前，请核对 WBS 与所属部门及来源记录的关系。')]]}
};
let sample='library',step=0,timer=null,request=0;
const nodes=[...root.querySelectorAll('[data-step]')];
const rows=[...root.querySelectorAll('#ct-chart>div')];
function stop(){
  clearInterval(timer);timer=null;$('.ct-map').dataset.playing='false';
  $('#ct-play').textContent=t('▶ Play trace','▶ 播放路径');
}
function render(){
  const s=samples[sample];
  nodes.forEach((n,i)=>{n.setAttribute('aria-pressed',String(i===step));rows[i].classList.toggle('selected',i===step);});
  $('#ct-source').textContent=s.label;$('#ct-type').textContent=nodes[step].textContent;
  $('#ct-title').textContent=s.stages[step][0];$('#ct-detail').textContent=s.stages[step][1];
  $('#ct-index').textContent=(step+1)+' / 4';
  $('#ct-prev').disabled=step===0;$('#ct-next').disabled=step===3;
}
async function counts(){
  const current=++request;
  try{
    const {terms,risks,model}=await propose(samples[sample].brief,document.documentElement.lang==='zh-Hans','case-preview');
    if(current!==request)return;
    const n=[risks.length,terms.length,new Set(terms.map(v=>v.group)).size,model.edges.filter(e=>e.predicate==='dependsOn'&&terms.some(x=>x.id===e.target)&&!e.source.startsWith('risk-')).length];
    rows.forEach((r,i)=>{r.querySelector('output').textContent=n[i];r.style.setProperty('--value',100*n[i]/Math.max(...n)+'%');});
    $('#ct-chart').hidden=false;
  }catch{if(current===request)$('#ct-chart').hidden=true;}
}
for(const btn of root.querySelectorAll('[data-sample]'))btn.onclick=()=>{
  stop();sample=btn.dataset.sample;step=0;
  root.querySelectorAll('[data-sample]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
  render();void counts();
};
nodes.forEach((n,i)=>n.onclick=()=>{stop();step=i;render();});
$('#ct-prev').onclick=()=>{stop();step--;render();};$('#ct-next').onclick=()=>{stop();step++;render();};
function play(){
  if(step===3)step=0;
  render();$('.ct-map').dataset.playing='true';$('#ct-play').textContent=t('Ⅱ Pause trace','Ⅱ 暂停播放');
  timer=setInterval(()=>{step++;render();if(step===3)stop();},2800);
}
$('#ct-play').onclick=()=>timer?stop():play();
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
render();void counts();

if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting))return;
    observer.disconnect();
    if(!document.hidden)play();
  },{threshold:.45});
  root.addEventListener('pointerdown',()=>observer.disconnect(),{once:true});
  root.addEventListener('focusin',()=>observer.disconnect(),{once:true});
  observer.observe($('.ct-console'));
}
