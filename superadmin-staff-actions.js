(() => {
  'use strict';
  const wait = (fn, ms=12000) => new Promise((resolve,reject)=>{ const start=Date.now(); const t=setInterval(()=>{ try{ const v=fn(); if(v){clearInterval(t);resolve(v);} else if(Date.now()-start>ms){clearInterval(t);reject(new Error('timeout'));} }catch(e){clearInterval(t);reject(e)} },120); });
  const esc=(v)=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  async function boot(){
    const db=await wait(()=>window.gcSupabase);
    const {data:{session}}=await db.auth.getSession(); if(!session?.user)return;
    const {data:me}=await db.from('staff').select('id,full_name,role,branch,is_active').eq('id',session.user.id).maybeSingle();
    if(!me || !me.is_active || !['admin','super_admin'].includes(me.role))return;

    const table=document.querySelector('#staffRows')?.closest('table'); if(!table)return;
    const head=table.querySelector('thead tr'); if(head && !head.querySelector('[data-sa-actions]')) head.insertAdjacentHTML('beforeend','<th data-sa-actions>Actions</th>');

    const render=()=>{
      document.querySelectorAll('#staffRows tr').forEach(tr=>{
        if(!tr.querySelector('[data-sa-staff-id]'))return;
        const td=tr.querySelector('[data-sa-actions-cell]'); if(td)td.remove();
        const id=tr.getAttribute('data-staff-id');
        const disabled=id===session.user.id;
        tr.insertAdjacentHTML('beforeend',`<td data-sa-actions-cell><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><select data-sa-role ${disabled?'disabled':''} style="background:#071524;color:#f5f9ff;border:1px solid #234b72;border-radius:8px;padding:6px 7px;font:700 10px system-ui"><option>admin</option><option>accountant</option><option>super_admin</option></select><select data-sa-branch ${disabled?'disabled':''} style="background:#071524;color:#f5f9ff;border:1px solid #234b72;border-radius:8px;padding:6px 7px;font:700 10px system-ui"><option>all</option><option>erbil</option><option>dubai</option><option>china</option></select><button data-sa-save ${disabled?'disabled':''} style="border:0;background:#12d5e7;color:#03151b;border-radius:8px;padding:7px 9px;font:800 10px system-ui">Save</button></div></td>`);
        const role=tr.children[1]?.textContent?.trim(); const branch=tr.children[2]?.textContent?.trim();
        tr.querySelector('[data-sa-role]').value=role||'admin'; tr.querySelector('[data-sa-branch]').value=branch||'all';
        tr.querySelector('[data-sa-save]')?.addEventListener('click',async()=>{
          const button=tr.querySelector('[data-sa-save]'); const newRole=tr.querySelector('[data-sa-role]').value; const newBranch=tr.querySelector('[data-sa-branch]').value;
          if(!['admin','accountant','super_admin'].includes(newRole)||!['all','erbil','dubai','china'].includes(newBranch))return;
          button.disabled=true; button.textContent='…';
          try{
            const {data:target}=await db.from('staff').select('id,full_name,role,branch,is_active').eq('id',id).maybeSingle();
            if(!target)throw new Error('Staff record not found');
            if(target.id===session.user.id)throw new Error('You cannot change your own access level here');
            if(target.role==='super_admin' && newRole!=='super_admin'){
              const {count}=await db.from('staff').select('id',{count:'exact',head:true}).eq('role','super_admin').eq('is_active',true);
              if((count||0)<=1)throw new Error('At least one active super admin must remain');
            }
            const {error}=await db.from('staff').update({role:newRole,branch:newBranch,updated_at:new Date().toISOString()}).eq('id',id);
            if(error)throw error;
            await db.from('staff_activity_log').insert({staff_id:session.user.id,staff_name:me.full_name,action:'update_staff_access',target_id:id,details:`${target.full_name}: ${target.role}/${target.branch} → ${newRole}/${newBranch}`});
            button.textContent='Saved ✓'; setTimeout(()=>button.textContent='Save',1300);
          }catch(e){button.textContent='Error';alert(e.message||'Update failed');setTimeout(()=>button.textContent='Save',1300)}finally{button.disabled=false}
        });
      });
    };
    const observer=new MutationObserver(render); observer.observe(document.querySelector('#staffRows'),{childList:true}); render();
  }
  wait(()=>window.gcSupabase).then(boot).catch(()=>{});
})();
