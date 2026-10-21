import assert from 'node:assert/strict';import {load,cleanup,memory} from './load.mjs';
const {createPasswordAccountHandler}=await load('password-auth'),{digest}=await load('arena-access'),db=memory(),owner={},one={},two={},guest={};
async function call(body,jar=guest,query=''){
 const response=await createPasswordAccountHandler(db,{setupHash:await digest('setup'),clientIp:jar===owner?'owner':jar===one?'one':jar===two?'two':'guest'})(new Request('https://goal.test/api/account'+query,{method:body?'POST':'GET',headers:{cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join(';')},...(body?{body:JSON.stringify(body)}:{})}));
 for(const c of response.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');jar[k]=v}return {status:response.status,...await response.json()};
}
try{
 await call({action:'setupPassword',username:'owner',password:'Owner-password-123',setupKey:'setup'},owner);
 const invite=await call({action:'createAdminInvite'},owner);await call({action:'acceptInvite',inviteToken:invite.inviteToken,username:'coadmin',password:'Coadmin-password-123'},one);
 assert.equal((await call({action:'createAdminInvite'},one)).status,403);
 let list=await call(null,owner,'?admins=1'),child=list.admins.find(a=>!a.owner);
 assert.equal((await call({action:'setAdminInvitePermission',adminId:child.id,allowed:true},owner)).status,200);
 assert((await call(null,one)).canInviteAdmins);assert.equal((await call(null,one,'?admins=1')).canManageAdmins,false);
 const delegated=await call({action:'createAdminInvite',label:'Invited by coadmin'},one);assert.equal(delegated.status,200);
 for(const action of ['revokeAdmin','setAdminInvitePermission'])assert.equal((await call({action,adminId:'owner',allowed:true},one)).status,403);
 const privateOwner=await call({action:'createAdminInvite',label:'Owner only'},owner);list=await call(null,one,'?admins=1');assert.equal(list.invites.length,1,'delegates only see their own invitations');
 const ownerList=await call(null,owner,'?admins=1'),foreign=ownerList.invites.find(i=>i.label==='Owner only');assert.equal((await call({action:'revokeAdminInvite',inviteId:foreign.id},one)).status,400);
 assert.equal((await call({action:'acceptInvite',inviteToken:delegated.inviteToken,username:'thirdadmin',password:'Third-password-123'},two)).status,200);assert(!(await call(null,two)).canInviteAdmins,'delegation is never inherited');
 const pending=await call({action:'createAdminInvite'},one);await call({action:'setAdminInvitePermission',adminId:child.id,allowed:false},owner);
 assert.equal((await call({action:'acceptInvite',inviteToken:pending.inviteToken,username:'blocked',password:'Blocked-password-123'},guest)).status,403);
 assert.equal((await call({action:'createAdminInvite'},one)).status,403);assert.equal((await call(null,one,'?admins=1')).status,403);
 assert.equal((await call({action:'acceptInvite',inviteToken:privateOwner.inviteToken,username:'ownerinvite',password:'Owner-invite-123'},guest)).status,200);
 assert((await call(null,owner)).owner);console.log('PASS: explicit owner delegation, scoped invitations, no inherited privilege, permission removal cancels pending invites and protected owner.');
}finally{cleanup()}
