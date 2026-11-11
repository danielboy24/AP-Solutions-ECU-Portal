import {NextRequest,NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {pool} from '../../../../lib/db';
export const runtime='nodejs';
type Line={variant_id?:number|string,quantity?:number,price?:string};
type PaidOrder={id?:number|string,email?:string,contact_email?:string,currency?:string,financial_status?:string,line_items?:Line[]};
const creditVariants:Record<string,number>={'64333115588938':1,'64333115654474':5,'64333115982154':10,'64333116014922':25};
export async function POST(req:NextRequest){
 const secret=process.env.SHOPIFY_WEBHOOK_SECRET;
 if(!secret)return new NextResponse('Webhook not configured',{status:503});
 const raw=Buffer.from(await req.arrayBuffer());
 if(raw.length>1024*1024)return new NextResponse('Payload too large',{status:413});
 const supplied=req.headers.get('x-shopify-hmac-sha256')||'';
 const expected=createHmac('sha256',secret).update(raw).digest();
 const signature=Buffer.from(supplied,'base64');
 if(signature.length!==expected.length||!timingSafeEqual(signature,expected))return new NextResponse('Invalid signature',{status:401});
 const topic=req.headers.get('x-shopify-topic')||'',shop=req.headers.get('x-shopify-shop-domain')||'',webhookId=req.headers.get('x-shopify-webhook-id')||'';
 if(shop!==process.env.SHOPIFY_SHOP_DOMAIN||topic!=='orders/paid'||!webhookId)return new NextResponse('Ignored',{status:200});
 let order:PaidOrder;
 try{order=JSON.parse(raw.toString('utf8')) as PaidOrder}catch{return new NextResponse('Invalid JSON',{status:400})}
 if(!order.id||order.currency!=='DKK'||order.financial_status!=='paid'||!Array.isArray(order.line_items))return new NextResponse('Invalid paid order',{status:422});
 const email=(order.email||order.contact_email||'').trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email))return new NextResponse('Missing customer email',{status:422});
 let credits=0;
 for(const line of order.line_items){
  const amount=creditVariants[String(line.variant_id||'')];
  if(!amount)continue;
  if(!Number.isSafeInteger(line.quantity)||line.quantity!<1||line.quantity!>1000)return new NextResponse('Invalid quantity',{status:422});
  if(!Number.isFinite(Number(line.price))||Math.abs(Number(line.price)-amount*500)>0.01)return new NextResponse('Unexpected credit price',{status:422});
  credits+=amount*line.quantity!;
 }
 if(!credits)return NextResponse.json({received:true,creditsAwarded:0});
 if(credits>25000)return new NextResponse('Credit limit exceeded',{status:422});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  // Serialize all events for the same order, even if Shopify retries with a different webhook ID.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[shop,String(order.id)]);
  const granted=await client.query('SELECT 1 FROM shopify_credit_grants WHERE shop_domain=$1 AND order_id=$2',[shop,String(order.id)]);
  if(granted.rowCount){await client.query('COMMIT');return NextResponse.json({received:true,alreadyProcessed:true})}
  const user=await client.query("SELECT id FROM users WHERE email=$1 AND role='dealer' AND active=true FOR UPDATE",[email]);
  if(!user.rowCount){
   await client.query('INSERT INTO shopify_credit_pending(shop_domain,order_id,email,credits) VALUES($1,$2,$3,$4) ON CONFLICT(shop_domain,order_id) DO NOTHING',[shop,String(order.id),email,credits]);
   await client.query('COMMIT');
   return NextResponse.json({received:true,pendingAccount:true});
  }
  const userId=user.rows[0].id;
  await client.query('INSERT INTO shopify_credit_grants(shop_domain,order_id,user_id,credits) VALUES($1,$2,$3,$4)',[shop,String(order.id),userId,credits]);
  await client.query('UPDATE users SET credits=credits+$1 WHERE id=$2',[credits,userId]);
  await client.query('INSERT INTO credit_ledger(user_id,delta,reason) VALUES($1,$2,$3)',[userId,credits,'Shopify paid order '+String(order.id)]);
  await client.query('DELETE FROM shopify_credit_pending WHERE shop_domain=$1 AND order_id=$2',[shop,String(order.id)]);
  await client.query('INSERT INTO shopify_events(webhook_id,shop_domain,topic,order_id) VALUES($1,$2,$3,$4) ON CONFLICT(webhook_id) DO NOTHING',[webhookId,shop,topic,String(order.id)]);
  await client.query('COMMIT');
  return NextResponse.json({received:true,creditsAwarded:credits});
 }catch(e){await client.query('ROLLBACK');console.error('Shopify credit processing error',e);return new NextResponse('Processing failed',{status:500})}
 finally{client.release()}
}
