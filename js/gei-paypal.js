/* GEI PAYPAL COMMERCE CLIENT
   Browser-safe bridge for server-verified PayPal purchases.
   No PayPal secret belongs in this file.
*/
(function(){
  'use strict';
  if(window.__GEI_PAYPAL__) return;
  window.__GEI_PAYPAL__=true;

  var API={
    config:'/api/paypal/config',
    create:'/api/paypal/create-order',
    capture:'/api/paypal/capture-order',
    entitlements:'/api/paypal/entitlements'
  };

  var PRODUCTS=[
    {id:'discovery',name:'GEI Discovery Pack',price:'10.00',description:'Starter premium GEI content.',entitlement:'gei.discovery'},
    {id:'builder',name:'GEI Builder Pack',price:'25.00',description:'Expanded GEI builder content.',entitlement:'gei.builder'},
    {id:'master-blueprint',name:'GEI Master Blueprint',price:'69.00',description:'Premium GEI blueprint access.',entitlement:'gei.master-blueprint'}
  ];

  function state(){
    try{var s=JSON.parse(localStorage.getItem('gei-academy-state-v1')||'{}');
      if(!s.economy||typeof s.economy!=='object') s.economy={};
      if(!Array.isArray(s.economy.entitlements)) s.economy.entitlements=[];
      return s;
    }catch(e){return {economy:{entitlements:[]}};}
  }
  function player(){return String(state().name||'').trim();}
  function saveEntitlements(list){var s=state();s.economy.entitlements=Array.isArray(list)?list:[];try{localStorage.setItem('gei-academy-state-v1',JSON.stringify(s));}catch(e){}return s.economy.entitlements;}
  function product(id){return PRODUCTS.find(function(p){return p.id===id;})||null;}
  function hasEntitlement(id){return state().economy.entitlements.some(function(e){return (e&&e.entitlement===id)||(e&&e.productId===id)||e===id;});}
  function request(url,opts){return fetch(url,Object.assign({credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json'}},opts||{})).then(function(r){return r.json().catch(function(){return{};}).then(function(body){if(!r.ok)throw new Error(body.error||('HTTP '+r.status));return body;});});}
  function config(){return request(API.config,{method:'GET',headers:{Accept:'application/json'}});}
  function sync(){var p=player();if(!p)return Promise.resolve(saveEntitlements([]));return request(API.entitlements+'?player='+encodeURIComponent(p),{method:'GET',headers:{Accept:'application/json'}}).then(function(d){return saveEntitlements(d.entitlements||[]);});}
  function createOrder(id){var p=product(id);if(!p)return Promise.reject(new Error('Unknown GEI product.'));if(!player())return Promise.reject(new Error('Please choose an explorer name first.'));return request(API.create,{method:'POST',body:JSON.stringify({productId:p.id,playerName:player()})}).then(function(d){if(!d.orderID)throw new Error('PayPal order was not created.');return d.orderID;});}
  function capture(orderId,id){var p=product(id);if(!p)return Promise.reject(new Error('Unknown GEI product.'));return request(API.capture,{method:'POST',body:JSON.stringify({orderID:orderId,productId:p.id,playerName:player()})}).then(function(d){if(!d.ok)throw new Error(d.error||'PayPal capture was not verified.');return sync().then(function(){return d;});});}
  window.GEI_PAYPAL={API:API,PRODUCTS:function(){return PRODUCTS.slice();},product:product,hasEntitlement:hasEntitlement,config:config,sync:sync,createOrder:createOrder,capture:capture,player:player};
})();
