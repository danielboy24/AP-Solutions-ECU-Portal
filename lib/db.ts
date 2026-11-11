import {Pool} from 'pg';
const g=globalThis as unknown as {apPool?:Pool};
export const pool=g.apPool??new Pool({connectionString:process.env.DATABASE_URL,max:8,ssl:process.env.PGSSL==='true'?{rejectUnauthorized:true}:undefined});
if(process.env.NODE_ENV!=='production')g.apPool=pool;
export type User={id:string,email:string,name:string,role:'admin'|'dealer',credits:number};
export type Order={id:string,user_id:string,email?:string,vehicle:string,ecu:string,service:string,notes:string,status:string,original_key:string,original_name:string,result_key:string|null,result_name:string|null,created_at:Date};
