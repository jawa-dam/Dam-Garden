const products=require('../../lib/paypal/products');
const paypal=require('../../lib/paypal/paypal-client');

//
// NOTE:
// This adapter is intentionally fail-closed and idempotent within a runtime.
// It is NOT a durable production entitlement database. Before Live money is
// enabled, replace these Maps with persistent storage keyed by PayPal event/order
// IDs and an authenticated account ID.
//
const memoryEntitlements=new Map();
const orders=new Map();
const processedWebhookEvents=new Map();

function send(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(body));
}

function name(v){return String(v||'').trim().slice(0,80);}
function product(id){return products[String(id||'')]||null;}

function grant(player,p,meta){
  const k=player.toLowerCase();
  const list=memoryEntitlements.get(k)||[];
  let e=list.find(x=>x.productId===p.id);
  if(!e){
    e={
      productId:p.id,
      entitlement:p.entitlement,
      grantedAt:new Date().toISOString(),
      ...(meta||{})
    };
    list.push(e);
  }else if(meta){
    Object.assign(e,meta);
  }
  memoryEntitlements.set(k,list);
  return e;
}

function encodePlayer(player){
  return Buffer.from(player,'utf8').toString('base64url');
}

function decodeCustomId(customId){
  const raw=String(customId||'');
  const i=raw.indexOf('|');
  if(i<1)return {productId:raw,playerName:''};
  const productId=raw.slice(0,i);
  try{
    return {
      productId,
      playerName:name(Buffer.from(raw.slice(i+1),'base64url').toString('utf8'))
    };
  }catch(_e){
    return {productId,playerName:''};
  }
}

function orderProduct(order){
  const u=order?.purchase_units?.[0];
  const decoded=decodeCustomId(u?.custom_id);
  return {unit:u,productId:decoded.productId,playerName:decoded.playerName};
}

async function createOrder(req,res){
  const p=product(req.body?.productId);
  const player=name(req.body?.playerName);
  if(!p)return send(res,400,{ok:false,error:'unknown-product'});
  if(!player)return send(res,400,{ok:false,error:'player-name-required'});

  try{
    const o=await paypal.createOrder(p,player);
    orders.set(o.id,{
      productId:p.id,
      playerName:player,
      status:o.status,
      createdAt:new Date().toISOString()
    });
    return send(res,200,{ok:true,orderID:o.id});
  }catch(e){
    console.error(e);
    return send(res,502,{ok:false,error:'paypal-create-failed'});
  }
}

async function captureOrder(req,res){
  const orderId=String(req.body?.orderID||'');
  const expected=String(req.body?.productId||'');
  const requestedPlayer=name(req.body?.playerName);
  const p=product(expected);

  if(!orderId||!p||!requestedPlayer)
    return send(res,400,{ok:false,error:'order-product-player-required'});

  try{
    const o=await paypal.getOrder(orderId);
    const parsed=orderProduct(o);

    if(
      parsed.productId!==p.id ||
      parsed.unit?.amount?.value!==p.price ||
      parsed.unit?.amount?.currency_code!==p.currency
    ){
      return send(res,409,{ok:false,error:'order-does-not-match-product'});
    }

    const prior=orders.get(orderId);
    const player=prior?.playerName||parsed.playerName||requestedPlayer;

    if(prior?.status==='COMPLETED'){
      const e=grant(player,p,{
        paypalOrderId:orderId,
        paypalCaptureId:prior.captureId
      });
      return send(res,200,{
        ok:true,
        status:'COMPLETED',
        idempotent:true,
        entitlement:e,
        entitlements:memoryEntitlements.get(player.toLowerCase())||[]
      });
    }

    const r=await paypal.captureOrder(orderId);
    const c=r?.purchase_units?.[0]?.payments?.captures?.[0];

    if(!c||c.status!=='COMPLETED')
      return send(res,402,{
        ok:false,
        error:'capture-not-completed',
        status:c?.status||r?.status
      });

    const e=grant(player,p,{
      paypalOrderId:orderId,
      paypalCaptureId:c.id
    });

    orders.set(orderId,{
      productId:p.id,
      playerName:player,
      status:'COMPLETED',
      captureId:c.id,
      completedAt:new Date().toISOString()
    });

    return send(res,200,{
      ok:true,
      status:'COMPLETED',
      idempotent:false,
      entitlement:e,
      entitlements:memoryEntitlements.get(player.toLowerCase())||[]
    });
  }catch(e){
    console.error(e);
    return send(res,502,{ok:false,error:'paypal-capture-failed'});
  }
}

