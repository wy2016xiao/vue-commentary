/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )

  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  /**
   * 保留前缀警告
   * 不能使用$和_作为变量前缀
   */
  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  /**
   * 检查当前是否能使用Proxy类
   */
  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }

  const hasHandler = {
    /**
     * 判断是否拥有这个属性
     * 会做一些过滤
     */
    has (target, key) {
      // target是否拥有key
      const has = key in target
      // 检查这个key是否是全局属性
      // (windows上的，比如Number JSON等等) 或 (_开头并且不在vm.$data内)
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))

      // 如果不是全局属性并且不以_开头且非windows上的属性名称
      if (!has && !isAllowed) {
        // 但data里面有这个属性，说明使用了类似this.$user_id的写法。做出保留前缀被误用告警
        // 否则做出不存在告警
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }

      return has || !isAllowed
    }
  }

  const getHandler = {
    /**
     * target目前是VM实例
     * key是用户将要访问的key
     */
    get (target, key) {
      // 判断target是否有key属性
      // key in target   牛逼的判断方式
      // 不然的话可以使用taerget[key]
      // 但这样需要判断undefined等特殊情况
      if (typeof key === 'string' && !(key in target)) {
        // 如果目标里面没有这个属性
        
        // 但data里面有这个属性，说明使用了类似this.$user_id的写法。做出保留前缀被误用告警
        // 否则做出不存在告警
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }

      // 如果目标有这个属性，返回这个属性
      return target[key]
    }
  }

  initProxy = function initProxy (vm) {
    // 决定使用什么方式去定义_renderProxy属性
    // 如果是ES6就使用Proxy
    if (hasProxy) {
      // 如果能使用Proxy类
      const options = vm.$options
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
