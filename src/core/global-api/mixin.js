/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-09 22:09:58
 * @Description: file description
 */
/* @flow */

import { mergeOptions } from '../util/index'

/**
 * 全局注册一个混入（mixin），影响注册之后创建的每个Vue.js实例（因为该方法会更改Vue.options属性）
 */
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    //  将用户传入的对象与Vue.js自身的options属性合并在一起
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
