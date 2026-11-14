(() => {
  'use strict';
  const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const readDate = value => { if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null; const [y,m,d]=value.split('-').map(Number), date=new Date(y,m-1,d,12); return key(date)===value ? date : null; };
  document.querySelectorAll('[data-workshop-calendar]').forEach(root => {
    try {
      const dates=new Set(JSON.parse(root.dataset.dates).filter(value=>readDate(value)));
      const now=new Date(), today=key(now), upcoming=[...dates].sort().find(value=>value>=today);
      const start=upcoming ? readDate(upcoming) : now;
      let month=new Date(start.getFullYear(),start.getMonth(),1,12);
      const title=root.querySelector('[data-calendar-month]'), caption=root.querySelector('[data-calendar-caption]'), body=root.querySelector('[data-calendar-days]'), status=root.querySelector('[data-calendar-status]');
      const format=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}), full=new Intl.DateTimeFormat('fr-FR',{dateStyle:'full'});
      const render=()=>{
        title.textContent=format.format(month); caption.textContent=`Ateliers — ${format.format(month)}`; body.replaceChildren();
        const count=new Date(month.getFullYear(),month.getMonth()+1,0,12).getDate(), offset=(month.getDay()+6)%7;
        let workshops=0;
        for(let i=0;i<Math.ceil((offset+count)/7)*7;i+=7){
          const row=document.createElement('tr');
          for(let j=0;j<7;j++){
            const cell=document.createElement('td'), day=i+j-offset+1;
            if(day>0&&day<=count){
              const date=new Date(month.getFullYear(),month.getMonth(),day,12), value=key(date), event=dates.has(value);
              const label=document.createElement(event?'a':'span'); label.textContent=String(day);
              if(value===today)label.setAttribute('aria-current','date');
              if(event){ workshops++; label.href=root.dataset.contact; label.className='atelier-calendar__event'; label.setAttribute('aria-label',`${full.format(date)} : atelier — renseignements`); }
              cell.append(label);
            }
            row.append(cell);
          }
          body.append(row);
        }
        status.textContent=workshops ? `${workshops} atelier${workshops>1?'s':''} confirmé${workshops>1?'s':''} ce mois-ci.` : 'Aucune date confirmée pour ce mois.';
      };
      root.querySelector('[data-calendar-prev]').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1,12);render();});
      root.querySelector('[data-calendar-next]').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1,12);render();});
      render(); root.querySelector('[data-calendar-interactive]').hidden=false; root.querySelector('[data-calendar-fallback]').hidden=true;
    } catch { /* Keep the server-rendered dates visible if JavaScript cannot initialize. */ }
  });
})();
