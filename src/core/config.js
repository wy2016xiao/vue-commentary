/* @flow */

import {
  no,
  noop,
  identity
} from 'shared/util'

import { LIFECYCLE_HOOKS } from 'shared/constants'

export type Config = {
  // user
  optionMergeStrategies: { [key: string]: Function };
  silent: boolean;
  productionTip: boolean;
  performance: boolean;
  devtools: boolean;
  errorHandler: ?(err: Error, vm: Component, info: string) => void;
  warnHandler: ?(msg: string, vm: Component, trace: string) => void;
  ignoredElements: Array<string | RegExp>;
  keyCodes: { [key: string]: number | Array<number> };

  // platform
  isReservedTag: (x?: string) => boolean;
  isReservedAttr: (x?: string) => boolean;
  parsePlatformTagName: (x: string) => string;
  isUnknownElement: (x?: string) => boolean;
  getTagNamespace: (x?: string) => string | void;
  mustUseProp: (tag: string, type: ?string, name: string) => boolean;

  // private
  async: boolean;

  // legacy
  _lifecycleHooks: Array<string>;
};

export default ({
  /**
   * Option merge strategies (used in core/util/options)
   * 配置合并策略，用于 core/util/options
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   * 是否屏蔽warnings
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   * 在引导中提示当前是生产模式
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   * 是否使用开发模式工具
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   * 是否记录性能
   */
  performance: false,

  /**
   * Error handler for watcher errors
   * 使用函数监听errors
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   * 使用函数监听warns
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   * 忽略自定义的新人元素
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   * 自定义v-on监听别名
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   * 保留字段做组件名时的检查，可能被覆盖
   * 默认不检查
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   * 保留字段做属性名检查，可能被覆盖
   * 默认不检查
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   * 检查未知标签名
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   * 这里放一个获取元素命名空间的函数
   * 默认放了个空函数
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   * 把在特殊平台使用的特殊标签名解析成可以识别的标签名
   * 默认给什么返回什么
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   * 检查是否必须有某个属性被绑定
   * 默认放了个空函数
   */
  mustUseProp: no,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   * 是否异步执行更新操作，用于vue单元测试
   * 如果设置为false将显著降低性能
   */
  async: true,

  /**
   * Exposed for legacy reasons
   * 某些遗留原因暴露这么个配置项
   * 生命周期名数组
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
}: Config)
