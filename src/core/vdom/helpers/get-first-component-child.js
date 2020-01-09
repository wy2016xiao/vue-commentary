/* @flow */

import { isDef } from 'shared/util'
import { isAsyncPlaceholder } from './is-async-placeholder'

/**
 * 查找第一个满足条件的子组件
 * 必须有componentOptions属性且是异步占位符
 * @date 2020-01-09
 * @export
 * @param {?Array<VNode>} children
 * @returns {?VNode}
 */
export function getFirstComponentChild (children: ?Array<VNode>): ?VNode {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c
      }
    }
  }
}
