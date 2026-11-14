(() => {
  'use strict';
  const labels = {lexique:'Lexique',grammaire:'Grammaire',conjugaisons:'Conjugaisons',bibliographie:'Bibliographie',enquetes:'Enquêtes',reperes:'Repères',actualites:'Actualités',pages:'Pages du site'};
  const statuses = {atteste:'Attesté',propose:'Proposé / reconstitué',a_verifier:'À vérifier'};
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/[’‘ʼ`']/g,' ').replace(/[-‐‑–—]/g,' ').replace(/\s+/g,' ').trim();
  const element = (tag, text, className) => { const e=document.createElement(tag); if(text)e.textContent=text; if(className)e.className=className; return e; };
  const safeURL = value => { const u=new URL(value,location.href); if(u.origin!==location.origin || !/^https?:$/.test(u.protocol))throw new Error('Lien de résultat invalide'); return u.href; };
  document.querySelectorAll('[data-resource-search]').forEach(async root => {
    const form=root.querySelector('form'), status=root.querySelector('[data-search-status]'), results=root.querySelector('[data-search-results]'), more=root.querySelector('[data-search-more]');
    const scope=root.dataset.scope, fields=['kind','localite','graphie','source','statut'];
    let matches=[], shown=20;
    try {
      const response=await fetch(root.dataset.index,{credentials:'same-origin'});
      if(!response.ok)throw new Error('Index inaccessible');
      const index=await response.json();
      if(index.version!==1 || !Array.isArray(index.documents))throw new Error('Index invalide');
      const docs=index.documents.filter(d => scope==='all' || (scope==='resources' ? d.resource : d.resource && d.kind===scope));
      const options = (name, values, names={}) => {
        const select=form.elements.namedItem(name);
        [...new Set(values.filter(Boolean))].sort((a,b)=>(names[a]||a).localeCompare(names[b]||b,'fr')).forEach(value => { const option=element('option',names[value]||value); option.value=value; select.append(option); });
        if(select.options.length===1)select.disabled=true;
      };
      options('kind',docs.map(d=>d.kind),labels);
      const rows=docs.flatMap(d=>d.rows);
      options('localite',rows.flatMap(r=>r.localites)); options('graphie',rows.flatMap(r=>r.graphies)); options('source',rows.flatMap(r=>r.sources),index.sources); options('statut',rows.flatMap(r=>r.statuts),statuses);
      const initial=new URLSearchParams(location.search);
      ['q',...fields].forEach(name=>{const control=form.elements.namedItem(name), value=initial.get(name)||''; if(name==='q' || [...control.options].some(o=>o.value===value))control.value=value;});
      const render = () => {
        results.replaceChildren();
        matches.slice(0,shown).forEach(({doc,rows})=>{
          const card=element('article',null,'search-result');
          card.append(element('p',labels[doc.kind]||doc.kind,'resource-caption'));
          const title=element('h3'), link=element('a',doc.title); link.href=safeURL(doc.url); title.append(link);card.append(title);
          if(doc.description)card.append(element('p',doc.description));
          const variants=rows.filter(r=>r.forme || r.localites.length || r.graphies.length || r.sourceLabel);
          if(variants.length){ const list=element('ul',null,'search-variants'); variants.slice(0,4).forEach(r=>{
            const line=[r.forme,...r.localites,...r.graphies,r.sourceLabel,...r.statuts.map(s=>statuses[s]||s)].filter(Boolean).join(' · ');
            const item=element('li'); if(r.anchor){const a=element('a',line);a.href=safeURL(doc.url+'#'+r.anchor);item.append(a);}else item.textContent=line;list.append(item);
          });card.append(list);if(variants.length>4)card.append(element('p',`${variants.length-4} autre(s) observation(s) dans la fiche.`,'resource-caption'));}
          results.append(card);
        });
        status.textContent=matches.length ? `${matches.length} résultat${matches.length>1?'s':''} — ${Math.min(shown,matches.length)} affiché${Math.min(shown,matches.length)>1?'s':''}.` : (docs.length ? 'Aucun résultat pour ces critères. Essayez un autre mot ou retirez un filtre.' : 'Aucune fiche publiée dans cette rubrique pour le moment.');
        more.hidden=shown>=matches.length;
      };
      const search = () => {
        const q=form.elements.namedItem('q').value, tokens=norm(q).split(' ').filter(Boolean);
        const filters=Object.fromEntries(fields.map(n=>[n,form.elements.namedItem(n).value]));
        matches=docs.flatMap(doc=>{
          if(filters.kind && doc.kind!==filters.kind)return [];
          const base=norm(`${doc.title} ${doc.description} ${doc.keywords || ""} ${doc.content}`);
          const matchingRows=doc.rows.filter(row=>{
            if(filters.localite && !row.localites.includes(filters.localite))return false;
            if(filters.graphie && !row.graphies.includes(filters.graphie))return false;
            if(filters.source && !row.sources.includes(filters.source))return false;
            if(filters.statut && !row.statuts.includes(filters.statut))return false;
            const haystack=base+' '+norm([row.text,row.sourceLabel,...row.localites,...row.graphies].join(' '));
            return tokens.every(t=>haystack.includes(t));
          });
          if(!matchingRows.length)return [];
          const title=norm(doc.title), keywords=norm(doc.keywords), summary=norm(doc.description);
          const score=tokens.length ? (title===norm(q) ? 100 : 0) + tokens.reduce((sum,t)=>sum+(title.includes(t)?12:0)+(keywords.includes(t)?6:0)+(summary.includes(t)?3:0),0) : 0;
          return [{doc,rows:matchingRows,score}];
        }).sort((a,b)=>b.score-a.score||a.doc.title.localeCompare(b.doc.title,'fr'));
        shown=20;render();
        const params=new URLSearchParams(); if(q)params.set('q',q); fields.forEach(n=>{if(filters[n])params.set(n,filters[n]);});
        const suffix=params.toString(); history.replaceState(null,'',location.pathname+(suffix?'?'+suffix:'')+location.hash);
      };
      form.hidden=false;
      const fallback=root.parentElement.querySelector('[data-search-fallback]'); if(fallback)fallback.hidden=true;
      form.addEventListener('submit',event=>{event.preventDefault();search();});
      form.addEventListener('input',search); form.addEventListener('change',search);
      form.addEventListener('reset',()=>setTimeout(search,0));
      more.addEventListener('click',()=>{shown+=20;render();});
      search();
    } catch(error) {
      status.textContent='La recherche est momentanément indisponible. Vous pouvez parcourir les rubriques et leurs fiches ci-dessous.';
      form.hidden=true; more.hidden=true;
    }
  });
})();
