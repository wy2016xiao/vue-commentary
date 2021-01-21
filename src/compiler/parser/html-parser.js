/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'
import { unicodeRegExp } from 'core/util/lang'

// Regular Expressions for parsing tags and attributes
// 对于双引号情况
// [
//   'class="some-class"',
//   'class',
//   '=',
//   'some-class',
//   undefined,
//   undefined
// ]
// 对于单引号的情况
// [
//   "class='some-class'",
//   'class',
//   '=',
//   undefined,
//   'some-class',
//   undefined
// ]
// 对于没有引号
// [
//   'class=some-class',
//   'class',
//   '=',
//   undefined,
//   undefined,
//   'some-class'
// ]
// 对于单独的属性名
// [
//   'disabled',
//   'disabled',
//   undefined,
//   undefined,
//   undefined,
//   undefined
// ]
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/

const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
// 一个典型的XML标签:<k:bug xmlns:k="http://www.xxx.com/xxx"></k:bug>
// k是前缀 bug是标签名(xml标签名由用户自定义) xmlns为前缀赋予与指定命名空间相关联的限定名称
// 不包含前缀的XML标签名称
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being pased as HTML comment when inlined in page
const comment = /^<!\--/
const conditionalComment = /^<!\[/

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

/**
 * 把各种转义符解码
 * '&lt;': '<',
 * '&gt;': '>',
 * '&quot;': '"',
 * '&amp;': '&',
 * '&#10;': '\n',
 * '&#9;': '\t',
 * '&#39;': "'"
 */
function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

/**
 * 解析tamplate字符串的主要方法
 * 返回AST
 * @date 2020-04-24
 * @export
 * @param {*} html
 * @param {*} options
 */
export function parseHTML (html, options) {
  const stack = []
  const expectHTML = options.expectHTML
  // 检测一个标签是否是一元标签
  const isUnaryTag = options.isUnaryTag || no
  // 检测一个标签是否是可以省略闭合标签的非一元标签
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  let index = 0
  let last, lastTag
  // 循环处理html
  while (html) {
    last = html
    // Make sure we're not in a plaintext content element like script/style
    // 处理非script，style,textarea所包围的html字符串
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf('<')
      // 1."<"字符打头处理逻辑
      if (textEnd === 0) {
        // Comment:
        // 如果html以注释开头
        if (comment.test(html)) {
          const commentEnd = html.indexOf('-->')
            // 1.1、处理标准注释,<!--
          if (commentEnd >= 0) {
            // 如果找到了标准注释的结尾处
            if (options.shouldKeepComment) {
              // 当设为 true 时，将会保留且渲染模板中的 HTML 注释。默认行为是舍弃它们。
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
            }
            // 步进三个字符
            // 开始解析下一个节点
            advance(commentEnd + 3)
            continue
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        // 1.2、处理条件注释
        // e.g. <!--[if IE 8]> ... <![endif]-->
        // 直接舍弃跳过
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        // Doctype:
        // 1.3、处理申明，<!DOCTYPE
        // 直接舍弃跳过
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue
        }

        // End tag:
        // 1.4、处理结束标签，遇到结束标签直接舍弃跳过
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // Start tag:
        // 1.5、处理开始标签
        // 返回一个标签模型对象
        // 含有attrs tagName等属性
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

      // 2、非"<"打头，作为text内容处理
      let text, rest, next
      if (textEnd >= 0) {
        rest = html.slice(textEnd)
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          // 普通文本中包含的<字符，作为普通字符处理
          // 继续查找下一个<符号
          next = rest.indexOf('<', 1)
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        // 此时text就是所有的文本内容
        text = html.substring(0, textEnd)
      }

      // 没在字符串中找到<符号，直接全部识别为字符串
      // html的<字符匹配结束，将剩余字符都作为text处理
      if (textEnd < 0) {
        text = html
      }

      // 步进
      if (text) {
        advance(text.length)
      }

      // 创建text的AST模型
      if (options.chars && text) {
        options.chars(text, index - text.length, index)
      }
    } else {
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`, { start: index + html.length })
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  /**
   * html代码前进
   */
  function advance (n) {
    index += n
    html = html.substring(n)
  }

  /**
   * 解析出起始标签
   * 返回tag模型对象
   * 含有tagName start end attrs等属性
   */
  function parseStartTag () {
    // 1、匹配<${qnameCapture}字符，如:<div
    const start = html.match(startTagOpen)
    if (start) {
      // 把这个标签保存在match对象里面
      const match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      // 2.往前跳过，步进tag的长度
      advance(start[0].length)
      // 3.循环查找该标签的attr，直到结束符>
      let end, attr
      while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        attr.start = index
        // 步进该attr的长度
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
      //4、tag结束，记录全局的位置
      if (end) {
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }

  /**
   * 处理起始标签模型对象
   * 主要实现对属性对象进行规整
   * 并调用start方法，创建该标签的AST模型
   */
  function handleStartTag (match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash

    if (expectHTML) {
      // p标签或者短语标签
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      // 可以成为自闭和标签的标签
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }

    // 自闭和标签
    const unary = isUnaryTag(tagName) || !!unarySlash

    // 1.整理attrs为字面量对象数组
    // 规整完毕后 attrs=[{name=id,value=app}]
    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines) // 解码转义符
      }
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        attrs[i].start = args.start + args[0].match(/^\s*/).length
        attrs[i].end = args.end
      }
    }

    // 2.如果不是一元标签
    // 存起来并在lastTag中缓存
    // 该stack在后面的结束tag中进行闭环处理
    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end })
      lastTag = tagName
    }

    // 3、创建该标签的AST模型,并建立关联关系
    // 继续调用start方法，创建该标签元素的AST模型，建立模型树
    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  /**
   * 解析结束标签
   */
  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    // Find the closest opened tag of the same type
    // 1、从stack数组中查找结束的tag标签，并记录位置pos
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      // 循环stack查找能否和传进来的tag一样，如果一样证明是闭合标签
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    // 2、当pos>0,证明找到了闭合标签
    // 关闭从pos到最后的所有元素，理论上只会有一个，但也要防止不规范多写了结束标签
    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`,
            { start: stack[i].start, end: stack[i].end }
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      //  从stack中删除元素
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
