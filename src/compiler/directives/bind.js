/* @flow */
/**
 * 给传入的标签绑一个方法
 * 该方法返回一个字符串
 * @date 2020-01-09
 * @export
 * @param {ASTElement} el
 * @param {ASTDirective} dir
 */
export default function bind (el: ASTElement, dir: ASTDirective) {
  el.wrapData = (code: string) => {
    return `_b(${code},'${el.tag}',${dir.value},${
      dir.modifiers && dir.modifiers.prop ? 'true' : 'false'
    }${
      dir.modifiers && dir.modifiers.sync ? ',true' : ''
    })`
  }
}
