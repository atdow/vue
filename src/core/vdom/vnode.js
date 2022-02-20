/* @flow */

export default class VNode {
  tag: string | void; // 节点的名称，如ul、li
  data: VNodeData | void; // 节点上的数据，如attrs、class、style
  children: ?Array<VNode>;
  text: string | void;
  elm: Node | void;
  ns: string | void;
  context: Component | void; // rendered in this component's scope 当前组件的Vue.js实例
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void; // 节点的选项参数，包含propsData、tag和children等信息
  componentInstance: Component | void; // component instance // 组件的实例
  parent: VNode | void; // component placeholder node

  // strictly internal
  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder?
  isCloned: boolean; // is a cloned node?
  isOnce: boolean; // is a v-once node?
  asyncFactory: Function | void; // async component factory function
  asyncMeta: Object | void;
  isAsyncPlaceholder: boolean;
  ssrContext: Object | void;
  fnContext: Component | void; // real context vm for functional nodes
  fnOptions: ?ComponentOptions; // for SSR caching
  devtoolsMeta: ?Object; // used to store functional render context for devtools
  fnScopeId: ?string; // functional scope id support

  constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    return this.componentInstance
  }
}

/**
 * 创建注释节点 <!--注释节点-->
 * @param {*} text
 * @returns
 */
export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  // 只有这两个属性，其他属性全是默认的undefined或者false {text: 'text', isComment: true}
  node.text = text
  node.isComment = true
  return node
}

/**
 * 创建文本节点
 * @param {*} val
 * @returns
 */
export function createTextVNode (val: string | number) {
  // 只有一个text属性 { text: 'val'}
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
/**
 * 克隆节点
 * 将现有的节点的属性复制到新节点，让新创建的节点和被克隆节点的属性保持一直，从而实现克隆效果。
 * 它的作用是优化静态节点和插槽节点(slot node)
 *
 * 以静态节点为例，当组件的某个状态发生变化后，当前组件会通过虚拟DOM重新渲染视图，静态节点因为它的
 * 内容不会发生改变，所以除了首次需要执行渲染函数获取vnode之外，后面更新不需要执行渲染函数重新
 * 生成vnode。通过克隆节点，减少调用渲染函数生成vnode，提高性能。
 */
export function cloneVNode (vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    // 克隆子节点元素并且防止在克隆子元素的时候造成原始元素数组突变
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  // 将属性一一复制到克隆节点
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true // 克隆节点的isCloned为true,被克隆的原始节点的isCloned为false
  return cloned
}
