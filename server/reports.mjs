import { HttpError, integer, text } from './store.mjs';

const activeStatuses = new Set(['confirmed','shipped','fulfilled']);
const dayMs = 86400000;
// Collected totals are grouped by order placement date, using historical prices.
export function salesReport(db, days, now = Date.now()) {
  integer(days,'report period',1,365);
  if (![7,30,90,365].includes(days)) throw new HttpError(400,'Choose a 7, 30, 90, or 365 day report.');
  const today = Math.floor(now/dayMs)*dayMs,start=today-(days-1)*dayMs;
  const daily = Array.from({length:days},(_,index)=>({date:new Date(start+index*dayMs).toISOString().slice(0,10),orders:0,collectedCents:0}));
  const totals = { orders:0,activeOrders:0,collectedCents:0,outstandingCodCents:0,paidOrders:0,unitsSold:0,cancelledOrders:0,paymentReviewOrders:0 };
  const products = new Map();
  for(const row of db.prepare('SELECT created,status,payment_status,payment_method,total_cents,items FROM orders WHERE created>=? AND created<=? ORDER BY created').all(start,now)) {
    const bucket=daily[Math.floor((row.created-start)/dayMs)];
    totals.orders++;bucket.orders++;
    if(row.status==='cancelled')totals.cancelledOrders++;
    if(row.status==='payment_review')totals.paymentReviewOrders++;
    if(!activeStatuses.has(row.status))continue;
    totals.activeOrders++;
    if(row.payment_method==='cod' && row.payment_status==='due_on_delivery')totals.outstandingCodCents+=row.total_cents;
    if(row.payment_status!=='paid')continue;
    totals.paidOrders++;totals.collectedCents+=row.total_cents;bucket.collectedCents+=row.total_cents;
    for(const item of JSON.parse(row.items)) {
      totals.unitsSold+=item.quantity;
      const product=products.get(item.id) || {id:item.id,name:item.name,units:0,merchandiseCents:0};
      product.units+=item.quantity;product.merchandiseCents+=item.unitPriceCents*item.quantity;products.set(item.id,product);
    }
  }
  return {days,from:new Date(start).toISOString(),through:new Date(now).toISOString(),totals,daily,topProducts:[...products.values()].sort((a,b)=>b.merchandiseCents-a.merchandiseCents || a.id.localeCompare(b.id)).slice(0,5)};
}

export function orderFilter(url) {
  const q=text(url.searchParams.get('q') || ' ','search',0,120),status=url.searchParams.get('status') || '';
  if(status && !['confirmed','shipped','fulfilled','cancelled','awaiting_payment','payment_review'].includes(status))throw new HttpError(400,'Choose a valid order status.');
  return {where:"WHERE (reference LIKE ? OR customer LIKE ?) AND (?='' OR status=?)",parameters:[`%${q}%`,`%${q}%`,status,status]};
}
// Quote every cell and neutralize formulas, including ones preceded by spaces.
export const csvCell = (value) => {
  const string=String(value ?? '');
  return '"'+(/^[\t\r\n]|^\s*[=+\-@]/.test(string)?"'":'')+string.replaceAll('"','""')+'"';
};
export function ordersCsv(rows) {
  const headings=['Reference','Placed UTC','Status','Payment status','Payment method','Customer','Email','Address','Address 2','City','State','Postal code','Country','Units','Subtotal USD','Shipping USD','Tax USD','Total USD','Tracking'];
  return '\uFEFF'+[headings,...rows.map((row)=>{
    const c=JSON.parse(row.customer);
    return [row.reference,new Date(row.created).toISOString(),row.status,row.payment_status,row.payment_method,c.name,c.email,c.address1,c.address2,c.city,c.state,c.postalCode,c.country,JSON.parse(row.items).reduce((n,item)=>n+item.quantity,0),...[row.subtotal_cents,row.shipping_cents,row.tax_cents,row.total_cents].map((cents)=>(cents/100).toFixed(2)),row.tracking];
  })].map((row)=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
