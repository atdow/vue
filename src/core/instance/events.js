/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add (event, fn) {
  target.$on(event, fn)
}

function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  /**
   * 监听当前实例上的自定义事件，事件可以由vm.$emit触发。
   * 将回调注册到事件列表中
   */
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      /**
       * vm._events是一个对象，用来存储事件：vm._events = Object.create(null)
       */
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  /**
   * 监听一个自定义事件，但是只触发一次，在第一次触发之后移除监听器
   */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    // 拦截器：将监听器移除，同时触发监听函数
    function on () {
      vm.$off(event, on) // 将监听器移除
      fn.apply(vm, arguments) // 手动触发监听函数
    }
    on.fn = fn // 将用户提供的原始监听器保存到拦截器的fn属性中（是为了在vm.$off将监听器成功移除）
    vm.$on(event, on) // 注册监听事件
    return vm
  }

  /**
   * 移除自定义事件
   *    如果没有提供参数，则移除所有的事件监听器
   *    如果只提供事件，则移除该事件的所有监听器
   *    如果同时提供了事件与回调，则只移除这个回调的监听器
   */
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // 没有提供参数，移除所有事件的监听器
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // 事件支持数组
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // 如果这个事件没有被监听，什么都不做
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    // 只提供事件,移除该事件的所有监听器
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    // 同时提供了事件与回调，只移除这个回调的监听器
    let cb
    let i = cbs.length
    while (i--) { // 从后往前遍历，保证了顺序
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) { // cb.fn === fn这个判断涉及$once上监听器的移除
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }
  // 触发当前实例上的事件，附加参数都会传给监听器回调
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    let cbs = vm._events[event] // 取出事件
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs // toArray(cbs)：转成真正的数组
      const args = toArray(arguments, 1) // args：是一个数组，包含了除第一个参数外的所有参数
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info) // 触发事件（统一在错误处理函数中进行处理）
      }
    }
    return vm
  }
}
