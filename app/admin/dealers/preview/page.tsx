import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {getUser} from '../../../../lib/auth';
import {pool,Order} from '../../../../lib/db';
import {Shell,Status} from '../../../../lib/ui';
export const dynamic='force-dynamic';
export default async function DealerPreview({searchParams}:{searchParams:Promise<{id?:string}>}){
 const admin=await getUser();
 if(!admin)redirect('/login');
 if(admin.role!=='admin')redirect('/');
 const {id}=await searchParams;
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const dealer=await pool.query("SELECT id,name,email,credits FROM users WHERE id=$1 AND role='dealer'",[id]);
 if(!dealer.rows[0])notFound();
 const u=dealer.rows[0] as {id:string,name:string,email:string,credits:number};
 const r=await pool.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC',[u.id]);
 const orders=r.rows as Order[];
 return <Shell user={admin}><div className="panel" style={{borderColor:'#ed344a',marginBottom:24}}><p className="portal-eyebrow">ADMIN / SKRIVEBESKYTTET FORHANDLERVISNING</p><strong>Du ser nu, hvad {u.name} ({u.email}) ser på sit dashboard.</strong><p className="muted">Dette er kun en forhåndsvisning. Du er stadig logget ind som administrator og kan ikke uploade eller ændre noget på kundens vegne.</p><Link className="btn secondary" href="/admin/dealers">← Tilbage til forhandlere</Link></div><div className="top"><div><p className="portal-eyebrow">AP SOLUTIONS / FORHANDLERPORTAL</p><h1>Dit overblik</h1><p className="muted">Velkommen tilbage, {u.name}. Administrer dine ECU-filer og ordrer her.</p></div><span className="btn secondary" aria-disabled="true">+ Upload ECU-fil (kun visning)</span></div><div className="credit-strip"><div><small>Din tilgængelige creditsaldo</small><strong>{u.credits} credits</strong></div><span className="muted">Køb af credits via Shopify aktiveres snart</span></div><div className="cards"><div className="card"><div className="muted">Alle filanmodninger</div><div className="metric">{orders.length}</div></div><div className="card"><div className="muted">Under behandling</div><div className="metric">{orders.filter(x=>x.status!=='completed').length}</div></div><div className="card"><div className="muted">Afsluttede filer</div><div className="metric">{orders.filter(x=>x.status==='completed').length}</div></div></div><div className="panel"><h2>Mine ECU-filordrer</h2><table><thead><tr><th>Ordre</th><th>Bil</th><th>ECU</th><th>Service</th><th>Status</th><th>Fil</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>#{o.id.slice(0,8)}</td><td>{o.vehicle}</td><td>{o.ecu}</td><td>{o.service}</td><td><Status value={o.status}/></td><td>{o.status==='completed'?'Klar til hentning':'—'}</td></tr>)}</tbody></table>{!orders.length&&<p className="muted">Du har endnu ingen filordrer. Klik på “Upload ECU-fil” for at starte.</p>}</div></Shell>
}
