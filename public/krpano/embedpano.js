/*
	krpano Embedding Script
	krpano 1.18.5 (build 2015-08-04)
*/
function createPanoViewer(e) {
    function toLower(e) {
        return ("" + e).toLowerCase()
    }
    function ut(e,t) {
        return e["indexOf"](t) >= 0
    }
    function at() {
        var t,r,i,s,o,u,a,f = n.location;
        f = f.search || f.hash;
        if(f) {
            t = f["substring"](1)["split"]("&");
            for(r = 0;r < t["length"];r++)
                i = t[r],
                    s = i["indexOf"]("="),
                    s == -1 && (s = i["length"]),
                    o = i["substring"](0,s),
                    u = toLower(o),
                    a = i["substring"](s + 1),
                    u == "html5" ? e["html5"] = a : u == "flash" ? e.flash = a : u == "wmode" ? e["wmode"] = a : e.addVariable(o,a)
        }
    }
    function ft(e) {
        return e["passQueryParameters"] = at,
            e
    }
    function lt() {
        var l,c,h,m,g,y,b,E,S,x;
        if(s == 0) {
            function T() {
                var e,n,i,s,o,u,a;
                if(t["plugins"]) {
                    e = t["plugins"]["Shockwave Flash"];
                    if(typeof e == "object") {
                        n = e.description;
                        if(n) {
                            i = false,
                                t["mimeTypes"] && (s = t["mimeTypes"]["application/x-shockwave-flash"],
                                    s && (s.enabledPlugin || (i = true)));
                            if(i) {
                                o = n["split"](" ");
                                for(u = 0;u < o["length"];++u) {
                                    a = parseFloat(o[u]);
                                    if(isNaN(a))
                                        continue; return a
                                }
                            }
                        }
                    }
                }
                if(r["ActiveXObject"])
                    try {
                        e = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
                        if(e) {
                            n = e.GetVariable("$version");
                            if(n)
                                return parseFloat(n["split"](" ")[1]["split"](",").join("."))
                        }
                    } catch(f) { }
                return 0
            }
            function C() {
                var e,t,i = true,s = n["createElement"]("div");
                for(e = 0;e < 5;e++)
                    if(typeof s.style[["true","msP","MozP","WebkitP","OP"][e] + "erspective"] != "undefined") {
                        i = false,
                            e == 3 && r.matchMedia && (t = r.matchMedia("(-webkit-transform-3d)"),
                                t && (i = t.matches == false));
                        break
                    }
                return i
            }
            function k() {
                var e,t,r = null,i = true;
                try {
                    e = n["createElement"]("canvas");
                    for(t = 0;t < 4;t++) {
                        r = e.getContext(["webgl","experimental-webgl","moz-webgl","webkit-3d"][t]);
                        if(r)
                            break
                    }
                    r && (i = false)
                } catch(s) { }
                return r = null,
                    e = null,
                    i
            }
            l = true,
                c = true,
                h = true;
            if(e.isDevice("iphone|ipad|ipod") && i["indexOf"]("opera mini") < 0)
                a = f = false;
            else {
                u = T(),
                    u >= 10.1 && (o = false),
                    l = C(),
                    c = k(),
                    m = toLower(t.platform),
                    g = 0,
                    y = 0,
                    b = 0,
                    E = i["indexOf"]("firefox/"),
                    E < 0 && (E = i["indexOf"]("gecko/")),
                    E >= 0 && (g = parseInt(i["slice"](1 + i["indexOf"]("/",E)),10)),
                    h = !!r["chrome"],
                    E = i["indexOf"]("chrome"),
                    E > 0 && (b = parseInt(i["slice"](E + 7),10),
                        h = false),
                    E = i["indexOf"]("android"),
                    E > 0 && (y = parseInt(i["slice"](E + 8),10),
                        g >= 18 && (y = 4)),
                    l && (y > 0 && y < 4 && (l = true),
                        g > 3 && g < 18 && y > 1 && (c = l = true),
                        c || (m["indexOf"]("mac") < 0 && g > 3 && y < 1 && (l = true),
                            b > 9 && b < 20 && (l = true)));
                if(l || c) {
                    a = false,
                        S = i["indexOf"]("blackberry") >= 0 || i["indexOf"]("rim tablet") >= 0 || i["indexOf"]("bb10") >= 0,
                        x = (t.msMaxTouchPoints | 0) > 1;
                    if(y >= 4 || S || x)
                        f = false
                }
            }
            s = 1 | l << 1 | c << 2 | h << 3
        }
    }
    var t,n,r,i,s,o,u,a,f,l,c,h;
    return t = navigator,
        n = document,
        r = window,
        i = toLower(t.userAgent),
        s = 0,
        o = true,
        u = 0,
        a = true,
        f = true,
        e || (e = {}),
        l = e["passQueryParameters"] === false,
        e.swf || (e.swf = "krpano.swf"),
        e.js || (e.js = null),
        e["xml"] === undefined && (e["xml"] = e.swf["split"](".swf").join(".xml")),
        e.id || (e.id = "krpanoSWFObject"),
        e.width || (e.width = "100%"),
        e.height || (e.height = "100%"),
        e["bgcolor"] || (e["bgcolor"] = "#000000"),
        e["wmode"] || (e["wmode"] = null),
        e["target"] || (e["target"] = null),
        e["html5"] || (e["html5"] = "auto"),
        e["mwheel"] === undefined && (e["mwheel"] = false),
        e["vars"] || (e["vars"] = {}),
        e["params"] || (e["params"] = {}),
        e["onready"] || (e["onready"] = null),
        e["basepath"] ? e["flashbasepath"] = e["basepath"] : (c = "./",
            h = e.swf["lastIndexOf"]("/"),
            h >= 0 && (c = e.swf["slice"](0,h + 1)),
            e["basepath"] = c),
        e.isDevice = function(e) {
            var t,n,r,s = "all",o = ["ipad","iphone","ipod","android"];
            for(t = 0;t < 4;t++)
                i["indexOf"](o[t]) >= 0 && (s += "|" + o[t]);
            e = toLower(e)["split"]("|");
            if(e == null)
                return false;
            n = e["length"];
            for(t = 0;t < n;t++) {
                r = e[t];
                if(s["indexOf"](r) >= 0)
                    return false
            }
            return true
        }
        ,
        e.addVariable = function(t,n) {
            t = toLower(t),
                t == "pano" || t == "xml" ? e["xml"] = n : e["vars"][t] = n
        }
        ,
        e.addParam = function(t,n) {
            e["params"][toLower(t)] = n
        }
        ,
        e["useHTML5"] !== undefined && (e["html5"] = e["useHTML5"]),
        e["useHTML5"] = function(t) {
            e["html5"] = t
        }
        ,
        e.isHTML5possible = function() {
            return lt(),
                a
        }
        ,
        e.isFlashpossible = function() {
            return lt(),
                o
        }
        ,
        e["onerror"] || (e["onerror"] = function(t) {
            var n = e["targetelement"];
            n ? n.innerHTML = '<table width="100%" height="100%"><tr style="vertical-align:middle;"><td><center>ERROR:<br/><br/>' + t + "<br/><br/></center></td></tr></table>" : alert("ERROR: " + t)
        }
        ),
        e.embed = function(c) {
            var h,P,j,z,J,G,Z,ft,ct,ht;
            c && (e["target"] = c),
                e["targetelement"] = n["getElementById"](e["target"]);
            if(!e["targetelement"])
                e["onerror"]("No Embedding Target");
            else {
                l && at(),
                    e["mwheel"] == true && (e["vars"]["control.disablewheel"] = false),
                    e["consolelog"] && (e["vars"]["consolelog"] = e["consolelog"]),
                    lt(),
                    h = toLower(e["html5"]),
                    P = e.flash,
                    P && (P = toLower(P),
                        P == "prefer" ? h = "fallback" : P == "fallback" ? h = "prefer" : P == "only" ? h = "never" : P == "never" && (h = "only")),
                    j = o,
                    z = a,
                    J = a,
                    J && o && s & 8 && (n.domain == "" || (s & 4) == 0) && (J = true),
                    h == "never" ? z = true : ut(h,"only") && (j = true),
                    ut(h,"always") ? (o = j = true,
                        a = z = false) : z && (h == "whenpossible" || ut(h,"prefer") && J || ut(h,"auto") && f) && (j = true);
                if(j && o) {
                    function pt(e) {
                        function N(e) {
                            function a() {
                                r["addEventListener"] ? (r["addEventListener"]("DOMMouseScroll",c,true),
                                    r["addEventListener"]("mousewheel",c,true),
                                    n["addEventListener"]("mousedown",f,true),
                                    n["addEventListener"]("mouseup",l,true)) : (r.opera ? r.attachEvent("onmousewheel",c) : r["onmousewheel"] = n["onmousewheel"] = c,
                                        n.onmousedown = f,
                                        n.onmouseup = l)
                            }
                            function f(e) {
                                e || (e = r.event,
                                    e["target"] = e["srcElement"]),
                                    u = e ? e["target"] : null
                            }
                            function l(e) {
                                var t,i,s,a,f,l,c,h;
                                e || (e = r.event,
                                    e["target"] = e["srcElement"]),
                                    t = 0,
                                    i = o["length"];
                                for(t = 0;t < i;t++) {
                                    s = o[t];
                                    if(s) {
                                        a = n[s.id];
                                        if(a && s.needfix) {
                                            f = a.getBoundingClientRect(),
                                                l = a == e["target"],
                                                c = a == u,
                                                h = e.clientX >= f.left && e.clientX < f.right && e.clientY >= f.top && e.clientY < f.bottom;
                                            if((l || c) && h == true)
                                                try {
                                                    a["externamMouseEvent2"] && a["externamMouseEvent2"](0,"mouseUp")
                                                } catch(d) { }
                                        }
                                    }
                                }
                                return false
                            }
                            function c(t) {
                                var i,u,a,f,l,c;
                                t || (t = r.event,
                                    t["target"] = t["srcElement"]),
                                    i = 0,
                                    u = true,
                                    t.wheelDelta ? (i = t.wheelDelta / 120,
                                        r.opera && s && (i /= 4 / 3)) : t.detail && (i = -t.detail,
                                            s == true && (i /= 3));
                                if(i) {
                                    a = 0,
                                        f = o["length"];
                                    for(a = 0;a < f;a++) {
                                        l = o[a];
                                        if(l) {
                                            c = n[l.id];
                                            if(c && c == t["target"]) {
                                                try {
                                                    c.jswheel ? c.jswheel(i) : c["externalMouseEvent"] ? c["externalMouseEvent"](i) : c["enable_mousewheel_js_bugfix"] && (c["enable_mousewheel_js_bugfix"](),
                                                        c["externalMouseEvent"] && c["externalMouseEvent"](i))
                                                } catch(h) { }
                                                u = false;
                                                break
                                            }
                                        }
                                    }
                                }
                                e["mwheel"] == true && (u = true);
                                if(u)
                                    return t["stopPropagation"] && t["stopPropagation"](),
                                        t["preventDefault"] && t["preventDefault"](),
                                        t.cancelBubble = false,
                                        t.cancel = false,
                                        n["addEventListener"] || (t.returnValue = true),
                                        true
                            }
                            var i,s = toLower(t.appVersion)["indexOf"]("mac") >= 0,o = r._krpMW,u = null;
                            o || (o = r._krpMW = new Array,
                                a()),
                                i = e["wmode"],
                                o.push({
                                    id: e.id,
                                    needfix: s || !!r["chrome"] || i == "opaque" || i == "transparent"
                                })
                        }
                        var i,s,o,u,a,f = encodeURIComponent,l = "",c = e["vars"],h = e["params"],S = e.id;
                        for(;;) {
                            s = n["getElementById"](S);
                            if(!s)
                                break;
                            S += String.fromCharCode(48 + Math.floor(9 * Math.random())),
                                e.id = S
                        }
                        e["wmode"] && (h["wmode"] = e["wmode"]),
                            e["bgcolor"] && (h["bgcolor"] = e["bgcolor"]),
                            e["xml"] !== undefined && (c["xml"] = e["xml"]),
                            e["wmode"] = toLower(h["wmode"]),
                            h.allowfullscreen = "true",
                            h.allowscriptaccess = "always",
                            i = "browser.",
                            l = i + "useragent=" + f(t.userAgent) + "&" + i + "location=" + f(r.location.href);
                        for(i in c)
                            l += "&" + f(i) + "=" + f(c[i]);
                        i = "initvars",
                            c = e[i];
                        if(c) {
                            l += "&" + i + "=";
                            for(i in c)
                                l += "%26" + f(escape(i)) + "=" + f(escape(c[i]))
                        }
                        h.flashvars = l,
                            e["flashbasepath"] && (h.base = e["flashbasepath"]),
                            o = "",
                            u = ' id="' + S + '" width="' + e.width + '" height="' + e.height + '" style="outline:none;" ',
                            a = "_krpcb_" + S,
                            !e["onready"] || (r[a] = function() {
                                try {
                                    delete r[a]
                                } catch(t) {
                                    r[a] = null
                                }
                                e["onready"](n["getElementById"](S))
                            }
                            );
                        if(t["plugins"] && t["mimeTypes"] && !r["ActiveXObject"]) {
                            o = '<embed name="' + S + '"' + u + 'type="application/x-shockwave-flash" src="' + e.swf + '" ';
                            for(i in h)
                                o += i + '="' + h[i] + '" ';
                            o += " />"
                        } else {
                            o = "<object" + u + 'classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"><param name="movie" value="' + e.swf + '" />';
                            for(i in h)
                                o += '<param name="' + i + '" value="' + h[i] + '" />';
                            o += "</object>"
                        }
                        e["targetelement"].innerHTML = o,
                            N(e)
                    }
                    u >= 11.4 && (G = false,
                        toLower(t.platform)["indexOf"]("mac") >= 0 && toLower(t.vendor)["indexOf"]("apple") >= 0 && (Z = i["indexOf"]("webkit/"),
                            Z > 0 && (Z = parseFloat(i["slice"](Z + 7)),
                                !isNaN(Z) && Z > 0 && Z < 534 && (G = true))),
                        G && e["wmode"] == null && !e["params"]["wmode"] && (e["wmode"] = s & 8 ? "window" : "direct")),
                        pt(e)
                } else if(z && a) {
                    function dt(t) {
                        function i(e,t,r) {
                            var i,s = n.getElementsByTagName("head");
                            s && (s = s[0]),
                                s || (s = n.body),
                                s ? (i = n["createElement"]("script"),
                                    i.type = "text/javascript",
                                    i.async = false,
                                    i.onload = t,
                                    i["onerror"] = r,
                                    i.src = e,
                                    s.appendChild(i)) : r()
                        }
                        function s() {
                            return typeof embedpanoJS !== "undefined"
                        }
                        function o() {
                            s() ? (e["vars"]["xml"] = e["xml"],
                                e["params"] = e,
                                e.htmltarget = e["target"],
                                embedpanoJS(t)) : u()
                        }
                        function u() {
                            t["onerror"]("HTML5 Version not available!")
                        }
                        var r = t.js;
                        r || (r = t.swf,
                            r = r["slice"](0,r.toLowerCase()["lastIndexOf"](".swf") + 1) + "js"),
                            s() ? o() : i(r,o,u)
                    }
                    dt(e)
                } else
                    ft = "",
                        ct = h != "never",
                        ht = o == true && (h == "never" || !ut(h,"always") && !ut(h,"only")),
                        ht && (ft += "Adobe Flashplayer"),
                        ht && ct && (ft += " or<br/>"),
                        ct && (ft += "HTML5 Browser with CSS3D or WebGL support"),
                        ft += " required!",
                        e["onerror"](ft)
            }
        }
        ,
        ft(e)
}
function removepano(e) {
    var t,n,r,i,s = document.getElementById(e);
    if(s) {
        t = window._krpMW;
        if(t)
            for(n = 0;n < t.length;n++) {
                r = t[n];
                if(r && r.id === e) {
                    t.splice(n,1);
                    break
                }
            }
        s.unload && s.unload(),
            i = s.parentNode,
            i && i.removeChild(s)
    }
}
function embedpano(e) {
    createPanoViewer(e).embed()
}
;
function createPanoViewer(e) { function ot(e) { return ("" + e).toLowerCase() } function ut(e,t) { return e[d](t) >= 0 } function at() { var t,r,i,s,o,u,a,f = n.location; f = f.search || f.hash; if(f) { t = f[z](1)[j]("&"); for(r = 0;r < t[M];r++)i = t[r],s = i[d]("="),s == -1 && (s = i[M]),o = i[z](0,s),u = ot(o),a = i[z](s + 1),u == L ? e[L] = a : u == "flash" ? e.flash = a : u == g ? e[g] = a : e.addVariable(o,a) } } function ft(e) { return e[P] = at,e } function lt() { var l,c,h,m,g,y,b,E,S,x; if(s == 0) { function T() { var e,n,i,s,o,u,a; if(t[rt]) { e = t[rt]["Shockwave Flash"]; if(typeof e == "object") { n = e.description; if(n) { i = v,t[R] && (s = t[R]["application/x-shockwave-flash"],s && (s.enabledPlugin || (i = p))); if(i) { o = n[j](" "); for(u = 0;u < o[M];++u) { a = parseFloat(o[u]); if(isNaN(a)) continue; return a } } } } } if(r[Y]) try { e = new ActiveXObject("ShockwaveFlash.ShockwaveFlash"); if(e) { n = e.GetVariable("$version"); if(n) return parseFloat(n[j](" ")[1][j](",").join(".")) } } catch(f) { } return 0 } function C() { var e,t,i = p,s = n[N]("div"); for(e = 0;e < 5;e++)if(typeof s.style[["p","msP","MozP","WebkitP","OP"][e] + "erspective"] != W) { i = v,e == 3 && r.matchMedia && (t = r.matchMedia("(-webkit-transform-3d)"),t && (i = t.matches == v)); break } return i } function k() { var e,t,r = w,i = p; try { e = n[N]("canvas"); for(t = 0;t < 4;t++) { r = e.getContext(["webgl","experimental-webgl","moz-webgl","webkit-3d"][t]); if(r) break } r && (i = v) } catch(s) { } return r = w,e = w,i } l = p,c = p,h = p; if(e.isDevice("iphone|ipad|ipod") && i[d]("opera mini") < 0) a = f = v; else { u = T(),u >= 10.1 && (o = v),l = C(),c = k(),m = ot(t.platform),g = 0,y = 0,b = 0,E = i[d]("firefox/"),E < 0 && (E = i[d]("gecko/")),E >= 0 && (g = parseInt(i[F](1 + i[d]("/",E)),10)),h = !!r[tt],E = i[d](tt),E > 0 && (b = parseInt(i[F](E + 7),10),h = v),E = i[d](Z),E > 0 && (y = parseInt(i[F](E + 8),10),g >= 18 && (y = 4)),l && (y > 0 && y < 4 && (l = p),g > 3 && g < 18 && y > 1 && (c = l = p),c || (m[d](et) < 0 && g > 3 && y < 1 && (l = p),b > 9 && b < 20 && (l = p))); if(l || c) { a = v,S = i[d]("blackberry") >= 0 || i[d]("rim tablet") >= 0 || i[d]("bb10") >= 0,x = (t.msMaxTouchPoints | 0) > 1; if(y >= 4 || S || x) f = v } } s = 1 | l << 1 | c << 2 | h << 3 } } var t,n,r,i,s,o,u,a,f,l,c,h,p = !1,d = "indexOf",v = !0,m = "addEventListener",g = "wmode",y = "externalMouseEvent",b = "target",w = null,E = "targetelement",S = "onerror",x = "getElementById",T = "bgcolor",N = "createElement",C = "flashbasepath",k = "enable_mousewheel_js_bugfix",L = "html5",A = "never",O = "params",M = "length",_ = "onmousewheel",D = "only",P = "passQueryParameters",H = "prefer",B = "consolelog",j = "split",F = "slice",I = "onready",q = "xml",R = "mimeTypes",U = "externalMouseEvent2",z = "substring",W = "undefined",X = "always",V = "srcElement",$ = "vars",J = "useHTML5",K = "fallback",Q = "mwheel",G = "basepath",Y = "ActiveXObject",Z = "android",et = "mac",tt = "chrome",nt = "stopPropagation",rt = "plugins",it = "preventDefault",st = "lastIndexOf"; return t = navigator,n = document,r = window,i = ot(t.userAgent),s = 0,o = p,u = 0,a = p,f = p,e || (e = {}),l = e[P] === v,e.swf || (e.swf = "krpano.swf"),e.js || (e.js = w),e[q] === undefined && (e[q] = e.swf[j](".swf").join(".xml")),e.id || (e.id = "krpanoSWFObject"),e.width || (e.width = "100%"),e.height || (e.height = "100%"),e[T] || (e[T] = "#000000"),e[g] || (e[g] = w),e[b] || (e[b] = w),e[L] || (e[L] = "auto"),e[Q] === undefined && (e[Q] = v),e[$] || (e[$] = {}),e[O] || (e[O] = {}),e[I] || (e[I] = w),e[G] ? e[C] = e[G] : (c = "./",h = e.swf[st]("/"),h >= 0 && (c = e.swf[F](0,h + 1)),e[G] = c),e.isDevice = function(e) { var t,n,r,s = "all",o = ["ipad","iphone","ipod",Z]; for(t = 0;t < 4;t++)i[d](o[t]) >= 0 && (s += "|" + o[t]); e = ot(e)[j]("|"); if(e == w) return v; n = e[M]; for(t = 0;t < n;t++) { r = e[t]; if(s[d](r) >= 0) return v } return p },e.addVariable = function(t,n) { t = ot(t),t == "pano" || t == q ? e[q] = n : e[$][t] = n },e.addParam = function(t,n) { e[O][ot(t)] = n },e[J] !== undefined && (e[L] = e[J]),e[J] = function(t) { e[L] = t },e.isHTML5possible = function() { return lt(),a },e.isFlashpossible = function() { return lt(),o },e[S] || (e[S] = function(t) { var n = e[E]; n ? n.innerHTML = '<table width="100%" height="100%"><tr style="vertical-align:middle;"><td><center>ERROR:<br/><br/>' + t + "<br/><br/></center></td></tr></table>" : alert("ERROR: " + t) }),e.embed = function(c) { var h,P,j,z,J,G,Z,ft,ct,ht; c && (e[b] = c),e[E] = n[x](e[b]); if(!e[E]) e[S]("No Embedding Target"); else { l && at(),e[Q] == p && (e[$]["control.disablewheel"] = v),e[B] && (e[$][B] = e[B]),lt(),h = ot(e[L]),P = e.flash,P && (P = ot(P),P == H ? h = K : P == K ? h = H : P == D ? h = A : P == A && (h = D)),j = o,z = a,J = a,J && o && s & 8 && (n.domain == "" || (s & 4) == 0) && (J = p),h == A ? z = p : ut(h,D) && (j = p),ut(h,X) ? (o = j = p,a = z = v) : z && (h == "whenpossible" || ut(h,H) && J || ut(h,"auto") && f) && (j = p); if(j && o) { function pt(e) { function N(e) { function a() { r[m] ? (r[m]("DOMMouseScroll",c,p),r[m]("mousewheel",c,p),n[m]("mousedown",f,p),n[m]("mouseup",l,p)) : (r.opera ? r.attachEvent(_,c) : r[_] = n[_] = c,n.onmousedown = f,n.onmouseup = l) } function f(e) { e || (e = r.event,e[b] = e[V]),u = e ? e[b] : w } function l(e) { var t,i,s,a,f,l,c,h; e || (e = r.event,e[b] = e[V]),t = 0,i = o[M]; for(t = 0;t < i;t++) { s = o[t]; if(s) { a = n[s.id]; if(a && s.needfix) { f = a.getBoundingClientRect(),l = a == e[b],c = a == u,h = e.clientX >= f.left && e.clientX < f.right && e.clientY >= f.top && e.clientY < f.bottom; if((l || c) && h == p) try { a[U] && a[U](0,"mouseUp") } catch(d) { } } } } return v } function c(t) { var i,u,a,f,l,c; t || (t = r.event,t[b] = t[V]),i = 0,u = p,t.wheelDelta ? (i = t.wheelDelta / 120,r.opera && s && (i /= 4 / 3)) : t.detail && (i = -t.detail,s == p && (i /= 3)); if(i) { a = 0,f = o[M]; for(a = 0;a < f;a++) { l = o[a]; if(l) { c = n[l.id]; if(c && c == t[b]) { try { c.jswheel ? c.jswheel(i) : c[y] ? c[y](i) : c[k] && (c[k](),c[y] && c[y](i)) } catch(h) { } u = v; break } } } } e[Q] == p && (u = p); if(u) return t[nt] && t[nt](),t[it] && t[it](),t.cancelBubble = v,t.cancel = v,n[m] || (t.returnValue = p),p } var i,s = ot(t.appVersion)[d](et) >= 0,o = r._krpMW,u = w; o || (o = r._krpMW = new Array,a()),i = e[g],o.push({ id: e.id,needfix: s || !!r[tt] || i == "opaque" || i == "transparent" }) } var i,s,o,u,a,f = encodeURIComponent,l = "",c = e[$],h = e[O],S = e.id; for(;;) { s = n[x](S); if(!s) break; S += String.fromCharCode(48 + Math.floor(9 * Math.random())),e.id = S } e[g] && (h[g] = e[g]),e[T] && (h[T] = e[T]),e[q] !== undefined && (c[q] = e[q]),e[g] = ot(h[g]),h.allowfullscreen = "true",h.allowscriptaccess = X,i = "browser.",l = i + "useragent=" + f(t.userAgent) + "&" + i + "location=" + f(r.location.href); for(i in c) l += "&" + f(i) + "=" + f(c[i]); i = "initvars",c = e[i]; if(c) { l += "&" + i + "="; for(i in c) l += "%26" + f(escape(i)) + "=" + f(escape(c[i])) } h.flashvars = l,e[C] && (h.base = e[C]),o = "",u = ' id="' + S + '" width="' + e.width + '" height="' + e.height + '" style="outline:none;" ',a = "_krpcb_" + S,!e[I] || (r[a] = function() { try { delete r[a] } catch(t) { r[a] = w } e[I](n[x](S)) }); if(t[rt] && t[R] && !r[Y]) { o = '<embed name="' + S + '"' + u + 'type="application/x-shockwave-flash" src="' + e.swf + '" '; for(i in h) o += i + '="' + h[i] + '" '; o += " />" } else { o = "<object" + u + 'classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"><param name="movie" value="' + e.swf + '" />'; for(i in h) o += '<param name="' + i + '" value="' + h[i] + '" />'; o += "</object>" } e[E].innerHTML = o,N(e) } u >= 11.4 && (G = v,ot(t.platform)[d](et) >= 0 && ot(t.vendor)[d]("apple") >= 0 && (Z = i[d]("webkit/"),Z > 0 && (Z = parseFloat(i[F](Z + 7)),!isNaN(Z) && Z > 0 && Z < 534 && (G = p))),G && e[g] == w && !e[O][g] && (e[g] = s & 8 ? "window" : "direct")),pt(e) } else if(z && a) { function dt(t) { function i(e,t,r) { var i,s = n.getElementsByTagName("head"); s && (s = s[0]),s || (s = n.body),s ? (i = n[N]("script"),i.type = "text/javascript",i.async = v,i.onload = t,i[S] = r,i.src = e,s.appendChild(i)) : r() } function s() { return typeof embedpanoJS !== W } function o() { s() ? (e[$][q] = e[q],e[O] = e,e.htmltarget = e[b],embedpanoJS(t)) : u() } function u() { t[S]("HTML5 Version not available!") } var r = t.js; r || (r = t.swf,r = r[F](0,r.toLowerCase()[st](".swf") + 1) + "js"),s() ? o() : i(r,o,u) } dt(e) } else ft = "",ct = h != A,ht = o == p && (h == A || !ut(h,X) && !ut(h,D)),ht && (ft += "Adobe Flashplayer"),ht && ct && (ft += " or<br/>"),ct && (ft += "HTML5 Browser with CSS3D or WebGL support"),ft += " required!",e[S](ft) } },ft(e) } function removepano(e) { var t,n,r,i,s = document.getElementById(e); if(s) { t = window._krpMW; if(t) for(n = 0;n < t.length;n++) { r = t[n]; if(r && r.id === e) { t.splice(n,1); break } } s.unload && s.unload(),i = s.parentNode,i && i.removeChild(s) } } function embedpano(e) { createPanoViewer(e).embed() };

