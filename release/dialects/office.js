Md.extend("syntax/block", function(require) {

    var Node = require("node");

    function Block() {
        this.lib = [];
    }

    // XXX 没有去重
    Block.prototype.extend = function(syntax) {
        this.lib.push(syntax);
    };

    Block.prototype.parse = function(str) {

        var queue = [str],
            stack = null,
            i,
            len = this.lib.length,
            rs = null,
            node = new Node();

        do {

            str = queue.pop();

            for (i = 0; i < len; i++) {

                stack = [];
                rs = this.lib[i].parse(str, stack);

                if (stack.length) {
                    stack.reverse();
                    queue.push.apply(queue, stack);
                }

                if (rs) {
                    node.appendChild(rs);
                    break;
                } else if (stack.length) {
                    str = queue.pop();
                }

            }

        } while (queue.length);


        return node;

    };

    Block.expend = function(grammar) {
        expendGrammars.push(grammar);
    };

    return Block;
});

Md.extend("syntax/inline", function(require) {

    var Node = require("node");

    function Inline() {
        this.lib = [];
    }

    Inline.prototype.extend = function(syntax) {
        // XXX 未去重
        this.lib.push(syntax);
    };

    Inline.prototype.parse = function(str) {

        var queue = [str],
            stack = null,
            i,
            len = this.lib.length,
            rs = null,
            node = new Node();

        do {

            str = queue.pop();

            for (i = 0; i < len; i++) {

                stack = [];
                rs = this.lib[i].parse(str, stack);

                if (stack.length) {
                    stack.reverse();
                    queue.push.apply(queue, stack);
                }

                if (rs) {
                    node.appendChild(rs);
                    break;
                } else if (stack.length) {
                    str = queue.pop();
                }
            }

        } while (queue.length);

        return node;
    };

    return Inline;
});

Md.extend("syntax/combin-block", function(require) {

    var Node = require("node");

    function CombinBlock(dialect) {

        this.block = dialect.getSyntax("block");
        this.block.extend(this);

    }

    CombinBlock.prototype.parse = function(str) {

        var pattern = /(?:^\s*\n)/m,
            queue = str.split(/(?:^\s*\n)/m),
            that = this;

        if (queue.length > 1) {

            return (function() {

                var node = new Node(),
                    i = 0,
                    len = queue.length;

                for (; i < len; i++) {
                    node.appendChild(that.block.parse(queue[i]));
                }

                return node;

            }());

        } else {
            return null;
        }

    };

    return CombinBlock;
});

Md.extend("syntax/blockquote", function(require) {

    var Node = require("node");

    function Blockquote(dialect) {

        this.block = dialect.getSyntax("block");
        this.block.extend(this);

    }

    Blockquote.prototype.parse = function(source, queue) {

        var reg = source.match(/^(?:>\s*.*[\n$])+/m),
            str = null;

        if (!reg) {
            return null;
        } else if (!!reg.index) {

            queue.push(source.substring(0, reg.index));
            queue.push(reg[0]);
            queue.push(source.substr(reg.index + reg[0].length));

            return null;

        } else if (reg[0].length < source.length) {
            queue.push(source.substr(reg[0].length));
        }

        str = reg[0].replace(/^>[ \f\r\t\v]*/mg, "");

        return new Node("blockquote")
            .appendChild(this.block.parse(str));

    };

    return Blockquote;

});

/**
 * 语法事例:
 * # 标题
 * #标题
 * ###### 标题
 */

