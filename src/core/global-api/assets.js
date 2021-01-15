/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

/**
 * 初始化全局方法component directive filter
 * Vue.component Vue.directive Vue.filter
 *
 * @date 15/01/2021
 * @export
 * @param {GlobalAPI} Vue
 */
export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  // ASSET_TYPES = [
  //   'component',
  //   'directive',
  //   'filter'
  // ]
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string, // 名字
      definition: Function | Object // 实际定义的内容 不传就是返回定义的内容
    ): Function | Object | void {
      if (!definition) {
        // 没有definition就返回id对应的内容
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        // 做个检查
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          // conponent的情况下,对definition做一些整合矫正
          definition.name = definition.name || id
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          // directive的情况下,definition格式化一下
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
