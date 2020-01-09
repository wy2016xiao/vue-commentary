/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 *
 * 如果是dom元素则直接返回
 * 如果不是dom元素则querySelector
 * 如果找不到则返回一个div
 * @date 2020-01-08
 * @param {(string | Element)} el
 * @returns {Element} Element
 */
export function query (el: string | Element): Element {
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}
