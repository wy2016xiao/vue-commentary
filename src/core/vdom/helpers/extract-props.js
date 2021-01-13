/* @flow */

import {
  tip,
  hasOwn,
  isDef,
  isUndef,
  hyphenate,
  formatComponentName
} from 'core/util/index'


/**
 * 获取对props的定义类型 默认值等信息
 *
 * @date 2021-01-13
 * @export
 * @param {VNodeData} data
 * @param {Class<Component>} Ctor
 * @param {string} [tag]
 * @returns {?Object}
 */
export function extractPropsFromVNodeData (
  data: VNodeData,
  Ctor: Class<Component>,
  tag?: string
): ?Object {
  // 如果实例没有定义props,直接就不去解析了,你声明了也没意义
  const propOptions = Ctor.options.props
  if (isUndef(propOptions)) {
    return
  }
  const res = {}
  const { attrs, props } = data
  if (isDef(attrs) || isDef(props)) {
    for (const key in propOptions) {
      const altKey = hyphenate(key)
      if (process.env.NODE_ENV !== 'production') {
        const keyInLowerCase = key.toLowerCase()
        if (
          key !== keyInLowerCase &&
          attrs && hasOwn(attrs, keyInLowerCase)
        ) {
          // prop和attr同名警告
          tip(
            `Prop "${keyInLowerCase}" is passed to component ` +
            `${formatComponentName(tag || Ctor)}, but the declared prop name is` +
            ` "${key}". ` +
            `Note that HTML attributes are case-insensitive and camelCased ` +
            `props need to use their kebab-case equivalents when using in-DOM ` +
            `templates. You should probably use "${altKey}" instead of "${key}".`
          )
        }
      }
      // 检查attrs或者props里面有没有定义的prop,有就取值并返回
      checkProp(res, props, key, altKey, true) ||
      checkProp(res, attrs, key, altKey, false)
    }
  }
  return res
}

function checkProp (
  res: Object,
  hash: ?Object,
  key: string,
  altKey: string,
  preserve: boolean
): boolean {
  if (isDef(hash)) {
    if (hasOwn(hash, key)) {
      res[key] = hash[key]
      if (!preserve) {
        delete hash[key]
      }
      return true
    } else if (hasOwn(hash, altKey)) {
      res[key] = hash[altKey]
      if (!preserve) {
        delete hash[altKey]
      }
      return true
    }
  }
  return false
}
