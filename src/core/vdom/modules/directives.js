/* @flow */

import { emptyNode } from 'core/vdom/patch'
import { resolveAsset, handleError } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'

// 内置指令
export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}

// 更新指令
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 不论oldVnode还是vnode，只要其中有一个虚拟节点存在directives，那么就执行_update函数处理指令
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

function _update (oldVnode, vnode) {
  const isCreate = oldVnode === emptyNode // 判断虚拟节点是否是一个新创建的节点
  const isDestroy = vnode === emptyNode // 当新虚拟节点不存在而旧虚拟节点存在时为真
  /**
   * normalizeDirectives: 将模板中使用的指令从用户注册的自定义指令集合中取处理来：如：
   * {
   *    v-focus:{
   *        def: { inserted: f},
   *        modifiers: {},
   *        name: "focus",
   *        rawName: "v-focus"
   *    }
   * }
   */
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context) // 旧的指令集合，指oldVnode中保存的指令
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context) // 新的指令集合，指vnode中保存的指令

  const dirsWithInsert = [] // 需要触发inserted指令钩子函数的指令列表
  const dirsWithPostpatch = [] // 需要触发componentUpdated钩子函数的指令列表

  let key, oldDir, dir
  for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
    // 如果oldDir不存在，说明当前循环到的指令是首次绑定到元素，此时使用callHook触发指令中的bind函数
    if (!oldDir) {
      // new directive, bind
      callHook(dir, 'bind', vnode, oldVnode)
      // 如果该指令在注册时设置了inserted方法，那么将指令添加到dirsWithInsert中，这样做可以保证执行完所有指令的bind方法后再执行指令的inserted方法
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir)
      }
    } else {
      // existing directive, update
      // 当oldDir存在时，说明指令之前已经绑定过了，那么这一次的操作应该是更新指令
      dir.oldValue = oldDir.value // 在dir上添加oldValue属性并在其中保存上一次指令的value属性值
      dir.oldArg = oldDir.arg
      callHook(dir, 'update', vnode, oldVnode)
      // 如果该指令在注册时设置了componentUpdated方法，那么将指令添加到dirsWithPostpatch中，
      // 这样做的目的是让指令所在组件的VNode及其子VNode全部更新之后，再调用指令的componentUpdated方法
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }

  if (dirsWithInsert.length) {
    // 使用callInsert包装起循环遍历dirsWithInsert触发inserted的目的是为了让指令的inserted方法在被绑定元素插入到父节点后再调用
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    // 如果虚拟节点是一个新创建的节点
    if (isCreate) {
      // 使用mergeVNodeHook将callInsert添加到虚拟节点的insert钩子函数列表中，这样可以将钩子函数的执行推迟到被绑定的元素插入父节点之后执行
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      // 如果虚拟节点不是一个新创建的节点，那么不需要将执行指令的操作推迟到元素被插入到父节点之后，直接执行即可
      callInsert()
    }
  }
  // componentUpdated需要将指令推迟到指令所在组件的VNode及其子VNode全部更新后调用
  if (dirsWithPostpatch.length) {
    // 虚拟DOM会在元素更新前触发prePatch钩子函数，正在更新元素时中会触发update函数，更新后悔触发postpatch钩子函数
    // 因此，指令的componentUpdated需要使用mergeVNodeHook在postpatch钩子函数列表中新增一个钩子函数，当钩子函数
    // 被执行时再去执行指令的componentUpdated
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }
  // 如果当前虚拟节点是新创建的，则不需要解绑
  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // 如果这个指令在oldDirs中存在，而在newDirs不存在，则说明这个指令需要解绑
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

const emptyModifiers = Object.create(null)

function normalizeDirectives (
  dirs: ?Array<VNodeDirective>,
  vm: Component
): { [key: string]: VNodeDirective } {
  const res = Object.create(null)
  if (!dirs) {
    // $flow-disable-line
    return res
  }
  let i, dir
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i]
    if (!dir.modifiers) {
      // $flow-disable-line
      dir.modifiers = emptyModifiers
    }
    res[getRawDirName(dir)] = dir
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  // $flow-disable-line
  return res
}

function getRawDirName (dir: VNodeDirective): string {
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

/**
 *
 * @param {*} dir 指令对象
 * @param {*} hook 将要触发的钩子函数名
 * @param {*} vnode 新虚拟节点
 * @param {*} oldVnode 旧虚拟节点
 * @param {*} isDestroy 当新虚拟节点不存在而旧虚拟节点存在时为真
 */
function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  const fn = dir.def && dir.def[hook] // 从指令对象中取出对应的钩子函数
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy) // 执行钩子函数
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
