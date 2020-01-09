/* @flow */

import { warn } from 'core/util/index'

/**
 * 给元素绑定一个方法
 * @date 2020-01-09
 * @export
 * @param {ASTElement} el
 * @param {ASTDirective} dir
 */
export default function on (el: ASTElement, dir: ASTDirective) {
  if (process.env.NODE_ENV !== 'production' && dir.modifiers) {
    warn(`v-on without argument does not support modifiers.`)
  }
  el.wrapListeners = (code: string) => `_g(${code},${dir.value})`
}