Md.extend("syntax/atx-header", function (require) {

    var Node = require("node");

    var pattern = /^(#{1,6})\s*(.*?)\s*#*\s*(?:\n|$)/;

    function AtxHeader(dialect) {

        var block = dialect.getSyntax("block");
        block.extend(this);

        this.inline = dialect.getSyntax("inline");
    }

    AtxHeader.prototype.parse = function(str, queue) {

        if (!pattern.test(str)) {
            return null;
        }

        var reg = str.match(pattern);
        var header = new Node("h" + reg[1].length);

        header.appendChild(this.inline.parse(reg[2]));

        if (reg[0].length < str.length) {
            // 将没有解析的尾部放回队列
            queue.push(str.substr(reg[0].length));
        }

        return header;
    };

    return AtxHeader;
});

Md.extend("syntax/setext-header", function(require) {

    var Node = require("node");

    function SetextHeader(dialect) {
        block = dialect.getSyntax("block");
        block.extend(this);

        this.inline = dialect.getSyntax("inline");
    }

    SetextHeader.prototype.parse = function(str, queue) {

        var pattern = /^(.*)\n([-=])\2\2+(?:\n|$)/,
            reg = null,
            level = "",
            header = null,
            inline = null;

        if (!pattern.test(str)) {
            return null;
        }

        reg = str.match(pattern);

        level = (reg[2] === "=") ? "h1" : "h2";
        header = new Node(level);

        header.appendChild(this.inline.parse(reg[1]));

        // 字符串尾部还有其余内容，则将其放回队列头部
        if (reg[0].length < str.length) {
            queue.push(str.substr(reg[0].length));
        }

        return header;
    };

    return SetextHeader;
});

/**
 *  TODO  尚未对如下情况进行测试
 *
 *        以下是一个列表
 *        * 第一条
 *            * 子列表第一条
 *            * 子列表第二条
 *
 *        此时当list语法优先级高时，需要对列表结构进行提取
 */

Md.extend("syntax/list", function(require) {

    var Node = require("node");

    function List(dialect) {

        var block = dialect.getSyntax("block");
        block.extend(this);

        this.inline = dialect.getSyntax("inline");

    }

    List.prototype.parse = function(source, queue) {

        var node = null,
            reg = source.match(/^(?: *(?:[*+-]|\\d+\\.)[ \t]+.*(\n|$))+/),
            leave = 0,
            lines = null,
            i, len, str, rs;

        if (!reg) {
            return null;
        } else if (reg[0].length < source.length) {
            queue.push(source.substr(reg[0].length));
        }

        lines = reg[0].split("\n");
        if (lines[lines.length - 1] === "") {
            lines.pop();
        }

        mkList.call(this, lines, 0, 0, function (list) {
            rs = list;
        });

        return rs;
    };


    /**
     * space's depth > depth return 1
     * space's depth < depth return -1
     * space's depth = depth return 0
     */
    function calcDepth(space, depth) {

        return space.replace(/(?: {0,3}\\t| {4})/, "\t").length;

    }

    /**
     * 循环解析同层li，递归解决不同层的list
     * 通过判断起始的空白符来确定这一行内容属于那一个层次
     * 同层的作为li解析，下一层的递归生成新的子列表
     *
     * @param {Array} line 待解析的行
     * @param {Int} depth 层次，起始0
     */
    function mkList(lines, i, depth, cb) {

        var len = lines.length,
            list = new Node("ul");

        // reg[1] = 空白符  reg[2] 前缀  reg[3] 内容
        var pattern = /^(\s*)([*+-]|\\d+\\.)[ \t]+(.*)/,
            reg = null,
            node = null,
            lineDepth;

        function nextDepthCb(list, index) {
            node = new Node("li").appendChild(list);
            i = index;
        }

        for (; i < len; i++) {

            reg = lines[i].match(pattern);
            lineDepth = calcDepth(reg[1]);

            if (lineDepth > depth) {
                // 下一层列表的 li
                mkList.call(this, lines, i, depth + 1, nextDepthCb);

            } else if (lineDepth < depth) {
                // 上一层列表的li
                break;
            } else {
                // 当前列表的下一个li
                node = this.inline.parse(reg[3]);
                node = new Node("li").appendChild(node);
            }

            list.appendChild(node);

        }

        cb(list, i);

    }





    return List;

});

/**
 * XXX 尚未测试如下事例
 *         1.xxxxxxxxx
 *               codeing
 *               codeing
 *
 *         2.    codeing
 *           xxxxxxxxx
 *               codeing
 *               codeing
 */

Md.extend("syntax/code", function(require) {

    var Node = require("node");
    var TextNode = require("text-node");

    function Code(dialect) {
        var block = dialect.getSyntax("block");
        block.extend(this);
    }

    Code.prototype.parse = function(str, queue) {

        var linePattern = /^(?: {0,3}\t| {4})(.*)\n?/mg,
            typePattern = /\s*\[(.*?)\](?:\s*\[(.*?)\])?[ \t]*/,
            codes = [],
            line = null,
            type = {
                language: null,
                lineNum: 0
            },
            node = null,
            lastIndex = 0;

        if (!(/^(?: {0,3}\t| {4})(.*)/.test(str))) {
            return null;
        }

        for (line = linePattern.exec(str); !!line; line = linePattern.exec(str)) {
            codes.push(line[1]);
            lastIndex = linePattern.lastIndex;
        }

        if (lastIndex < str.length) {
            // 截取剩余部分
            queue.push(str.substr(lastIndex));
        }

        line = typePattern.exec(codes[0]);
        if (line) {

            codes.shift();

            if (line[1]) {
                type.language = line[1];
            }

            if (line[2]) {
                type.lineNum = line[2];
            }

        }

        node = new Node("pre").appendChild(
            new Node("code").appendChild(
                new TextNode(codes.join("\n"))
            )
        );

        return node;

    };

    return Code;

});

Md.extend("syntax/horiz-line", function(require) {

    var Node = require("node");

    var className = {
        dash: "dash",
        underline: "underline",
        asterisk: "asterisk"
    };

    function HorizLine(dialect) {
        var block = dialect.getSyntax("block");
        block.extend(this);
    }

    HorizLine.prototype.parse = function(str, queue) {

        var a = {s: str};

        var pattern = /^(?:([\s\S]*?)\n)?[ \t]*(([-_*])(?:[ \t]*\3){2,})[ \t]*(?:\n([\s\S]*))?$/,
            reg = str.match(pattern),
            node = null;

        if (!reg) {
            return null;
        }

        // 在hr之前又内容，将内容分割后重新放回流
        if (reg[1]) {
            queue.push(reg[1]);
            queue.push(reg[2]);
            if (reg[4]) {
                queue.push(reg[4]);
            }

            return null;
        }

        node = new Node("hr");

        switch (reg[3]) {
            case '-':
                node.attr("class", className.dash);
                break;
            case '_':
                node.attr("class", className.underline);
                break;
            case '*':
                node.attr("class", className.asteris);
                break;
                // No Default;
        }

        // hr之后有剩余内容
        if (reg[4]) {
            queue.push(reg[4]);
        }

        return node;
    };

    return HorizLine;
});

Md.extend("syntax/paragraph", function (require) {

    var Node = require("node");

    function Paragraph(dialect) {
        block = dialect.getSyntax("block");
        block.extend(this);

        this.inline = dialect.getSyntax("inline");
    }

    // FIXME 最后一个\n符号可能被写入到内容中
    Paragraph.prototype.parse = function(str) {

        var node = new Node("p");

        node.appendChild(this.inline.parse(str));

        return node;
    };

    return Paragraph;

});

Md.extend("syntax/escaped", function(require) {

    var TextNode = require("text-node");

    function Escaped(dialect) {
        var inline = dialect.getSyntax("inline");
        inline.extend(this);
    }

    Escaped.prototype.parse = function(str, queue) {

        // Only esacape: \ ` * _ { } [ ] ( ) # * + - . !
        var pattern = /\\([\\`\*_{}\[\]()#\+.!\-])/,
            reg = pattern.exec(str),
            rs = null;

        if (!pattern.test(str)) {
            return null;
        }

        if (reg.index === 0) {
            queue.push(str.substr(reg[0].length));
            return new TextNode(reg[1]);
        } else {
            queue.push(str.substring(0, reg.index));
            queue.push(str.substr(reg.index));
            return null;
        }

        return rs;
    };

    return Escaped;
});

Md.extend("syntax/inline-plain-text", function(require) {

    var TextNode = require("text-node");

    function PlainText(dialect) {
        var inline = dialect.getSyntax("inline");
        inline.extend(this);
    }

    PlainText.prototype.parse = function(str) {
        return new TextNode(str);
    };

    return PlainText;

});

Md.extend("dialects/office", function(require) {

    var DialectBuilder = require("dialect-builder");

    return new DialectBuilder()
        .setSyntax([
            

                "block" ,

            

                "inline" ,

            

                "combin-block" ,

            

                "blockquote" ,

            

                "atx-header" ,

            

                "setext-header" ,

            

                "list" ,

            

                "code" ,

            

                "horiz-line" ,

            

                "paragraph" ,

            

                "escaped" ,

            

                "inline-plain-text" 

            
        ])
        .build();

});
