import React,{useEffect,useState} from 'react';
import {useLocale} from '../lib/i18n';
import {Button,Field,Modal,Icon} from './ui';
export default function AdminAccess({close,notify}:any){
 const {t,lang}=useLocale(),[data,setData]=useState<any>(null),[label,setLabel]=useState(''),[link,setLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revoke,setRevoke]=useState<any>(null);
 const load=async()=>{try{const r=await fetch('/api/account?admins=1'),d=await r.json();if(!r.ok){setError(t(d.code||'requestFailed'));return}setData(d)}catch{setError(t('requestFailed'))}};
 useEffect(()=>{load()},[]);
 const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);notify(t('copied'))}catch{notify(t('copyFailed'))}};
 const request=async(action:string,body:any={})=>{setBusy(true);setError('');try{const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body})}),d=await r.json();if(!r.ok){setError(t(d.code||'requestFailed'));return false}if(d.inviteToken){setLink(location.origin+'/?invite='+d.inviteToken);setLabel('')}await load();return true}catch{setError(t('requestFailed'));return false}finally{setBusy(false)}};
 return <Modal title={t('adminAccess')} onClose={close} wide>
  <p className="helper">{t('adminDelegationHelp')}</p>
  <div className="invite-link-box"><Field label={t('adminPortalLink')}><input readOnly value={location.origin+'/?admin=1'} onFocus={e=>e.target.select()}/></Field><Button icon="copy" onClick={()=>copy(location.origin+'/?admin=1')}>{t('copy')}</Button><p className="helper">{t('adminPortalHelp')}</p></div>
  {data&&<>
   <div className="section-line"><span className="eyebrow">{t('admins')}</span><b>{data.admins.filter((a:any)=>a.active).length} / {data.limit}</b></div>
   <div className="admin-list">{data.admins.map((a:any)=><article key={a.id}><span className={'admin-avatar '+(a.active?'':'revoked')}><Icon name="lock" size={18}/></span><div><b>{a.username}</b><span>{t(a.owner?'accountOwner':a.active?'adminActive':'adminRevoked')}</span>{data.canManageAdmins&&!a.owner&&a.active&&<label className="check-field"><input type="checkbox" checked={!!a.canInviteAdmins} disabled={busy} onChange={e=>request('setAdminInvitePermission',{adminId:a.id,allowed:e.target.checked})}/><span>{t('allowAdminInvites')}</span></label>}</div>{data.canManageAdmins&&!a.owner&&a.active&&<Button variant="ghost" disabled={busy} onClick={()=>setRevoke(a)}>{t('revokeAccess')}</Button>}</article>)}</div>
   {revoke&&<div className="revoke-confirm" role="alert"><p>{t('revokeHelp')} <b>{revoke.username}</b></p><div className="actions"><Button variant="coral" disabled={busy} onClick={async()=>{if(await request('revokeAdmin',{adminId:revoke.id})){setRevoke(null);notify(t('saved'))}}}>{t('revokeAccess')}</Button><Button disabled={busy} onClick={()=>setRevoke(null)}>{t('cancel')}</Button></div></div>}
   <form className="admin-invite-form" onSubmit={async e=>{e.preventDefault();await request('createAdminInvite',{label})}}><h3>{t('inviteAdmin')}</h3><p className="helper">{t('inviteAdminHelp')}</p><Field label={t('invitationLabel')}><input maxLength={40} value={label} onChange={e=>setLabel(e.target.value)}/></Field><Button type="submit" variant="coral" icon="plus" disabled={busy||data.admins.filter((a:any)=>a.active).length>=data.limit}>{t('createAdminInvite')}</Button></form>
   {link&&<div className="invite-link-box" role="status"><Field label={t('privateAdminLink')}><input readOnly value={link} onFocus={e=>e.target.select()}/></Field><Button icon="copy" onClick={()=>copy(link)}>{t('copyAdminLink')}</Button><p className="helper">{t('inviteLinkHelp')}</p></div>}
   <div className="admin-pending"><h3>{t('pendingInvites')}</h3>{data.invites.filter((i:any)=>!i.used&&!i.revoked&&i.expires>Date.now()).map((i:any)=><article key={i.id}><div><b>{i.label||t('inviteAdmin')}</b><span>{t('expiresAt')} {new Intl.DateTimeFormat(lang,{dateStyle:'short',timeStyle:'short'}).format(i.expires)}</span></div><Button disabled={busy} onClick={()=>request('revokeAdminInvite',{inviteId:i.id})}>{t('cancelInvite')}</Button></article>)}</div>
  </>}
  {!data&&!error&&<p className="helper">{t('loading')}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
 </Modal>
}
