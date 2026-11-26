const film=document.getElementById('launch-film');
for(const link of document.querySelectorAll('a[data-second]')){
  link.addEventListener('click',event=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    film.currentTime=Number(link.dataset.second);
    film.scrollIntoView({block:'center'});
    film.focus({preventScroll:true});
    film.play().catch(()=>{});
  });
}

function openLinkedChapter() {
  const chapter = document.querySelector('[data-chapter="agent-ready"]');
  if (location.hash === '#agent-ready' && chapter) {
    film.currentTime = Number(chapter.dataset.second);
  }
}
if (film.readyState >= HTMLMediaElement.HAVE_METADATA) {
  openLinkedChapter();
} else {
  film.addEventListener('loadedmetadata', openLinkedChapter, {once: true});
}
window.addEventListener('hashchange', openLinkedChapter);
