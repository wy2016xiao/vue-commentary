/* @flow */

import { warn, extend, isPlainObject } from 'core/util/index'

/**
 * 把v-on拿出来融到data里面
 * 这里的data应该就是实例上的data
 *
 * @date 15/01/2021
 * @export
 * @param {*} data
 * @param {*} value
 * @return {*}  {VNodeData}
 */
export function bindObjectListeners (data: any, value: any): VNodeData {
  if (value) {
    if (!isPlainObject(value)) {
      process.env.NODE_ENV !== 'production' && warn(
        'v-on without argument expects an Object value',
        this
      )
    } else {
      const on = data.on = data.on ? extend({}, data.on) : {}
      for (const key in value) {
        const existing = on[key]
        const ours = value[key]
        on[key] = existing ? [].concat(existing, ours) : ours
      }
    }
  }
  return data
}
