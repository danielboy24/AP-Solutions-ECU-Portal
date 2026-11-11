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
  await signIn(result.rows[0]);
  return NextResponse.redirect(new URL('/',req.headers.get('origin')!),303);
 }catch(e){console.error('Dealer registration failed',e);return NextResponse.redirect(new URL('/register?error=invalid',req.headers.get('origin')!),303)}
}
