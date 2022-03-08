/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-08 23:22:37
 * @Description: file description
 */
/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   * 使用基础Vue构造器创建一个“子类”，其参数是一个包含“组件选项”的对象
   *
   * 创建了一个Sub函数并继承了父类，如果直接使用Vue.extend(),则Sub继承了Vue构造函数
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    // 缓存策略
    const SuperId = Super.cid // 父类id
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name) // 对name进行校验
    }

    // 创建子类
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    // 将父类的原型链继承到子类中
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++ // 每个子类的唯一标识
    // 将父类的options选项继承到子类中
    Sub.options = mergeOptions(
      Super.options, // 父类选项
      extendOptions // 子类选项
    )
    Sub['super'] = Super // 将父类保存到子类的super属性中

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 如果选项中存在props属性，则初始化它
    if (Sub.options.props) {
      initProps(Sub) // 初始化props（将key代理到_props中）
    }
    // 如果选项中存在computed属性，则初始化它
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    /**
     * 将父类中存在的属性依次复制到子类中
     */
    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 'component', 'directive', 'filter'
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor 缓存构造函数
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

/**
 * 初始化props（将key代理到_props中）
 * vm.name ==> Sub.prototype._props.name
 */
function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

/**
 * 初始化computed
 */
function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
