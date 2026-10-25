/* ClinPharmAI Hub – điều hướng sidebar, tìm kiếm, khung xem tài liệu.
   Không thu thập hay lưu dữ liệu bệnh nhân; localStorage chỉ giữ tùy chọn giao diện và id tài liệu đã xem. */
(function(){
  'use strict';

  var DATA_URL='data/pages.json';
  var UNITS={
    'mekong':{name:'Khoa Dược – BVPS MêKông',color:'#1f3a6e'},
    'phuong-chau':{name:'Khoa Dược – BV Phương Châu',color:'#0f5f63'}
  };
  var GROUP_ICON={book:'i-book',pill:'i-pill',scale:'i-scale',search:'i-search'};
  var CHIP=['c1','c2','c3','c4'];
  var RECENT_MAX=6;

  var $=function(id){return document.getElementById(id);};
  var root=document.documentElement;
  var mq=window.matchMedia('(max-width:899px)');
  var el={
    app:$('app'),nav:$('navGroups'),navEmpty:$('navEmpty'),navHome:$('navHome'),q:$('q'),
    home:$('home'),viewer:$('viewer'),frame:$('frame'),loading:$('loading'),
    crumbGroup:$('crumbGroup'),crumbTitle:$('crumbTitle'),menuBtn:$('menuBtn'),scrim:$('scrim'),
    prevBtn:$('prevBtn'),nextBtn:$('nextBtn'),reloadBtn:$('reloadBtn'),fullBtn:$('fullBtn'),openBtn:$('openBtn'),
    unitSel:$('unitSel'),themeBtn:$('themeBtn'),brandUnit:$('brandUnit'),dataVer:$('dataVer')
  };
  var state={data:null,groups:{},byId:{},order:[],current:null,collapsed:{}};

  // ---------- tiện ích ----------
  function store(key,val){
    try{
      if(val===undefined)return localStorage.getItem(key);
      if(val===null)localStorage.removeItem(key);else localStorage.setItem(key,val);
    }catch(e){}
    return null;
  }
  function readJSON(key,fallback){
    try{var v=JSON.parse(store(key));return v==null?fallback:v;}catch(e){return fallback;}
  }
  function norm(s){
    return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  }
  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
  function fileUrl(f){return f.split('/').map(encodeURIComponent).join('/');}
  function icon(id,cls){return '<svg class="ico'+(cls?' '+cls:'')+'"><use href="#'+id+'"/></svg>';}
  function fmtDate(iso){var p=String(iso).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:iso;}

  // Tô sáng đoạn khớp, so khớp không phân biệt dấu nhưng giữ nguyên chữ gốc
  function markMatch(text,q){
    if(!q)return esc(text);
    var chars=Array.from(text),flat='',map=[];
    chars.forEach(function(c,i){var n=norm(c);for(var k=0;k<n.length;k++){flat+=n[k];map.push(i);}});
    var at=flat.indexOf(q);
    if(at<0)return esc(text);
    var s=map[at],e=map[at+q.length-1]+1;
    return esc(chars.slice(0,s).join(''))+'<mark>'+esc(chars.slice(s,e).join(''))+'</mark>'+esc(chars.slice(e).join(''));
  }
  function haystack(r){
    return norm([r.title,r.short,r.org,r.year,(r.tags||[]).join(' '),r.file].join(' '));
  }

  // ---------- dữ liệu ----------
  function validate(d){
    if(!d||!Array.isArray(d.groups)||!Array.isArray(d.records)||!d.records.length)throw new Error('Danh mục thiếu groups/records');
    var seen={};
    d.records.forEach(function(r){
      if(!r.id||!r.file||!r.title||!r.group)throw new Error('Bản ghi thiếu trường bắt buộc: '+JSON.stringify(r));
      if(seen[r.id])throw new Error('Trùng id: '+r.id);
      seen[r.id]=1;
    });
    return d;
  }
  function index(d){
    state.data=d;
    d.groups.forEach(function(g,i){g.chip=CHIP[i%CHIP.length];g.items=[];state.groups[g.id]=g;});
    d.records.forEach(function(r){
      r._h=haystack(r);
      var g=state.groups[r.group];
      if(g)g.items.push(r);
      state.byId[r.id]=r;
    });
    d.groups.forEach(function(g){g.items.forEach(function(r){state.order.push(r);});});
  }

  // ---------- sidebar ----------
  function renderNav(){
    var q=norm(el.q.value.trim()),html='',total=0;
    state.data.groups.forEach(function(g){
      var items=q?g.items.filter(function(r){return r._h.indexOf(q)>=0;}):g.items;
      if(!items.length)return;
      total+=items.length;
      var open=q?true:!state.collapsed[g.id];
      html+='<div class="nav-group">'+
        '<button class="nav-group-btn" type="button" data-group="'+esc(g.id)+'" aria-expanded="'+open+'">'+
          icon('i-chev','chev')+'<span>'+esc(g.label)+'</span><span class="count">'+items.length+'</span></button>'+
        '<ul class="nav-list">'+items.map(function(r){
          return '<li><a class="nav-link" href="#/p/'+encodeURIComponent(r.id)+'" data-id="'+esc(r.id)+'" title="'+esc(r.title)+'">'+markMatch(r.short||r.title,q)+'</a></li>';
        }).join('')+'</ul></div>';
    });
    el.nav.innerHTML=html;
    el.navEmpty.hidden=total>0;
    markActive();
  }
  function markActive(){
    var id=state.current&&state.current.id;
    if(id)el.navHome.removeAttribute('aria-current');else el.navHome.setAttribute('aria-current','page');
    Array.prototype.forEach.call(el.nav.querySelectorAll('.nav-link'),function(a){
      if(a.getAttribute('data-id')===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  }
  function revealActive(){
    var a=el.nav.querySelector('.nav-link[aria-current="page"]');
    if(a&&a.scrollIntoView)a.scrollIntoView({block:'nearest'});
  }

  function isMobile(){return mq.matches;}
  function setDrawer(open){
    el.app.classList.toggle('side-open',open);
    el.menuBtn.setAttribute('aria-expanded',String(open));
    if(open)setTimeout(function(){el.q.focus();},60);
  }
  function setCollapsed(c){
    el.app.classList.toggle('side-collapsed',c);
    el.menuBtn.setAttribute('aria-expanded',String(!c));
    store('cpa-side',c?'collapsed':null);
  }
  function toggleSide(){
    if(isMobile())setDrawer(!el.app.classList.contains('side-open'));
    else setCollapsed(!el.app.classList.contains('side-collapsed'));
  }
  function syncMenuState(){
    el.menuBtn.setAttribute('aria-expanded',String(isMobile()?el.app.classList.contains('side-open'):!el.app.classList.contains('side-collapsed')));
    el.menuBtn.querySelector('use').setAttribute('href',isMobile()?'#i-menu':'#i-panel');
  }

  // ---------- trang chủ ----------
  function renderHome(){
    var d=state.data,recent=readJSON('cpa-recent',[]).map(function(id){return state.byId[id];}).filter(Boolean);
    function card(r){
      var g=state.groups[r.group];
      return '<a class="card" href="#/p/'+encodeURIComponent(r.id)+'">'+
        '<span class="card-title">'+esc(r.title)+'</span>'+
        '<span class="card-meta"><span class="chip '+g.chip+'">'+esc(g.label)+'</span>'+
        (r.org?'<span class="chip">'+esc(r.org)+'</span>':'')+
        (r.year?'<span class="chip">'+r.year+'</span>':'')+'</span></a>';
    }
    var html='<div class="hero"><h1 id="homeTitle">Thư viện dược lâm sàng</h1>'+
      '<p>'+d.records.length+' tài liệu chuyên môn: tóm tắt guideline, thông tin thuốc, so sánh dược lý và thẩm định bài báo. Chọn tài liệu ở thanh bên trái hoặc gõ <b>/</b> để tìm nhanh.</p></div>';
    html+='<div class="stats">'+d.groups.map(function(g){
      return '<a class="stat" href="#/" data-jump="sec-'+esc(g.id)+'"><span class="stat-ico '+g.chip+'">'+icon(GROUP_ICON[g.icon]||'i-book')+'</span>'+
        '<span><span class="stat-num">'+g.items.length+'</span><br><span class="stat-label">'+esc(g.label)+'</span></span></a>';
    }).join('')+'</div>';
    if(recent.length){
      html+='<h2 class="section-h">'+icon('i-clock')+'Xem gần đây</h2><div class="cards">'+recent.map(card).join('')+'</div>';
    }
    d.groups.forEach(function(g){
      if(!g.items.length)return;
      html+='<h2 class="section-h" id="sec-'+esc(g.id)+'">'+icon(GROUP_ICON[g.icon]||'i-book')+esc(g.label)+'</h2>'+
        '<div class="cards">'+g.items.map(card).join('')+'</div>';
    });
    html+='<div class="notice"><strong>Lưu ý sử dụng</strong>'+
      'Tài liệu tham khảo cho nhân viên y tế, không thay thế phán đoán lâm sàng; nội dung chuyên môn của từng tài liệu <span class="badge-unv">chưa kiểm chứng lại trong hub</span>, cần đối chiếu nguồn gốc trước khi áp dụng. '+
      'Ứng dụng không thu thập hay lưu dữ liệu người bệnh. Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP; đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.</div>';
    el.home.innerHTML=html;
  }
  function renderError(err){
    var fileProto=location.protocol==='file:';
    el.home.innerHTML='<div class="error-box"><h2>Không tải được danh mục tài liệu</h2>'+
      (fileProto?'<p>Trình duyệt chặn đọc <code>data/pages.json</code> khi mở trực tiếp tệp. Hãy mở qua máy chủ: GitHub Pages, máy chủ nội bộ, hoặc chạy <code>serve.ps1</code> rồi vào <code>http://localhost:8080</code>.</p>'
        :'<p>Kiểm tra kết nối hoặc tệp <code>data/pages.json</code>.</p>')+
      '<p style="color:var(--dim);font-size:12.5px">Chi tiết: '+esc(err&&err.message||err)+'</p></div>';
    el.dataVer.textContent='Lỗi tải danh mục';
  }

  // ---------- khung xem ----------
  // Ẩn lớp chờ khi tài liệu đã dựng xong DOM, không đợi thư viện CDN (sự kiện load có thể rất chậm)
  var loadTimer=null;
  function hideLoading(){clearInterval(loadTimer);loadTimer=null;el.loading.hidden=true;}
  function showLoading(url){
    clearInterval(loadTimer);
    el.loading.hidden=false;
    var started=Date.now(),want=new URL(url,location.href).href;
    loadTimer=setInterval(function(){
      var ready=false;
      try{var doc=el.frame.contentDocument;ready=doc&&doc.URL.split('#')[0]===want&&doc.readyState!=='loading'&&doc.body&&doc.body.childElementCount>0;}catch(e){ready=true;}
      if(ready||Date.now()-started>10000)hideLoading();
    },150);
  }

  // ---------- định tuyến ----------
  function showHome(){
    state.current=null;
    el.viewer.hidden=true;el.home.hidden=false;
    el.frame.removeAttribute('src');hideLoading();
    el.crumbGroup.textContent='ClinPharmAI Hub';el.crumbTitle.textContent='Trang chủ';
    [el.prevBtn,el.nextBtn,el.reloadBtn,el.fullBtn,el.openBtn].forEach(function(b){b.hidden=true;});
    document.title='ClinPharmAI Hub';
    renderHome();markActive();
  }
  function openDoc(r){
    var url=fileUrl(r.file);
    state.current=r;
    el.home.hidden=true;el.viewer.hidden=false;
    if(el.frame.getAttribute('src')!==url){showLoading(url);el.frame.setAttribute('src',url);}
    el.frame.title=r.title;
    el.crumbGroup.textContent=state.groups[r.group]?state.groups[r.group].label:'';
    el.crumbTitle.textContent=r.title;
    el.openBtn.href=url;
    var i=state.order.indexOf(r);
    el.prevBtn.hidden=i<=0;el.nextBtn.hidden=i>=state.order.length-1;
    el.reloadBtn.hidden=el.openBtn.hidden=false;
    el.fullBtn.hidden=!(el.viewer.requestFullscreen||el.viewer.webkitRequestFullscreen);
    document.title=(r.short||r.title)+' · ClinPharmAI Hub';
    var rec=readJSON('cpa-recent',[]).filter(function(id){return id!==r.id&&state.byId[id];});
    rec.unshift(r.id);store('cpa-recent',JSON.stringify(rec.slice(0,RECENT_MAX)));
    markActive();revealActive();
    if(isMobile())setDrawer(false);
  }
  function route(){
    if(!state.data)return;
    var m=/^#\/p\/(.+)$/.exec(location.hash),id=m?decodeURIComponent(m[1]):null;
    // id chưa có trong danh mục (có thể danh mục đang là bản cũ): hiện trang chủ nhưng giữ link
    // để lần tải lại sau khi service worker cập nhật vẫn mở đúng tài liệu
    if(id&&state.byId[id])openDoc(state.byId[id]);
    else showHome();
  }
  function go(r){if(r)location.hash='#/p/'+encodeURIComponent(r.id);}
  function step(d){
    if(!state.current)return;
    go(state.order[state.order.indexOf(state.current)+d]);
  }

  // ---------- giao diện ----------
  function setUnit(u){
    if(!UNITS[u])u='mekong'; // gồm cả mã cũ 'phuong-nam' đã lưu trước khi đổi tên
    root.setAttribute('data-unit',u);
    el.unitSel.value=u;el.brandUnit.textContent=UNITS[u].name;
    var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=UNITS[u].color;
  }
  function isDark(){
    var t=root.getAttribute('data-theme');
    return t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;
  }
  function toggleTheme(){
    var t=isDark()?'light':'dark';
    root.setAttribute('data-theme',t);store('cpa-theme',t);
  }

  // ---------- sự kiện ----------
  function bind(){
    el.menuBtn.addEventListener('click',toggleSide);
    el.scrim.addEventListener('click',function(){setDrawer(false);});
    el.q.addEventListener('input',renderNav);
    el.q.addEventListener('keydown',function(e){
      if(e.key==='Enter'){var a=el.nav.querySelector('.nav-link');if(a){e.preventDefault();location.hash=a.getAttribute('href');}}
      else if(e.key==='Escape'&&el.q.value){e.stopPropagation();el.q.value='';renderNav();}
    });
    el.nav.addEventListener('click',function(e){
      var b=e.target.closest('.nav-group-btn');
      if(!b||el.q.value.trim())return;
      var id=b.getAttribute('data-group'),open=b.getAttribute('aria-expanded')!=='true';
      b.setAttribute('aria-expanded',String(open));
      if(open)delete state.collapsed[id];else state.collapsed[id]=1;
      store('cpa-collapsed',JSON.stringify(state.collapsed));
    });
    // bấm lại đúng tài liệu đang mở trên điện thoại thì vẫn đóng ngăn kéo
    el.nav.addEventListener('click',function(e){
      var a=e.target.closest('.nav-link');
      if(a&&isMobile()&&state.current&&a.getAttribute('data-id')===state.current.id)setDrawer(false);
    });
    el.home.addEventListener('click',function(e){
      var a=e.target.closest('[data-jump]');
      if(!a)return;
      e.preventDefault();
      var t=$(a.getAttribute('data-jump'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});
    });
    el.frame.addEventListener('load',hideLoading);
    el.prevBtn.addEventListener('click',function(){step(-1);});
    el.nextBtn.addEventListener('click',function(){step(1);});
    el.reloadBtn.addEventListener('click',function(){
      try{el.frame.contentWindow.location.reload();}catch(err){var s=el.frame.getAttribute('src');el.frame.setAttribute('src','about:blank');el.frame.setAttribute('src',s);}
    });
    el.fullBtn.addEventListener('click',function(){
      var v=el.viewer;(v.requestFullscreen||v.webkitRequestFullscreen).call(v);
    });
    el.unitSel.addEventListener('change',function(){setUnit(el.unitSel.value);store('cpa-unit',el.unitSel.value);});
    el.themeBtn.addEventListener('click',toggleTheme);
    window.addEventListener('hashchange',route);
    document.addEventListener('keydown',function(e){
      var typing=/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName||''))||e.target.isContentEditable;
      if(e.key==='/'&&!typing){
        e.preventDefault();
        if(isMobile())setDrawer(true);else{if(el.app.classList.contains('side-collapsed'))setCollapsed(false);el.q.focus();}
      }else if(e.key==='Escape'&&isMobile()&&el.app.classList.contains('side-open')){setDrawer(false);el.menuBtn.focus();}
      else if((e.ctrlKey||e.metaKey)&&(e.key==='b'||e.key==='B')){e.preventDefault();toggleSide();}
    });
    var onMq=function(){el.app.classList.remove('side-open');syncMenuState();};
    if(mq.addEventListener)mq.addEventListener('change',onMq);else mq.addListener(onMq);
  }

  function registerSW(){
    if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
    window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
    // có bản service worker mới (đã có bản cũ điều khiển trang): tải lại một lần để dùng danh mục mới
    if(navigator.serviceWorker.controller){
      var reloaded=false;
      navigator.serviceWorker.addEventListener('controllerchange',function(){
        if(reloaded)return;
        reloaded=true;location.reload();
      });
    }
  }

  // ---------- khởi động ----------
  function init(){
    setUnit(store('cpa-unit')||root.getAttribute('data-unit'));
    state.collapsed=readJSON('cpa-collapsed',{})||{};
    if(store('cpa-side')==='collapsed'&&!isMobile())el.app.classList.add('side-collapsed');
    syncMenuState();
    bind();
    registerSW();
    fetch(DATA_URL,{cache:'no-cache'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(d){
        index(validate(d));
        el.dataVer.innerHTML='Danh mục v'+esc(d.version)+' · cập nhật '+esc(fmtDate(d.updated))+
          (d.status!=='verified'?' · <span class="badge-unv">chưa kiểm chứng</span>':'');
        renderNav();route();
      })
      .catch(renderError);
  }
  init();
})();
