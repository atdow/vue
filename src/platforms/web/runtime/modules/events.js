/* @flow */

import { isDef, isUndef } from 'shared/util'
import { updateListeners } from 'core/vdom/helpers/index'
import { isIE, isFF, supportsPassive, isUsingMicroTask } from 'core/util/index'
import { RANGE_TOKEN, CHECKBOX_RADIO_TOKEN } from 'web/compiler/directives/model'
import { currentFlushTimestamp } from 'core/observer/scheduler'

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
function normalizeEvents (on) {
  /* istanbul ignore if */
  if (isDef(on[RANGE_TOKEN])) {
    // IE input[type=range] only supports `change` event
    const event = isIE ? 'change' : 'input'
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])
    delete on[RANGE_TOKEN]
  }
  // This was originally intended to fix #4521 but no longer necessary
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || [])
    delete on[CHECKBOX_RADIO_TOKEN]
  }
}

let target: any

// createOnceHandler实现once功能
function createOnceHandler (event, handler, capture) {
  const _target = target // save current target element in closure
  return function onceHandler () {
    const res = handler.apply(null, arguments) // 执行handler函数
    // 如果返回值不是null，就进行解绑
    if (res !== null) {
      remove(event, onceHandler, capture, _target)
    }
  }
}

// #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
// implementation and does not fire microtasks in between event propagation, so
// safe to exclude.
const useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53)

// 添加事件
function add (
  name: string,
  handler: Function,
  capture: boolean,
  passive: boolean
) {
  // async edge case #6566: inner click event triggers patch, event handler
  // attached to outer element during patch, and triggered again. This
  // happens because browsers fire microtask ticks between event propagation.
  // the solution is simple: we save the timestamp when a handler is attached,
  // and the handler would only fire if the event passed to it was fired
  // AFTER it was attached.
  if (useMicrotaskFix) {
    const attachedTimestamp = currentFlushTimestamp
    const original = handler
    handler = original._wrapper = function (e) {
      if (
        // no bubbling, should always fire.
        // this is just a safety net in case event.timeStamp is unreliable in
        // certain weird environments...
        e.target === e.currentTarget ||
        // event is fired after handler attachment
        e.timeStamp >= attachedTimestamp ||
        // bail for environments that have buggy event.timeStamp implementations
        // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
        // #9681 QtWebEngine event.timeStamp is negative value
        e.timeStamp <= 0 ||
        // #9448 bail if event is fired in another document in a multi-page
        // electron/nw.js app, since event.timeStamp will be using a different
        // starting reference
        e.target.ownerDocument !== document
      ) {
        return original.apply(this, arguments)
      }
    }
  }
  // 给原生事件添加事件监听器
  target.addEventListener(
    name,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )
}
// 移除事件
function remove (
  name: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  // 调用浏览器提供的removeEventListener进行解绑事件
  (_target || target).removeEventListener(
    name,
    handler._wrapper || handler, // 因为在绑定事件时经历了withMacroTask的处理，最终被绑定的事件监听器其实是handler._wrapper，所以解绑时也需要解绑handler._wrapper；只有handler._wrapper不存在时才解绑handler
    capture
  )
}
/**
 * 事件绑定相关的处理逻辑
 */
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果两个VNode中的事件对象都不存在，说明上一次没有绑定任何事件，这一次元素更新也没有新增事件绑定，因此不需要进行事件的绑定与解绑
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {} // 新虚拟节点上的事件对象
  const oldOn = oldVnode.data.on || {} // 旧虚拟节点上的事件对象
  target = vnode.elm // vnode.elm保存vnode所对应的DOM元素
  normalizeEvents(on) // 对特殊情况下的事件对象做一些特殊处理
  updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context) // 更新事件监听器
  target = undefined
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners
}
