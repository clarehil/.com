
/* Clarehil static-site interaction repair layer */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  ready(function(){
    // Repair missing/incorrect exported WordPress links.
    var links=document.querySelectorAll('a[href]');
    links.forEach(function(a){
      var h=a.getAttribute('href'); if(!h) return;
      var map={
        'index.html@p=1970.html':'about.html',
        'index.html@p=1971.html':'our.team.html',
        'index.html@p=1663.html':'index.html@p=1038.html',
        'index.html@p=2229.html':'index.html',
        'index.html@p=1939.html':'index.html',
        'index.html@p=1941.html':'index.html',
        'index.html@p=1972.html':'index.html',
        'index.html@p=5390.html':'index.html'
      };
      Object.keys(map).forEach(function(key){
        if(h===key || h.indexOf(key+'#')===0) a.setAttribute('href',map[key]+(h.indexOf('#')>-1?h.slice(h.indexOf('#')):''));
      });
      // Broken "../index.html" from nested exported pages should point to the root home page.
      if(h==='..' || h==='../index.html') a.setAttribute('href','../index.html');
    });

    // Mobile/offcanvas menu: preserve the original Blocksy drawer behavior.
    // This handler takes control of the menu trigger so the exported static pages
    // do not depend on Blocksy's dynamic/lazy menu code. Nothing else is changed.
    var panel=document.querySelector('#offcanvas');
    var menuButtons=document.querySelectorAll('[data-toggle-panel="#offcanvas"],.ct-header-trigger');
    function openPanel(e){
      if(e){ e.preventDefault(); e.stopImmediatePropagation(); }
      if(!panel)return;
      panel.classList.add('active');
      panel.removeAttribute('inert');
      panel.setAttribute('aria-hidden','false');
      document.body.setAttribute('data-panel','in:right');
      document.body.classList.add('b2b-menu-open');
    }
    function closePanel(e){
      if(e){ e.preventDefault(); e.stopImmediatePropagation(); }
      if(!panel)return;
      panel.classList.remove('active');
      panel.setAttribute('inert','');
      panel.setAttribute('aria-hidden','true');
      if(document.body.getAttribute('data-panel')==='in:right') document.body.removeAttribute('data-panel');
      document.body.classList.remove('b2b-menu-open');
    }
    menuButtons.forEach(function(btn){
      btn.addEventListener('click',openPanel,true);
    });
    if(panel){
      panel.addEventListener('click',function(e){
        if(e.target===panel) closePanel(e);
      });
      panel.querySelectorAll('.ct-toggle-close').forEach(function(btn){
        btn.addEventListener('click',closePanel,true);
      });
    }
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closePanel(e);});

    // Mobile dropdowns.
    document.querySelectorAll('.ct-toggle-dropdown-mobile').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();
        var li=btn.closest('li'), sub=li&&li.querySelector(':scope > .sub-menu');
        if(!sub)return;
        var open=btn.getAttribute('aria-expanded')==='true';
        btn.setAttribute('aria-expanded',String(!open));
        sub.style.display=open?'none':'block';
      });
    });

    // Smooth local hash scrolling; prevent "#" from jumping to the top.
    document.querySelectorAll('a[href$="#"],a[href*="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var href=a.getAttribute('href')||'';
        if(href==='#' || href.endsWith('index.html#')){e.preventDefault();return;}
        var hash=href.indexOf('#');
        if(hash<0)return;
        var targetId=decodeURIComponent(href.slice(hash+1));
        if(!targetId)return;
        var target=document.getElementById(targetId);
        if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
      });
    });

    // Accessible image gallery/lightbox behavior for Elementor galleries.
    var imgs=document.querySelectorAll('.elementor-gallery-item img,.gallery-item img,.elementor-widget-gallery img');
    imgs.forEach(function(img){
      var link=img.closest('a');
      if(!link || link.dataset.b2bBound) return;
      link.dataset.b2bBound='1';
      link.addEventListener('click',function(e){
        var src=link.getAttribute('href')||img.currentSrc||img.src;
        if(!src || src==='#')return;
        if(/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(src)){
          e.preventDefault(); openLightbox(src,img.alt||'Image');
        }
      });
    });
    function openLightbox(src,alt){
      var old=document.querySelector('.b2b-lightbox'); if(old)old.remove();
      var box=document.createElement('div'); box.className='b2b-lightbox';
      box.innerHTML='<button type="button" aria-label="Close image">×</button><img alt=""><span>Tap outside or press Escape to close</span>';
      box.querySelector('img').src=src; box.querySelector('img').alt=alt;
      document.body.appendChild(box);
      box.addEventListener('click',function(e){if(e.target===box||e.target.tagName==='BUTTON')box.remove();});
      document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){box.remove();document.removeEventListener('keydown',esc);}});
    }

    // Repair Elementor statistic counters independently of Elementor's jQuery counter script.
    // This only targets the existing .elementor-counter-number elements.
    (function repairCounters(){
      var counters=document.querySelectorAll('.elementor-counter-number[data-to-value]');
      if(!counters.length)return;
      var started=new WeakSet();
      function formatNumber(value, delimiter){
        var n=Math.round(value).toString();
        if(delimiter && delimiter !== 'none'){
          var parts=n.split(''), out=[], count=0;
          for(var i=parts.length-1;i>=0;i--){
            out.unshift(parts[i]);
            count++;
            if(count===3 && i>0){out.unshift(delimiter);count=0;}
          }
          n=out.join('');
        }
        return n;
      }
      function animateCounter(el){
        if(started.has(el))return;
        started.add(el);
        var from=parseFloat(el.getAttribute('data-from-value')||'0');
        var to=parseFloat(el.getAttribute('data-to-value')||'0');
        var duration=parseInt(el.getAttribute('data-duration')||'2000',10);
        if(!isFinite(from))from=0;
        if(!isFinite(to))to=0;
        if(!isFinite(duration)||duration<0)duration=2000;
        var delimiter=el.getAttribute('data-delimiter')||',';
        var start=null;
        el.textContent=formatNumber(from,delimiter);
        function step(now){
          if(start===null)start=now;
          var progress=duration===0?1:Math.min((now-start)/duration,1);
          // Smooth ease-out, matching the feel of the original counter.
          var eased=1-Math.pow(1-progress,3);
          el.textContent=formatNumber(from+(to-from)*eased,delimiter);
          if(progress<1)window.requestAnimationFrame(step);
          else el.textContent=formatNumber(to,delimiter);
        }
        window.requestAnimationFrame(step);
      }
      if('IntersectionObserver' in window){
        var observer=new IntersectionObserver(function(entries){
          entries.forEach(function(entry){if(entry.isIntersecting)animateCounter(entry.target);});
        },{threshold:0.15});
        counters.forEach(function(el){observer.observe(el);});
      }else{
        counters.forEach(animateCounter);
      }
    })();

    // Static-export forms: validate locally and provide a dependable email fallback.
    document.querySelectorAll('form.wpforms-form').forEach(function(form){
      if(form.dataset.b2bFormBound)return;
      form.dataset.b2bFormBound='1';
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var required=form.querySelectorAll('[required]');
        var invalid=false;
        required.forEach(function(field){if(!String(field.value||'').trim()){field.setAttribute('aria-invalid','true');invalid=true;}else field.removeAttribute('aria-invalid');});
        if(invalid){showMsg(form,'Please complete the required fields before submitting.','error');return;}
        var vals=[];
        form.querySelectorAll('input:not([type="hidden"]),textarea,select').forEach(function(f){
          if(f.value && f.name) vals.push((f.getAttribute('aria-label')||f.name)+': '+f.value);
        });
        var subject=encodeURIComponent('Website enquiry - Clarehil Foundation');
        var body=encodeURIComponent(vals.join('\\n'));
        showMsg(form,'Thank you. Your message is ready to be sent. Your email app will open now.','success');
        window.setTimeout(function(){window.location.href='mailto:clarehilstyles@gmail.com?subject='+subject+'&body='+body;},350);
      });
    });
    function showMsg(form,text,type){
      var old=form.querySelector('.b2b-form-success,.b2b-form-error');if(old)old.remove();
      var d=document.createElement('div');d.className=type==='error'?'b2b-form-error':'b2b-form-success';d.textContent=text;
      form.appendChild(d);
    }
  });
})();
