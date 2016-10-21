!function(t,e){"use strict";function n(t){for(var e=t.split("/"),n=0,i=e.length,r=o;n<i;n++){if(!(e[n]in r))throw new Error("[Md require] Cannot find module: "+t);r=r[e[n]]}return r}function i(t,e){for(var i=t.split("/"),r=0,s=i.length-1,l=o,u=null;r<s;r++)i[r]in l||(l[i[r]]={}),l=l[i[r]];if(i[r]in l)throw new Error("[Md extend] Module had existed;\nThe Url is "+t);if(u=e.call(l,n),!u)throw new Error('[Md extend] Unexpected return of the module "'+i[r]+'"');l[i[r]]=u}function r(t,e){var i,r=n("dialects"),o=null;if(e=e||{},e.dialect&&e.dialect in r)o=r[e.dialect];else for(i in r){o=r[i];break}if(!o)throw new Error("[Md] Plese use full_version or include dialect module\n请使用完整版或者 Md-seed.js + dialect模块配合使用。仅单独使用Md-seed.js是无法运行的");return t=t.replace(/^\s*\n/,"").replace(/\s*$/,""),o.parse(t).toHtml()}var o={};r.extend=i,t.Md=r}(this),Md.extend("attr",function(t){function e(){this.list={}}return e.prototype.add=function(t,e){this.list[t]=e},e.prototype.rm=function(t){delete this.list[t]},e.prototype.get=function(t){return this.list[t]||null},e.prototype.forEach=function(t){var e,n=this.list;for(e in n)n.hasOwnProperty(e)&&t.call(this,e,n[e])},e.prototype.clone=function(){},e}),Md.extend("dialect-builder",function(t){function e(){this.syntaxLib={}}function n(){this.list=[]}return e.prototype.parse=function(t){if("block"in this.syntaxLib)return this.syntaxLib.block.parse(t);throw new Error("[Dialect parse] Dialect must has extend block module")},e.prototype.extend=function(t,e){this.syntaxLib[t]=new e(this)},e.prototype.getSyntax=function(t){if(t in this.syntaxLib)return this.syntaxLib[t];throw new Error("[Dialect getSyntax] This dialect hasn't syntax named "+t)},n.prototype.setSyntax=function(t){return this.list.push.apply(this.list,t),this},n.prototype.build=function(){for(var n=0,i=this.list.length,r=null,o=new e;n<i;n++)r=t("syntax/"+this.list[n]),o.extend(this.list[n],r);return o},n}),Md.extend("node",function(t){function e(t){this.__tag__=t?t:"",this.__attr__=new n,this.children=[]}var n=t("attr");return e.prototype.attr=function(t,e){return"undefined"==typeof e?this.__attr__.get(t):this.__attr__.add(t,e)},e.prototype.rmAttr=function(t){return this.__attr__.rm(t),this},e.prototype.appendChild=function(t){return this.children.push(t),this},e.prototype.toHtml=function(){var t=null,e=this.children,n=-1,i=e.length;for(""===this.__tag__?t=document.createDocumentFragment():(t=document.createElement(this.__tag__),this.__attr__.forEach(function(e,n){t.setAttribute(e,n)}));++n<i;)t.appendChild(e[n].toHtml());return t},e}),Md.extend("text-node",function(t){function e(t){this.text=t}return e.prototype.toHtml=function(){return document.createTextNode(this.text)},e});