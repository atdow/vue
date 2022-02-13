/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-02-12 00:11:20
 * @Description: file description
 */
/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method 缓存原始方法
  const original = arrayProto[method]
  // def ==> Object.defineProperty
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args) // 原生函数本身做的事
    const ob = this.__ob__ // this.__ob__是Observer实例（因为拦截器是原型方法）
    let inserted
    /**
     * 判断method是不是push、unshift、splice这三种往数组中新增元素的方法
     * 如果是，就将新增的元素取出来，暂存在inserted中
     */
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2) // 从第三位开始取
        break
    }
    // console.log("inserted:",inserted)
    // inserted从args将会是一个数组
    if (inserted) ob.observeArray(inserted) // Observer.observeArray，将新增的元素转为响应式数据
    // notify change 向依赖发送信息
    ob.dep.notify()
    return result // 返回原生函数执行后的结果
  })
})