function entitlements(req,res){
  const player=name(req.query?.player);
  if(!player)return send(res,400,{ok:false,error:'player-required'});
  return send(res,200,{
    ok:true,
    entitlements:memoryEntitlements.get(player.toLowerCase())||[]
  });
}

function health(_req,res){
  send(res,200,{
    ok:true,
    service:'GEI PayPal Commerce',
    version:process.env.GEI_PAYPAL_VERSION||'0.1.0',
    environment:process.env.PAYPAL_ENVIRONMENT==='live'?'live':'sandbox',
    checkoutReady:Boolean(process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET),
    webhookReady:Boolean(process.env.PAYPAL_WEBHOOK_ID)
  });
}

async function webhook(req,res){
  try{
    const verified=await paypal.verifyWebhook(req.headers,req.body);
    if(!verified)return send(res,400,{ok:false,error:'webhook-not-verified'});

    const event=req.body||{};
    const eventId=String(event.id||'');
    if(!eventId)return send(res,400,{ok:false,error:'webhook-event-id-required'});

    // PayPal may retry the same event. Never process the same event twice
    // during this runtime.
    if(processedWebhookEvents.has(eventId)){
      return send(res,200,{
        ok:true,
        received:true,
        duplicate:true,
        eventId
      });
    }

    if(event.event_type==='PAYMENT.CAPTURE.COMPLETED'){
      const resource=event.resource||{};
      const captureId=String(resource.id||'');
      const orderId=String(resource.supplementary_data?.related_ids?.order_id||'');

      if(!captureId||!orderId)
        return send(res,400,{ok:false,error:'webhook-capture-identifiers-required'});

      // Do not trust the webhook payload alone for entitlement details.
      // Re-fetch the PayPal order and validate the server catalog price/currency.
      const order=await paypal.getOrder(orderId);
      const parsed=orderProduct(order);
      const p=product(parsed.productId);

      if(
        !p ||
        parsed.unit?.amount?.value!==p.price ||
        parsed.unit?.amount?.currency_code!==p.currency
      ){
        return send(res,409,{ok:false,error:'webhook-product-validation-failed'});
      }

      if(String(parsed.unit?.payments?.captures?.[0]?.id||captureId)!==captureId){
        return send(res,409,{ok:false,error:'webhook-capture-validation-failed'});
      }

      const player=parsed.playerName;
      if(!player){
        // A verified payment without a bound player must not receive an
        // anonymous entitlement.
        return send(res,422,{
          ok:false,
          error:'webhook-player-binding-required',
          eventId,
          orderId,
          captureId
        });
      }

      const e=grant(player,p,{
        paypalOrderId:orderId,
        paypalCaptureId:captureId,
        paypalEventId:eventId
      });

      orders.set(orderId,{
        productId:p.id,
        playerName:player,
        status:'COMPLETED',
        captureId:captureId,
        webhookEventId:eventId,
        completedAt:new Date().toISOString()
      });

      processedWebhookEvents.set(eventId,{
        processedAt:new Date().toISOString(),
        orderId,
        captureId,
        playerName:player,
        entitlement:p.entitlement
      });

      return send(res,200,{
        ok:true,
        received:true,
        duplicate:false,
        eventId,
        entitlement:e
      });
    }

    // Mark verified non-purchase events as handled too, so retries are safe.
    processedWebhookEvents.set(eventId,{
      processedAt:new Date().toISOString(),
      eventType:event.event_type||''
    });

    return send(res,200,{ok:true,received:true,ignored:true,eventId});
  }catch(e){
    console.error(e);
    return send(res,400,{ok:false,error:'webhook-verification-failed'});
  }
}

module.exports={createOrder,captureOrder,entitlements,health,webhook};
