import {createHash} from 'crypto';
import {pool} from './db';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function loginKeys(email:string,ip:string){return ['email:'+digest(email),'ip:'+digest(ip)];}
export async function loginBlocked(keys:string[]){const r=await pool.query('SELECT 1 FROM login_attempts WHERE key=ANY($1::text[]) AND blocked_until>now() LIMIT 1',[keys]);return r.rowCount!==0;}
export async function recordLoginFailure(keys:string[]){
 for(const key of keys){await pool.query(`INSERT INTO login_attempts(key,failures,window_start,blocked_until) VALUES($1,1,now(),NULL)
 ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE login_attempts.failures+1 END,
 window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_start END,
 blocked_until=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN NULL WHEN login_attempts.failures+1>=8 THEN now()+interval '15 minutes' ELSE login_attempts.blocked_until END`,[key]);}
}
export async function clearLoginFailures(emailKey:string){await pool.query('DELETE FROM login_attempts WHERE key=$1',[emailKey]);}
