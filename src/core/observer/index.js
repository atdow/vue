/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import {
  arrayMethods // 加工了拦截操作的数组原型方法
 } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 *
 * Observer类会附加到每一个被侦测的object上，
 * 一旦被附加上，Observer会将object的所有属性转换为getter/setter的形式
 * 来收集属性的依赖，并且当属性发生变化时会通知这些依赖
 *
 * 只要把一个object传到Observer，那么这个object就会变成响应式的object
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data
  constructor (value: any) {
    this.value = value
    this.dep = new Dep() // 这里收集的依赖只是数组
    this.vmCount = 0
    /**
     * 不可枚举的属性__ob__指向this
     * 作用：
     *  1. 标记数据是否被侦测了变化
     *  2. 方便通过__ob__拿到Observer实例
     */
    def(value, '__ob__', this)
    // 如果是数组，则覆盖响应式数组的原型（只对在data中定义的数组才做处理，所以不会污染全局Array.prototype）
    if (Array.isArray(value)) {
      // __ptoto__是否能用
      if (hasProto) {
        protoAugment(value, arrayMethods) // value.__proto__ = arrayMethods，拦截改写数据原生方法
      } else {
        copyAugment(value, arrayMethods, arrayKeys) // 在数组中挂载定义加工了拦截操作的数组原型方法
      }
      this.observeArray(value) // 侦测Array中的每一项
    } else {
      this.walk(value)
    }
  }
  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   *
   * Walk会将每一属性都转成getter/setters的形式来侦测变化
   * 这个方法只有在数据类型为Object时才被调用
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }
  /**
   * Observe a list of Array items.
   * 检测Array中的每一项
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 * 在数组中挂载定义加工了拦截操作的数组原型方法
 *
 * target：value
 * src：arrayMethods
 * keys：arrayKeys
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * 尝试为value创建一个Observer实例
 * 如果创建成功，直接返回新创建的Observer实例
 * 如果value已经存在一个Observer实例实例，则直接返回
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // __ob__就是Observer，如果有证明当前value已经是响应式数据
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep() // 这里收集的依赖只是对象

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 这里将会递归子属性
  let childOb = !shallow && observe(val) // observe(val)返回的就是Observe实例
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // 收集依赖（对象和数组的依赖都是在这里收集的）
      if (Dep.target) {
        dep.depend() // 第一层依赖收集
        if (childOb) {
          childOb.dep.depend()
          // 数组的依赖收集（收集的依赖在Observer的dep中）
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify() // 触发依赖
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 *
 * 这个就是this.$set方法
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
   warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 如果target是数组并且key是有效的索引
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key) // 设置有效的索引
    target.splice(key, 1, val) // 改变数值的同时触发拦截器，将val转换成响应式的
    return val
  }
  // key已经在target，说明这个key已经被侦听，所以直接修改target[key]会触发setter进行更新
  if (key in target && !(key in Object.prototype)) { // !(key in Object.prototype)代表是对象
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  // target不能是Vue.js实例或者Vue.js实例的根实例对象（this.$data）
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果target不是响应式的，说明只是普通变量，直接修改数值就行，不用做其他的过多处理
  if (!ob) {
    target[key] = val
    return val
  }
  // 下面的逻辑说明是用户在响应式数据上新增了一个属性
  defineReactive(ob.value, key, val) // 将新增的属性key转换为getter/setter形式
  ob.dep.notify() // 向target的依赖触发变化通知
  return val
}

/**
 * Delete a property and trigger change if necessary.
 *
 * this.$delete
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组的情况
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1) // 劫持更新
    return
  }
  const ob = (target: any).__ob__
  // 不可以在Vue.js实例或Vue.js实例的根数据对象(ob.vmCount>1)上使用
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 如果key不是target自身的属性，则终止程序程序继续执行
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key] // 先删除数据，再做后面的判断
  // 如果没有ob，说明不是响应式数组，就终止执行，不行要进行通知更新
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
