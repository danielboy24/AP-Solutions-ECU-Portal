import {NextRequest,NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {pool} from '../../../../lib/db';
import {sameOrigin,signIn} from '../../../../lib/auth';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return new NextResponse('Forbidden',{status:403});
 const size=Number(req.headers.get('content-length')||0);
 if(size>8192)return new NextResponse('Request too large',{status:413});
 const f=await req.formData();
 const name=String(f.get('name')||'').trim(),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||''),confirm=String(f.get('confirm')||'');
 if(name.length<2||name.length>120||email.length>255||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>128||password!==confirm)return NextResponse.redirect(new URL('/register?error=invalid',req.headers.get('origin')!),303);
 try{
  const hash=await bcrypt.hash(password,12);
  const result=await pool.query("INSERT INTO users(name,email,password_hash,role,credits,active) VALUES($1,$2,$3,'dealer',0,true) ON CONFLICT(email) DO NOTHING RETURNING id,email,name,role,credits",[name,email,hash]);
  if(!result.rows[0])return NextResponse.redirect(new URL('/register?error=exists',req.headers.get('origin')!),303);
  // Claim paid Shopify orders that arrived before this dealer account existed.
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const pending=await client.query('SELECT shop_domain,order_id,credits FROM shopify_credit_pending WHERE email=$1 ORDER BY created_at FOR UPDATE',[email]);
   for(const p of pending.rows){
    const inserted=await client.query('INSERT INTO shopify_credit_grants(shop_domain,order_id,user_id,credits) VALUES($1,$2,$3,$4) ON CONFLICT(shop_domain,order_id) DO NOTHING RETURNING credits',[p.shop_domain,p.order_id,result.rows[0].id,p.credits]);
    if(inserted.rowCount){
     await client.query('UPDATE users SET credits=credits+$1 WHERE id=$2',[p.credits,result.rows[0].id]);
     await client.query('INSERT INTO credit_ledger(user_id,delta,reason) VALUES($1,$2,$3)',[result.rows[0].id,p.credits,'Shopify paid order '+p.order_id]);
    }
    await client.query('DELETE FROM shopify_credit_pending WHERE shop_domain=$1 AND order_id=$2',[p.shop_domain,p.order_id]);
   }
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');console.error('Pending Shopify credit claim failed',e)}
  finally{client.release()}
  await signIn(result.rows[0]);
  return NextResponse.redirect(new URL('/',req.headers.get('origin')!),303);
 }catch(e){console.error('Dealer registration failed',e);return NextResponse.redirect(new URL('/register?error=invalid',req.headers.get('origin')!),303)}
}
