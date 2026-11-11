import {NextRequest,NextResponse} from 'next/server';
import {getUser,sameOrigin} from '../../../../../lib/auth';
import {pool} from '../../../../../lib/db';
export async function POST(req:NextRequest){
 const admin=await getUser();
 if(!admin||admin.role!=='admin'||!sameOrigin(req))return new NextResponse('Forbidden',{status:403});
 const f=await req.formData();
 const id=String(f.get('dealer_id')||'');
 const confirmation=String(f.get('confirmation')||'');
 if(!/^[0-9a-f-]{36}$/i.test(id)||confirmation!=='SLET')return new NextResponse('Bekræft ved at skrive SLET',{status:400});
 const result=await pool.query("UPDATE users SET active=false WHERE id=$1 AND role='dealer' AND active=true RETURNING id",[id]);
 if(!result.rowCount)return new NextResponse('Kontoen findes ikke eller er allerede deaktiveret',{status:404});
 return NextResponse.redirect(new URL('/admin/dealers',req.headers.get('origin')!),303);
}
