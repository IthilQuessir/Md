var Blocks=function(n){function l(){this.blockGrammar=new Block}return l.prototype.parse=function(n){var l=[],e=/([\s\S]+?)($|\n#|\n(?:\s*\n|$)+)/g,r=[],t=null,o=null,s=new Node("");for(null!==/^(\s*\n)/.exec(n)&&(e.lastIndex=m[0].length),t=e.exec(n);null!==t;)r.push(t[1]),t=e.exec(n);for(;r.length;)o=this.blockGrammar.parse(r.shift(),r),null!==o&&s.addChild(o);return s},l}();