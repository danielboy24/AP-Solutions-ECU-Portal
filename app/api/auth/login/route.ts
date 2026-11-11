import {NextRequest,NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {pool} from '../../../../lib/db';
import {signIn,sameOrigin} from '../../../../lib/auth';
import {loginKeys,loginBlocked,recordLoginFailure,clearLoginFailures} from '../../../../lib/login-security';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return new NextResponse('Forbidden',{status:403});
 const length=Number(req.headers.get('content-length')||0);
 if(length>8192)return new NextResponse('Request too large',{status:413});
 const f=await req.formData();
 const email=String(f.get('email')||'').trim().toLowerCase().slice(0,255);
 const pass=String(f.get('password')||'');
 if(pass.length>256)return new NextResponse('Invalid credentials',{status:400});
 const ip=(req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,100);
 const keys=loginKeys(email,ip);
 if(await loginBlocked(keys))return new NextResponse('For mange loginforsøg. Prøv igen om 15 minutter.',{status:429,headers:{'Retry-After':'900','Cache-Control':'no-store'}});
 const r=await pool.query('SELECT * FROM users WHERE email=$1 AND active=true',[email]);
 const u=r.rows[0];
 if(!u||!await bcrypt.compare(pass,u.password_hash)){
  await recordLoginFailure(keys);
  return NextResponse.redirect(new URL('/login?error=1',req.headers.get('origin')!),303);
 }
 await clearLoginFailures(keys[0]);
 await signIn(u);
 return NextResponse.redirect(new URL(u.role==='admin'?'/admin':'/',req.headers.get('origin')!),303);
}
