/* @flow */
/**
 * 内置组件keep-alive
 */
import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

// 这玩意用来缓存vnode
type VNodeCache = { [key: string]: ?VNode };

/**
 * 获取组件名称
 * @date 2020-01-09
 * @param {?VNodeComponentOptions} opts
 * @returns {?string}
 */
function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}

/**
 * 用一些规则去匹配字符串
 * 如果是数组，则匹配数组成员
 * 如果是正则，则应用正则
 * 如果是字符串，则split(',')后匹配数组成员
 * @date 2020-01-09
 * @param {(string | RegExp | Array<string>)} pattern 
 * @param {string} name 
 * @returns {boolean}
 */
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    // 如果规则是个数组，匹配数组成员
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    // 如果规则
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}


/**
 * 修剪缓存
 * 如果传入的filter返回false,那么会销毁filter过滤出的这个缓存实例
 * @date 2020-01-09
 * @param {*} keepAliveInstance
 * @param {Function} filter
 */
function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      const name: ?string = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}


/**
 * 销毁缓存中的vnode
 * 
 * @date 2020-01-09
 * @param {VNodeCache} cache
 * @param {string} key
 * @param {Array<string>} keys
 * @param {VNode} [current]
 */
function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key]
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()
  }
  cache[key] = null
  remove(keys, key)
}

const patternTypes: Array<Function> = [String, RegExp, Array]

/**
 * 导出组件
 */
export default {
  name: 'keep-alive',
  abstract: true, // 抽象组件,它自身不会渲染一个 DOM 元素，也不会出现在组件的父组件链中。

  props: {
    include: patternTypes, // 字符串或正则表达式 只有匹配的组件会被缓存
    exclude: patternTypes, //  字符串或正则表达式。任何名称匹配的组件都不会被缓存。
    max: [String, Number] // 最多可以缓存多少组件实例
  },

  /**
   * 
   *
   * @date 18/01/2021
   */
  created () {
    this.cache = Object.create(null)
    this.keys = [] // 用来做LRU
  },

  /**
   * 销毁所有缓存组件
   *
   * @date 18/01/2021
   */
  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  render () {
    const slot = this.$slots.default
    const vnode: VNode = getFirstComponentChild(slot)
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      const name: ?string = getComponentName(componentOptions)
      const { include, exclude } = this
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        // 设置了included但不在included
        // 或设置了exclude且在excluded中
        // 直接返回vnode
        // 即不会被缓存起来
        return vnode
      }

      const { cache, keys } = this
      const key: ?string = vnode.key == null
      // same constructor may get registered as different local components
      // so cid alone is not enough (#3269)
      ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
      : vnode.key
      if (cache[key]) {
        // 如果在缓存列表中,则从缓存列表中拿实例
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest
        // LRU
        remove(keys, key)
        keys.push(key)
      } else {
        // 不在缓存列表中就缓存一下
        cache[key] = vnode
        keys.push(key)
        // prune oldest entry
        // LRU
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }

      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
}
