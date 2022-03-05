/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 *
 * 优化器
 *  作用：在AST中找出静态子树并打上标记
 *  好处：
 *    每次重新渲染时，不需要为静态子树创建新节点
 *    在虚拟DOM中打补丁（patching）的过程可以跳过
 *  步骤：
 *    在AST中找出所有静态节点并打上标记
 *    在AST中找出所有静态根节点并打上标记
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  // 第一步：标记所有静态节点
  markStatic(root)
  // second pass: mark static roots.
  // 第二步：标记所有静态根节点
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

function markStatic (node: ASTNode) {
  node.static = isStatic(node) // 判断是不是静态节点
  // 如果节点的类型等于1，说明节点是元素节点
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    // 递归子节点
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      /**
       * 这里实现的是先将所有节点并打上标记后再给父节点打上标记
       * 如果第一步将父节点打上了静态标记，但是子节点却不是静态节点，这是错误的；
       * 只有所有子节点都是静态节点时，父节点才可能是静态节点（静态子树的所有节点应该都是静态节点）
       */
      if (!child.static) {
        node.static = false
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

/**
 * 标记静态根节点
 * 从上往下寻找，在寻找过程中遇到的第一静态节点就是静态根节点（特殊情况除外），同时不再往下继续查找
 * @param {*} node
 * @param {*} isInFor
 * @returns
 */
function markStaticRoots (node: ASTNode, isInFor: boolean) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    /**
     * 要使节点符合静态根节点的要求，它必须有子节点
     * 这个节点不能是只有一个静态节点的子节点，否则优化成本将超过收益
     *
     * <p>xxx</p> 这个将不会认为是静态根节点
     *
     * ul: 是静态根节点
     * <ul>
     *  <li>1></li>
     *  <li>2</li>
     *  <li>2</li>
     * <ul>
     */
    if (node.static && node.children.length && !( // 节点是静态节点并且有子节点
      // 子节点不是只有一个文本类型的子节点：<p>xxx</p>
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return // 如果当前节点已经标记为静态根节点，将不会再处理子节点
    } else {
      node.staticRoot = false
    }
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

function isStatic (node: ASTNode): boolean {
  // 带变量的动态文本节点
  if (node.type === 2) { // expression
    return false
  }
  // 不带变量的纯文本节点
  if (node.type === 3) { // text
    return true
  }
  // type === 1：元素节点的判断情况
  return !!(node.pre || ( // 如果使用了指令v-pre,那么直接判断它是一个静态节点
    !node.hasBindings && // no dynamic bindings 没有动态绑定（不能有以v-、@、:开头的属性）
    !node.if && !node.for && // not v-if or v-for or v-else 没有v-if 或 v-for 或 v-else
    !isBuiltInTag(node.tag) && // not a built-in 不是内置标签（slot或者component）
    isPlatformReservedTag(node.tag) && // not a component 不是组件(标签名必须是保留标签，例如<div></div>，HTML保留标签和SVG保留标签)
    !isDirectChildOfTemplateFor(node) && // 当前节点的父节点不能是带v-for指令的template标签
    Object.keys(node).every(isStaticKey) // 当前节点不存在动态节点才会有的属性
  ))
  // 动态绑定语法包括v-for、v-if、v-else、v-else-if和v-once等
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
