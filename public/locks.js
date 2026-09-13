(() => {
  const el=id=>document.getElementById(id);
  let hasData=false;
  const address=value=>typeof value==='string'&&/^0x[0-9a-fA-F]{40}$/.test(value)&&!/^0x0{40}$/.test(value);
  const raw=value=>typeof value==='string'&&/^\d{1,100}$/.test(value);
  const seconds=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000000000;
  const format=value=>{const s=BigInt(value).toString().padStart(19,'0');return BigInt(s.slice(0,-18)).toLocaleString('en-US')+'.'+s.slice(-18,-16)};
  const date=seconds=>new Date(seconds*1000).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  const fullDate=seconds=>new Date(seconds*1000).toISOString().replace('T',' ').replace('.000Z',' UTC');
  function link(id,value){const a=el(id);a.href='https://basescan.org/address/'+value;a.title=value;a.querySelector('code').textContent=value.slice(0,8)+'…'+value.slice(-6);a.setAttribute('aria-label',a.querySelector('span').textContent+' '+value+' on BaseScan')}
  function unavailable(message){el('lock-state').textContent='UNAVAILABLE';el('lock-content').hidden=true;el('lock-message').textContent=message;el('lock-updated').textContent='Vesting data unavailable';hasData=false}
  window.addEventListener('zkat:snapshot',event=>{
    try{
      const data=event.detail,v=data.devLock,asOf=Date.parse(data.updatedAt)/1000;
      if(!Number.isFinite(asOf))throw new Error();
      if(v?.status==='none'){
        el('lock-content').hidden=true;el('lock-state').textContent='NO VAULT REPORTED';el('lock-message').textContent='BaseStonk reports no dev-buy vesting vault for this token.';el('lock-updated').textContent='Source updated '+fullDate(asOf);hasData=true;return;
      }
      if(v?.status!=='reported'||v.decimals!==18||!address(v.creator)||!address(v.vault)||!address(v.beneficiary)||!Array.isArray(v.schedules)||!v.schedules.length||v.schedules.length>128)throw new Error();
      let allocation=0n,released=0n,end=0,start=Infinity;
      for(const s of v.schedules){
        if(!raw(s.totalRaw)||!raw(s.releasedRaw)||BigInt(s.releasedRaw)>BigInt(s.totalRaw)||!seconds(s.start)||!seconds(s.duration)||!seconds(s.cliff)||s.end!==s.start+s.duration||!seconds(s.end))throw new Error();
        allocation+=BigInt(s.totalRaw);released+=BigInt(s.releasedRaw);end=Math.max(end,s.end);start=Math.min(start,s.start);
      }
      const label=allocation===released?'FULLY RELEASED':asOf>=end?'SCHEDULE ENDED':asOf<start?'SCHEDULED':'VESTING ACTIVE';
      el('lock-state').textContent=label;
      el('lock-message').textContent=asOf>=end?'The reported vesting period has ended. Any unreleased amount may still await a claim.':v.schedules.every(s=>s.cliff===0&&s.duration>0)?'BaseStonk reports linear vesting for the developer’s launch allocation. Tokens unlock over the schedule.':'BaseStonk reports a dev-buy vesting schedule. See the individual terms below.';
      el('lock-allocation').textContent=format(allocation);el('lock-released').textContent=format(released);el('lock-end').textContent=date(end);el('lock-end').title=fullDate(end);
      link('dev-wallet',v.creator);link('vesting-vault',v.vault);
      const list=el('lock-schedules');list.replaceChildren();
      for(const [i,s] of v.schedules.entries()){
        const row=document.createElement('div');row.className='schedule-row';
        const title=document.createElement('strong');title.textContent='Schedule '+(i+1)+' · '+(s.duration/86400).toLocaleString('en-US',{maximumFractionDigits:2})+' days';row.append(title);
        for(const text of [fullDate(s.start)+' → '+fullDate(s.end),format(s.totalRaw)+' ZKAT scheduled · '+format(s.releasedRaw)+' released',s.cliff===0?'No cliff recorded.':'Cliff parameter recorded; consult the vault for its exact terms.']){const p=document.createElement('p');p.textContent=text;row.append(p)}
        list.append(row);
      }
      const beneficiary=document.createElement('a');beneficiary.href='https://basescan.org/address/'+v.beneficiary;beneficiary.target='_blank';beneficiary.rel='noopener noreferrer';beneficiary.textContent='Vesting beneficiary: '+v.beneficiary+' ↗';beneficiary.style.overflowWrap='anywhere';list.append(beneficiary);
      el('lock-updated').textContent='Source updated '+fullDate(asOf)+(Number.isSafeInteger(v.block)?' · block '+v.block.toLocaleString('en-US'):'');
      el('lock-content').hidden=false;hasData=true;
    }catch{unavailable('The rewards feed is connected, but its vesting record is missing or cannot be validated.')}
  });
  window.addEventListener('zkat:offline',()=>{
    el('lock-state').textContent=hasData?'STALE DATA':'UNAVAILABLE';
    el('lock-message').textContent=hasData?'Connection interrupted. These are the last reported vesting details; waiting for a fresh update.':'Vesting details are temporarily unavailable. Retrying with the rewards feed.';
  });
})();
