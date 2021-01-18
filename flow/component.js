import type { Config } from '../src/core/config'
import type VNode from '../src/core/vdom/vnode'
import type Watcher from '../src/core/observer/watcher'

// 组件实例
declare interface Component {
  // constructor information
  static cid: number; // 组件id
  static options: Object; // 组件构造函数的选项
  // extend
  static extend: (options: Object) => Function; // 组件扩展方法
  static superOptions: Object; // 继承的options
  static extendOptions: Object; // 扩展的options
  static sealedOptions: Object; // 封闭的options
  static super: Class<Component>;
  // assets
  static directive: (id: string, def?: Function | Object) => Function | Object | void;
  static component: (id: string, def?: Class<Component> | Object) => Class<Component>;
  static filter: (id: string, def?: Function) => Function | void;
  // functional context constructor
  static FunctionalRenderContext: Function;

  // public properties
  // 公共属性 实例property
  $el: any; // Vue 实例使用的根 DOM 元素。
  $data: Object; // Vue 实例观察的数据对象。Vue 实例代理了对其 data 对象 property 的访问。
  $props: Object; // 当前组件接收到的 props 对象。Vue 实例代理了对其 props 对象 property 的访问。
  $options: ComponentOptions; // 初始化选项options
  $parent: Component | void; // 父实例，如果当前实例有的话
  $root: Component; // 当前组件树的根 Vue 实例。如果当前实例没有父实例，此实例将会是其自己。
  $children: Array<Component>; // 当前实例的直接子组件。需要注意 $children 并不保证顺序，也不是响应式的。
  $refs: { [key: string]: Component | Element | Array<Component | Element> | void }; // 一个对象，持有注册过 ref attribute 的所有 DOM 元素和组件实例。
  $slots: { [key: string]: Array<VNode> }; // 用来访问被插槽分发的内容。
  $scopedSlots: { [key: string]: () => VNodeChildren }; // 用来访问作用域插槽。对于包括 默认 slot 在内的每一个插槽，该对象都包含一个返回相应 VNode 的函数。
  $vnode: VNode; // 在父组件中存在的当前组件对应的vnode
  $attrs: { [key: string] : string }; // 包含了父作用域中不作为 prop 被识别 (且获取) 的 attribute 绑定 (class 和 style 除外)。
  $listeners: { [key: string]: Function | Array<Function> }; // 包含了父作用域中的 (不含 .native 修饰器的) v-on 事件监听器。
  $isServer: boolean; // 当前 Vue 实例是否运行于服务器。

  // public methods
  // 公共方法
  $mount: (el?: Element | string, hydrating?: boolean) => Component; // 返回实例自身
  $forceUpdate: () => void; // 迫使 Vue 实例重新渲染。注意它仅仅影响实例本身和插入插槽内容的子组件，而不是所有子组件。
  $destroy: () => void; // 完全销毁一个实例。清理它与其它实例的连接，解绑它的全部指令及事件监听器。
  $set: <T>(target: Object | Array<T>, key: string | number, val: T) => T; // 这是全局 Vue.set 的别名。返回设置的值
  $delete: <T>(target: Object | Array<T>, key: string | number) => void;
  $watch: (expOrFn: string | Function, cb: Function, options?: Object) => Function;
  $on: (event: string | Array<string>, fn: Function) => Component;
  $once: (event: string, fn: Function) => Component;
  $off: (event?: string | Array<string>, fn?: Function) => Component;
  $emit: (event: string, ...args: Array<mixed>) => Component;
  $nextTick: (fn: Function) => void | Promise<*>;
  $createElement: (tag?: string | Component, data?: Object, children?: VNodeChildren) => VNode;

  // private properties
  // 私有属性
  _uid: number | string;
  _name: string; // this only exists in dev mode
  _isVue: true;
  _self: Component;
  _renderProxy: Component; // 通常也是自己
  _renderContext: ?Component;
  _watcher: Watcher;
  _watchers: Array<Watcher>;
  _computedWatchers: { [key: string]: Watcher }; // computed中的watchers
  _data: Object;
  _props: Object;
  _events: Object;
  _inactive: boolean | null; // 不活跃的
  _directInactive: boolean;
  _isMounted: boolean;
  _isDestroyed: boolean;
  _isBeingDestroyed: boolean;
  _vnode: ?VNode; // self root node
  _staticTrees: ?Array<VNode>; // v-once cached trees
  _hasHookEvent: boolean;
  _provided: ?Object;
  // _virtualComponents?: { [key: string]: Component };

  // private methods

  // lifecycle
  _init: Function;
  _mount: (el?: Element | void, hydrating?: boolean) => Component;
  _update: (vnode: VNode, hydrating?: boolean) => void;

  // rendering
  _render: () => VNode;

  __patch__: (
    a: Element | VNode | void,
    b: VNode,
    hydrating?: boolean,
    removeOnly?: boolean,
    parentElm?: any,
    refElm?: any
  ) => any;

  // createElement

  // _c is internal that accepts `normalizationType` optimization hint
  _c: (
    vnode?: VNode,
    data?: VNodeData,
    children?: VNodeChildren,
    normalizationType?: number
  ) => VNode | void;

  // renderStatic
  _m: (index: number, isInFor?: boolean) => VNode | VNodeChildren;
  // markOnce
  _o: (vnode: VNode | Array<VNode>, index: number, key: string) => VNode | VNodeChildren;
  // toString
  _s: (value: mixed) => string;
  // text to VNode
  _v: (value: string | number) => VNode;
  // toNumber
  _n: (value: string) => number | string;
  // empty vnode
  _e: () => VNode;
  // loose equal
  _q: (a: mixed, b: mixed) => boolean;
  // loose indexOf
  _i: (arr: Array<mixed>, val: mixed) => number;
  // resolveFilter
  _f: (id: string) => Function;
  // renderList
  _l: (val: mixed, render: Function) => ?Array<VNode>;
  // renderSlot
  _t: (name: string, fallback: ?Array<VNode>, props: ?Object) => ?Array<VNode>;
  // apply v-bind object
  _b: (data: any, tag: string, value: any, asProp: boolean, isSync?: boolean) => VNodeData;
  // apply v-on object
  _g: (data: any, value: any) => VNodeData;
  // check custom keyCode
  _k: (eventKeyCode: number, key: string, builtInAlias?: number | Array<number>, eventKeyName?: string) => ?boolean;
  // resolve scoped slots
  _u: (scopedSlots: ScopedSlotsData, res?: Object) => { [key: string]: Function };

  // SSR specific
  _ssrNode: Function;
  _ssrList: Function;
  _ssrEscape: Function;
  _ssrAttr: Function;
  _ssrAttrs: Function;
  _ssrDOMProps: Function;
  _ssrClass: Function;
  _ssrStyle: Function;

  // allow dynamic method registration
  [key: string]: any
};
