/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef, // 判断传入的参数是否为undefined或null
  isTrue,
  isPlainObject
} from 'shared/util'

/**
 * 将事件修饰符解析出来
 * <child v-on.increment.once="a"></child> vm._$options.parentListener ==> {~increment: function(){}}
 */
const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  function invoker () {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  invoker.fns = fns
  return invoker
}

/**
 * 对比listeners和oldListeners的不同，并调用参数中提供的add和remove进行相应的注册事件和卸载事件的操作
 * @param {*} on  listeners
 * @param {*} oldOn oldListeners
 * @param {*} add 注册事件
 * @param {*} remove 卸载事件
 * @param {*} createOnceHandler
 * @param {*} vm
 */
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  // 循环on，判断那些事件在oldOn中不存在，则调用add注册这些事件
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) { // 如果事件名在oldOn中不存在
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      // 注册事件
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) { // 如果事件名在on和oldOn中都存在，但是它们不相同
      old.fns = cur // 将事件回调替换成on中的回调
      on[name] = old // 把on中的回调引用指向真实的事件系统中中注册的事件，也就是oldOn中对应的事件
    }
  }
  // 循环oldOn，判断那些事件在on中不存在，则调用remove卸载这些事件
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
