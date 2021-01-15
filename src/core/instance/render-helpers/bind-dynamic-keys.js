/* @flow */

// 处理v-bind和v-on中动态参数的动态键的助手
// For example, the following template:
//
// <div id="foo" :[key]="value">
//
// compiles to the following:
//
// _c('div', { attrs: bindDynamicKeys({ "id": "app" }, [key, value]) })

import { warn } from 'core/util/debug'

/**
 * 把绑定的动态参数的键值融入到静态的上面
 *
 * @date 15/01/2021
 * @export
 * @param {Object} baseObj
 * @param {Array<any>} values
 * @return {*}  {Object}
 */
export function bindDynamicKeys (baseObj: Object, values: Array<any>): Object {
  for (let i = 0; i < values.length; i += 2) {
    const key = values[i]
    if (typeof key === 'string' && key) {
      // 把键值对存入baseObj中
      baseObj[values[i]] = values[i + 1]
    } else if (process.env.NODE_ENV !== 'production' && key !== '' && key !== null) {
      // 开发环境警告
      warn(
        `Invalid value for dynamic directive argument (expected string or null): ${key}`,
        this
      )
    }
  }
  return baseObj
}

// helper to dynamically append modifier runtime markers to event names.
// ensure only append when value is already string, otherwise it will be cast
// to string and cause the type check to miss.
// 辅助程序，用于动态地将修饰符运行时标记附加到事件名称。
// 确保只有当value已经是字符串时才追加，否则它将被转换为字符串并导致类型检查失败。
export function prependModifier (value: any, symbol: string): any {
  return typeof value === 'string' ? symbol + value : value
}
