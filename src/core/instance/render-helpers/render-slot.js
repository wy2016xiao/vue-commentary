/* @flow */

import { extend, warn, isObject } from 'core/util/index'

/**
 * slot的渲染函数
 * 实际上是调用createElement,创建一个template
 *
 * @date 2021-01-17
 * @export
 * @param {string} name
 * @param {?Array<VNode>} fallback
 * @param {?Object} props
 * @param {?Object} bindObject
 * @returns {?Array<VNode>}
 */
export function renderSlot (
  name: string,
  fallback: ?Array<VNode>,
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  const scopedSlotFn = this.$scopedSlots[name]
  let nodes
  if (scopedSlotFn) { // scoped slot
    props = props || {}
    if (bindObject) {
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        )
      }
      props = extend(extend({}, bindObject), props)
    }
    nodes = scopedSlotFn(props) || fallback
  } else {
    nodes = this.$slots[name] || fallback
  }

  const target = props && props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
}
