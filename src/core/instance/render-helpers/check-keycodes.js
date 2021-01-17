/* @flow */

import config from 'core/config'
import { hyphenate } from 'shared/util'

/**
 * 判定actual是否和expect不相等或者不存在在expect数组中
 *
 * @date 15/01/2021
 * @template T
 * @param {(T | Array<T>)} expect
 * @param {T} actual
 * @return {*}  {boolean}
 */
function isKeyNotMatch<T> (expect: T | Array<T>, actual: T): boolean {
  if (Array.isArray(expect)) {
    return expect.indexOf(actual) === -1
  } else {
    return expect !== actual
  }
}

/**
 * 检查config中的keyCodes的合法性
 * 暴露为this._k函数
 * passing in eventKeyName as last argument separately for backwards compat
 * 单独传入eventKeyName作为向后compat的最后一个参数
 */
export function checkKeyCodes (
  eventKeyCode: number,
  key: string,
  builtInKeyCode?: number | Array<number>,
  eventKeyName?: string,
  builtInKeyName?: string | Array<string>
): ?boolean {
  const mappedKeyCode = config.keyCodes[key] || builtInKeyCode
  if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
    return isKeyNotMatch(builtInKeyName, eventKeyName)
  } else if (mappedKeyCode) {
    return isKeyNotMatch(mappedKeyCode, eventKeyCode)
  } else if (eventKeyName) {
    return hyphenate(eventKeyName) !== key
  }
}
