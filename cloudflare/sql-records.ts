import type {RecordRow} from '../lib/arena-server';
// Small chunks avoid SQLite's per-value size limit even when a season contains
// large inline logos and many frozen match rosters. Every replacement is atomic.
const CHUNK=16000;
export class SqlRecords {
 constructor(private storage:any){const sql=storage.sql;sql.exec('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, secret TEXT NOT NULL, revision INTEGER NOT NULL, etag TEXT NOT NULL)');sql.exec('CREATE TABLE IF NOT EXISTS record_chunks (id TEXT NOT NULL, part INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(id,part))');sql.exec('CREATE TABLE IF NOT EXISTS room_index (id TEXT PRIMARY KEY)')}
 get(id:string):RecordRow|null{const meta=this.storage.sql.exec('SELECT id,secret,revision,etag FROM records WHERE id=?',id).toArray()[0];if(!meta)return null;const data=this.storage.sql.exec('SELECT data FROM record_chunks WHERE id=? ORDER BY part',id).toArray().map((r:any)=>r.data).join('');return {...meta,data}}
 private write(row:RecordRow){if(typeof row.id!=='string'||row.id.length>240||typeof row.secret!=='string'||typeof row.data!=='string'||!Number.isSafeInteger(row.revision)||row.revision<0)throw Error('Invalid stored record');const etag=crypto.randomUUID();this.storage.sql.exec('INSERT OR REPLACE INTO records(id,secret,revision,etag) VALUES(?,?,?,?)',row.id,row.secret,row.revision,etag);this.storage.sql.exec('DELETE FROM record_chunks WHERE id=?',row.id);for(let i=0,part=0;i<row.data.length;part++){let end=Math.min(row.data.length,i+CHUNK);const c=row.data.charCodeAt(end-1);if(end<row.data.length&&c>=0xD800&&c<=0xDBFF)end--;this.storage.sql.exec('INSERT INTO record_chunks(id,part,data) VALUES(?,?,?)',row.id,part,row.data.slice(i,end));i=end}return etag}
 create(row:RecordRow){return this.storage.transactionSync(()=>{if(this.storage.sql.exec('SELECT id FROM records WHERE id=?',row.id).toArray().length)throw Error('Record already exists');return this.write(row)})}
 update(row:RecordRow,old:RecordRow){return this.storage.transactionSync(()=>{if(row.id!==old.id)return false;const meta=this.storage.sql.exec('SELECT revision,etag FROM records WHERE id=?',row.id).toArray()[0];if(!meta||meta.revision!==old.revision||old.etag&&meta.etag!==old.etag)return false;this.write(row);return true})}
 list(after='',limit=100){return this.storage.sql.exec('SELECT id,revision FROM records WHERE id>? ORDER BY id LIMIT ?',after,Math.min(100,Math.max(1,limit))).toArray()}
 registerRoom(id:string){this.storage.sql.exec('INSERT OR IGNORE INTO room_index(id) VALUES(?)',id)}
 roomIds(){return this.storage.sql.exec('SELECT id FROM room_index ORDER BY id').toArray().map((r:any)=>r.id)}
}
