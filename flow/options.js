// 内部组件的构造参数
declare type InternalComponentOptions = {
  _isComponent: true;
  parent: Component;
  _parentVnode: VNode;
  render?: Function;
  staticRenderFns?: Array<Function>
};

type InjectKey = string | Symbol;

// 普通组件的构造函数参数
declare type ComponentOptions = {
  componentId?: string;

  // data
  data: Object | Function | void;
  props?: { [key: string]: PropOptions };
  propsData?: ?Object; // 创建实例时传递 props。主要作用是方便测试。 类似于在标签上写的props的值
  computed?: {
    [key: string]: Function | {
      get?: Function;
      set?: Function;
      cache?: boolean
    }
  };
  methods?: { [key: string]: Function };
  watch?: { [key: string]: Function | string };

  // DOM
  el?: string | Element;
  template?: string;
  render: (h: () => VNode) => VNode;
  renderError?: (h: () => VNode, err: Error) => VNode;
  staticRenderFns?: Array<() => VNode>;

  // lifecycle
  beforeCreate?: Function;
  created?: Function;
  beforeMount?: Function;
  mounted?: Function;
  beforeUpdate?: Function;
  updated?: Function;
  activated?: Function; // 被 keep-alive 缓存的组件激活时调用。
  deactivated?: Function; // 被 keep-alive 缓存的组件停用时调用。
  beforeDestroy?: Function;
  destroyed?: Function;
  errorCaptured?: () => boolean | void; // 当捕获一个来自子孙组件的错误时被调用。
  serverPrefetch?: Function;

  // assets
  directives?: { [key: string]: Object };
  components?: { [key: string]: Class<Component> };
  transitions?: { [key: string]: Object };
  filters?: { [key: string]: Function };

  // context
  provide?: { [key: string | Symbol]: any } | () => { [key: string | Symbol]: any };
  inject?: { [key: string]: InjectKey | { from?: InjectKey, default?: any }} | Array<string>;

  // component v-model customization
  model?: {
    prop?: string;
    event?: string;
  };

  // misc
  parent?: Component;
  mixins?: Array<Object>;
  name?: string;
  extends?: Class<Component> | Object;
  delimiters?: [string, string];
  comments?: boolean;
  inheritAttrs?: boolean;

  // private
  _isComponent?: true;
  _propKeys?: Array<string>;
  _parentVnode?: VNode;
  _parentListeners?: ?Object;
  _renderChildren?: ?Array<VNode>;
  _componentTag: ?string;
  _scopeId: ?string;
  _base: Class<Component>;
};

declare type PropOptions = {
  type: Function | Array<Function> | null;
  default: any;
  required: ?boolean;
  validator: ?Function;
}
