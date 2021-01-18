/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * 给一个对象的属性设置监听
 * @date 2020-04-20
 * @export
 * @param {Object} target - almost vm
 * @param {string} sourceKey - 被代理属性的所附对象
 * @param {string} key - 被代理的属性名
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    // 改 this[key]为this['_props'][key]
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * state  包括props methods data computede watch的初始化
 */
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  // 初始化props,同时将prop绑定到实例上方便用户获取
  if (opts.props) initProps(vm, opts.props)
  // 这个比较简单，进行一些错误判断，然后使用bind方法把this指向vm,方便用户获取
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    // 这里是穿进去之后取vm.$options
    // 不太懂，不是同一个人写的？
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  // Firefox has a "watch" function on Object.prototype...
  // exclude it 
  // 火狐浏览器有watch这个函数，在对象的原型上
  // 忽略它
  // nativeWatch表示火狐浏览器那个watch函数
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

/**
 * props属性的初始化
 * 主要是监听
 */
function initProps (vm: Component, propsOptions: Object) {
  // 创建实例时传递 props。主要作用是方便测试。
  // 使用new Vue()等方式创建实例时,区别于使用tempalte模板,是需要使用另一种方式传递props的
  // 即propsData属性
  const propsData = vm.$options.propsData || {}
  // 存放最终的props对象到vm._props
  const props = vm._props = {}
  // 一个优化
  // 将props的key缓存到vm.$options._propKeys，为了后续更新时的快速的查找，而不需要动态的枚举
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // 如果不是根实例的props那么必须转换一下
  // 禁止进行观察
  // 这是因为如果不是根节点,他的props肯定是父节点给的
  // 而父节点的数据已经被监听过了
  if (!isRoot) {
    toggleObserving(false)
  }
  // 循环处理props的属性对象
  for (const key in propsOptions) {
    // 首先把key保存起来
    keys.push(key)
    // 校验props，包括对类型的校验以及产生最后的属性值
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 赋值并监听props
      defineReactive(props, key, value)
    }
    // 代理到vm对象上，使用vm.xx或者组件中this.xx直接访问props属性
    // 当你使用vm.xx或者this.xx时，实际上访问的是_props属性下的这些属性
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

/**
 * 初始化data
 * 包括各种合法性检查
 * 以及对data进行observe
 *
 * @date 2020-05-05
 * @param {Component} vm
 */
function initData (vm: Component) {
  let data = vm.$options.data
  // 保存data到vm._data中，判断data是否是function类型，对于组件必须是function
  // 如果 data 仍然是一个纯粹的对象，则所有的实例将共享引用同一个数据对象
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  // 对于上一步的后一种情况，开发环境下这里做出了提示，必须使用function
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }

  // 接下来对data进行名字检查
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      // data和methods重名提示
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      // props和data重名提示
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // 判断保留字段
      // 判断是否以 _ 或 $ 开头，如果是则认为是Vue自身的属性，则不会被代理
      // 和props一样，访问this.xx其实是在访问this._data.xx
      proxy(vm, `_data`, key)
    }
  }
  // 名字检查结束

  // 运行 observe 函数建立起 Observer 和钩子函数
  // 后续数据的变化都会触发其watcher对象
  observe(data, true /* asRootData */)
}

/**
 * 核心为data.call(vm, vm)
 * 通过调用 data 选项从而获取数据对象
 * @date 2020-04-21
 * @export
 * @param {Function} data - 用户定义的data
 * @param {Component} vm
 * @returns {*}
 */
