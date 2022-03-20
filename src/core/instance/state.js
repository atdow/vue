/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

// 默认属性描述符
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * 代理
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  /**
   * 用来保存当前组件中所有的watcher实例。无论是使用vm.$watch注册的watcher实例还是使用
   * watch选项添加的watcher实例，都会添加到vm._watchers中
   */
  vm._watchers = []
  const opts = vm.$options
  // 先初始化props，后初始化data，这样就可以在data中使用props中的数据了
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  // 最后初始化watch，这样在watch中就既可以观察props，也可以使观察data
  // opts.watch !== nativeWatch：watch选项不等于浏览器原生的watch时，因为Firefox浏览器中的Object.prototype上有一个watch
  // 方法，当用户没有设置watch时，在Firefox浏览器下的opts.watch将是Object.prototype.watch，所以通过这样的语句可以避免这种问题
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

/**
 * 初始化props
 * Vue.js内部通过子组件的props选项将需要的数据筛选出来之后添加到子组件的上下文中
 *
 * 通过规格化之后的props从其父组件传入的props数据中或new创建实例时传入的propsData参数中，筛选出需要的数据保存在vm._porps中，
 * 然后在vm上设置一个代理，实现通过vm.x访问vm._props.x的目的
 * @param {*} vm
 * @param {*} propsOptions 规格化之后的props选项
 */
/**
 *

 */
function initProps (vm: Component, propsOptions: Object) {
  // 通过父组件传入或用户通过propsData传入的真实props数据
  const propsData = vm.$options.propsData || {}
  // 指向vm._props的指针，也就是所有设置到props变量中的属性最终都会保存到vm._props中
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  // 指向vm.$options._propKeys的指针，其作用是缓存props对象中的key，将来更新props时只需要遍历vm.$options._propKeys数据即可得到所有的props的key
  const keys = vm.$options._propKeys = []
  // 当前组件是否是根组件
  const isRoot = !vm.$parent
  // root instance props should be converted
  // 如果是根组件则不需要将props转换成响应式数据
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm) // 检验prop是否合法，并将propsData[key]返回
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value) // 通过defineReactive将value设置到vm._props上
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 如果key不在vm上，则调用proxy，在vm上设置一个以key为属性的代理，当使用vm[key]访问数据时，其实访问的是vm_props[key]
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

/**
 * 初始化data
 */
function initData (vm: Component) {
  let data = vm.$options.data
  // 判断data是不是函数，如果是函数，则需要执行函数并将返回值赋值给变量data和vm_data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  // 如果最后的data不是对象，将data设置为默认值空对象，并警告
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    // 如果data中的变量和methods中的方法同名定义了，警告
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    // 如果data中的变量和props中的变量同名定义了，警告
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) { // 如果data中的某个key与methods发生了重复，依然会将data代理到实例中；但如果与props发生了重复，则不会将data代理到实例中
      proxy(vm, `_data`, key) // 设置代理，实现vm.xxx来方法vm._data.xxx
    }
  }
  // observe data 将数据转换成响应式
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

/**
 * 初始化computed
 */
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null) // vm._computedWatchers:保存计算属性的所有watcher属性
  // computed properties are just getters during SSR
  // 计算属性在SSR环境中，只是一个普通的getter函数
  const isSSR = isServerRendering() // 判断是不是ssr环境

  for (const key in computed) {
    const userDef = computed[key] // 用户设置的计算属性定义
    const getter = typeof userDef === 'function' ? userDef : userDef.get // 如果是函数，则作为getter;如果是对象，则取对象的get作为getter
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    // 在非SSR环境中，为计算属性创建内部观察器
    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop, // 第二参数为用户设置的计算属性
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // 只有与data和props重名时，才会打印警告；如果与methods重名，计算属性会悄悄失效
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

/**
 * 在target定义一个key属性，属性的getter和setter根据userDef的值来设置
 * @param {*} target vm
 * @param {*} key
 * @param {*} userDef
 */
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  // shouldCache：判断computed是否应该有缓存(只有非服务器渲染环境下，计算属性才有缓存)
  const shouldCache = !isServerRendering() // isServerRendering：判断是否是服务器渲染环境
  // 如果是函数，则将函数理解为getter函数
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key) // createComputedGetter：设置为计算属性的getter函数，那么计算属性将具备缓存和观察计算属性依赖数据的变化等响应式功能
      : createGetterInvoker(userDef) // createGetterInvoker：普通的getter函数，当计算属性中所使用的数据发生变化时，计算属性的watcher也不会得到任何通知，使用计算属性的watcher也不会得到任何通知（通常在服务端渲染环境下生效）
    sharedPropertyDefinition.set = noop // 用户没有设置setter函数，则将set设置为noop空函数
  } else { // 如果是对象，则将对象的get方法作为getter方法，set方法作为setter方法
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false // 如果shouldCache为true并且用户没有明确设置userDef.cache为false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  // 如果用户没有设置set函数，但是修改了数据，将会打印警告
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    // 用户没有设置set函数时，将set设置成打印警告函数
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition) // 将计算属性设置到vm上
}

/**
 * 创建computed的getter
 */
function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key] // this._computedWatchers保存了所有计算属性的watcher实例
    if (watcher) {
      /**
       * 这里实现了computed的缓存功能：每当计算属性所依赖的状态发生了变化时，会将watcher.dirty设置为true，这样下一次读取计算属性时，
       * 会发现watcher.dirty为true，此时会重新计算返回值，否则就直接使用之前的计算结果
       */
      if (watcher.dirty) { // watcher.dirty属性用于标识计算属性的返回值是否有变化
        watcher.evaluate() // 如果watcher.dirty===true，则重新计算computed的值
      }
      /**
       * 将读取计算属性的那个Watcher添加到计算属性所依赖的所有状态的依赖列表中，也就是让读取计算属性的Watcher持续观察计算属性所依赖的状态的变化
       */
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

/**
 * 初始化method
 */
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      // methods中的某个方法之后key没有value时，警告
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      // 如果methods中的方法在props中已经声明过了，警告
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      // 如果methods中的某个方法已经存在于vm中，并且方法是否以$或_开头，警告
      if ((key in vm) && isReserved(key)) { // isReserved(key)：判断方法是否以$或_开头
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm) // this.xxx
  }
}

/**
 * 初始化watch
 * @param {*} vm
 * @param {*} watch opts.watch 用户设置的watch对象
 */
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    /**
     * 如果是数据，就遍历
     * watch: {
     *    a: [
     *      function handler1(){},
     *      function handler2(){}
     *    ]
     * }
     */
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}
/**
 * 处理其他类型的handler并调用vm.$watch创建Watcher观察表达式
 * @param {*} vm // this
 * @param {*} expOrFn // 表达式或计算属性函数
 * @param {*} handler // watch对象的值
 * @param {*} options // 用于传递给vm.$watch的选项对象
 * @returns
 */
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  /**
   * 如果是对象
   * watch: {
   *    a: {
   *      handler: function(){}
   *    }
   * }
   */
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  /**
   * 如果是字符串
   * watch: {
   *    a: "handlerMethod"
   * }
   */
  if (typeof handler === 'string') {
    handler = vm[handler] // this.handler
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value) // 立即执行
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    return function unwatchFn () {
      watcher.teardown() // 把watcher实例从当前正在观察的状态依赖的列表中移除
    }
  }
}
