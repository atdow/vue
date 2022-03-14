/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-12 12:57:10
 * @Description: file description
 */
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  // 说明Vue是构造函数，需要new处理啊
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// 这五个函数的作用是向Vue的原型中挂载方法
initMixin(Vue) // vm._init
stateMixin(Vue) // 数据相关的实例方法：vm.$watch、vm.$set、vm.$delete
eventsMixin(Vue) // 事件相关的实例方法：vm.$on、vm.$once、vm.$off、vm.$emit
lifecycleMixin(Vue) // 生命周期相关的实例方法：vm.$forceUpdate、vm.$destroy
renderMixin(Vue) // $nextTick

export default Vue
