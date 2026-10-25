/* Service worker ClinPharmAI Hub.
   Tăng CACHE_VERSION mỗi khi đổi app shell hoặc tài liệu. */
var CACHE_VERSION='cpa-hub-v1.1.5';
var CDN_CACHE='cpa-cdn-v1';
var SHELL=['./','index.html','css/app.css','js/app.js','data/pages.json','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png'];
var CDN_HOSTS=['cdn.tailwindcss.com','cdn.jsdelivr.net','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];

function fileUrl(f){return f.split('/').map(encodeURIComponent).join('/');}
// Bỏ qua bộ nhớ đệm HTTP của trình duyệt (GitHub Pages cho giữ 10 phút), luôn hỏi lại máy chủ.
// Yêu cầu điều hướng không tạo lại được từ chính nó nên dựng mới theo URL.
function fresh(req){
  if(typeof req==='string')return new Request(req,{cache:'no-cache'});
  if(req.mode==='navigate')return new Request(req.url,{cache:'no-cache',credentials:'same-origin'});
  return new Request(req,{cache:'no-cache'});
}
function addFresh(c,url){
  return fetch(fresh(url)).then(function(res){
    if(!res.ok)throw new Error(url+' '+res.status);
    return c.put(url,res);
  });
}

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE_VERSION).then(function(c){
    return Promise.all(SHELL.map(function(u){return addFresh(c,u);})).then(function(){
      // tài liệu lấy từ danh mục; một tệp lỗi không làm hỏng cả lần cài
      return fetch(fresh('data/pages.json')).then(function(r){return r.json();}).then(function(d){
        return Promise.all(d.records.map(function(r){return addFresh(c,fileUrl(r.file)).catch(function(){});}));
      }).catch(function(){});
    });
  }).then(function(){return self.skipWaiting();}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE_VERSION&&k!==CDN_CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

function staleWhileRevalidate(req){
  return caches.open(CACHE_VERSION).then(function(c){
    return c.match(req).then(function(hit){
      var net=fetch(fresh(req)).then(function(res){if(res.ok)c.put(req,res.clone());return res;});
      return hit?(net.catch(function(){}),hit):net;
    });
  });
}
function networkFirst(req){
  return caches.open(CACHE_VERSION).then(function(c){
    return fetch(fresh(req)).then(function(res){
      if(res.ok)c.put(req,res.clone());
      return res;
    }).catch(function(){
      return c.match(req).then(function(hit){return hit||Response.error();});
    });
  });
}
function cacheFirst(req,name){
  return caches.open(name).then(function(c){
    return c.match(req,{ignoreSearch:false}).then(function(hit){
      return hit||fetch(req).then(function(res){
        if(res.ok||res.type==='opaque')c.put(req,res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin===self.location.origin){
    // danh mục: lấy mạng trước để tài liệu mới hiện ngay, mất mạng thì dùng cache
    if(url.pathname.indexOf('/data/')>=0){e.respondWith(networkFirst(req));return;}
    // còn lại: trả bản đã cache ngay, cập nhật nền: bản mới có hiệu lực ở lần mở sau
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if(CDN_HOSTS.indexOf(url.hostname)>=0)e.respondWith(cacheFirst(req,CDN_CACHE));
});
