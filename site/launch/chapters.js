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
