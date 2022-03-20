/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-20 14:50:47
 * @Description: file description
 */
/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

/**
 * 初始化provide：将provide选项添加到vm._provided
 * provide选项应该是一个对象或者是返回一个对象的函数
 */
export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm) // 如果是函数，则调用（应该要返回一个对象）
      : provide
  }
}
/**
 * 初始化inject
 * 在data/props之前初始化inject，这样做的目的是让用户在data/props中使用inject所注入的内容
 */
export function initInjections (vm: Component) {
  // 通过用户配置的inject，自底向上搜索可用的注入内容，并将搜索结果返回
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false) // 通知defineReactive不要将内容转换成响应式
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

/**
 * 通过用户配置的inject，自底向上搜索可用的注入内容，并将搜索结果返回
 * 当使用provide注入内容时，其实是将内容注入到当前组件实例的_provide中，所以inject可以从父组件实例的_provide中获取注入的内容
 */
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    /**
     * hasSymbol：是否支持Symbol
     */
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue
      /*
      * 通过from属性得到provide源属性
      * 当Vue.js被实例化时，会在上下文(this)中添加$options属性，这会把inject中提供的数据规格化，包括inject
      *    用户设置： { inject: [foo] }
      *   规格化：{ inject: { foo: { from: "foo" }}}
      */
      const provideKey = inject[key].from
      let source = vm // 一开始为当前实例
      // 自底向上寻找provide源属性
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent // 向上寻找
      }
      // 没有source，设置默认值
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          // 支持函数和普通字符串
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