export function getData (data: Function, vm: Component): any {
  // 将当前的target置为undefined,暂停一下
  // 这么做是为了防止使用 props 数据初始化 data 数据时收集冗余的依赖
  // 也就是说,这样不给参数的调用之后,target为空,也就不会进行依赖收集了
  pushTarget()
  try {
    // 以vm为参数调用data
    // 这样你其实可以在data的函数里面使用this
    // 当然里面其实获取不到太多的东西
    // 至少props是有的,因为这个时候已经完成了initProps
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

/**
 * 初始化计算属性
 *
 * @date 2020-04-21
 * @param {Component} vm
 * @param {Object} computed
 */
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    // 获取用户定义的computed
    const userDef = computed[key]
    // getter始终需要是一个函数
    // 如果用户定义的是{getter, setter}形式
    // 取getter
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // 非服务器渲染场景下
      // 给computed创建watcher类
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 在组件上定义的计算属性如果已经在组件的别的地方存在,则给他报错
    // 否则绑定到vm对象上
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

/**
 * 将computed定义的属性绑定到实例对象上
 *
 * @date 2020-04-21
 * @export
 * @param {*} target - vm
 * @param {string} key - computed name
 * @param {(Object | Function)} userDef - 用户定义的那个函数 or 对象
 */
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  // 如果是非服务端渲染，可以把它缓存起来
  const shouldCache = !isServerRendering()
  // 如果定义是函数形式
  if (typeof userDef === 'function') {
    // 通过Object.defineProperty实现对计算属性的getter和setter方法的劫持。
    // 调用getter方法时，实际调用createComputedGetter方法。
    // 非服务器渲染暂不表
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    // 如果是以对象方式定义的
    // 先看有没有定义get
    // 定义了get：如果能缓存并且用户允许缓存，createComputedGetter
    //           如果不能缓存或者用户不允许缓存，createGetterInvoker(userDef.get)
    // 没有定义get：给个空函数
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
      // 定义该属性的setter
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // 给vm实例加上该computed属性
  // 该属性被改写了getter和setter
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * 非服务端渲染（即可以缓存）场景下使用
 * 返回一个用户定义的computed属性在实例上的getter（this.xx时触发）
 */
function createComputedGetter (key) {
  return function computedGetter () {
    // 看看computed是否已经被watch
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      // 如果已经被watch
      if (watcher.dirty) {
        // 如果watcher改变了，刷新watcher
        watcher.evaluate()
      }
      // TODO: 不太清楚Dep.target是什么
      if (Dep.target) {
        // 将定义的watcher类，加入到发布器dep中，实现依赖收集，当依赖变量发生变化，触发计算属性的重新计算
        watcher.depend()
      }
      // 返回值
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

/**
 * methods属性的初始化
 */
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      // 判断props中是否已经定义了该方法，如果是，则提示已经定义，可见props的优先级要大于method中定义
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      // 判断vm对象中是否已经定了该方法，如是则提示冲突,尽量不要以_ 或者 $打头，这个是vue自带属性和方法的命名规范，避免冲突
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // 把每个methods[key]绑定到vm上
    // bind(methods[key], vm) 将methods[key]的this指向vm
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

/**
 *
 * @date 2020-04-21
 * @param {Component} vm
 * @param {Object} watch - 类型可能是{ [key: string]: string | Function | Object | Array }
 */
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    // 叫handler说不定只是个字符串
    const handler = watch[key]
    if (Array.isArray(handler)) {
      // 数组的话，循环针对每个数组成员创建watcher
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      // 否则直接针对属性值创建watcher
      createWatcher(vm, key, handler)
    }
  }
}

/**
 * 格式化一下watch选项的值
 * 毕竟有很多种写法
 *
 * @date 2020-04-21
 * @param {Component} vm
 * @param {(string | Function)} expOrFn - 监听形似'a.b.c'的属性值或者一个函数的返回值的改变
 * @param {*} handler - function (newVal, oldVal) {...}
 * 或者
 * {handler: function (newVal, oldVal) {...}, ...}
 * 当handler为对象时，其他属性可能是options的属性
 * e.g. [
 *   'handle1',
 *   function handle2 (val, oldVal) {},
 *   {
 *     handler: function handle3 (val, oldVal) {},
 *     deep: false,
 *     immediate: true
 *   }
 * ]
 * @param {Object} [options] - immediate deep
 * @returns 
 */
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 如果handler是个对象（这一般在watch写了一个数组的时候出现）
  // 这时候可能形如{
  //   handler: function (new, old) {},
  //   deep: true,
  //   immediate:false 
  // }
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  // 只写了个名字，去实例中找，用户定义在methods中
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  // 创建watch对象
  return vm.$watch(expOrFn, handler, options)
}


/**
 * 定义了$data $props $set $delete $watch
 *
 * @date 2021-01-06
 * @export
 * @param {Class<Component>} Vue
 */
export function stateMixin (Vue: Class<Component>) {
  // $data $props其实就是_data _props
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  // 不允许用户对$data $props两个对象进行修改
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
        )
      }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  /**
   * $watch API
   * 详见该文件createWatcher方法参数
   */
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    // 简单对象的话，直接交给createWatcher，先去格式化一波
    // 只会存在于用户手动调用this.$watch的场景
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    // 创建watcher实例
    // 每次对应的属性（expOrFn）发送变化，都会触发回调函数(cb)执行
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // 如果定义了立即执行
    if (options.immediate) {
      // 那就立即执行呗
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    // watch API会返回一个函数，调用之后会取消watch
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
