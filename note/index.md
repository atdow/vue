<!--
 * @Author: atdow
 * @Date: 2022-02-10 21:36:03
 * @LastEditors: null
 * @LastEditTime: 2022-03-07 21:49:01
 * @Description: file description
-->
## 变化侦听
```js
function defineReactive(data, key, val){
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function(){
      // 收集依赖
      return val;
    },
    set: function(newVal){
      // 触发依赖
      if(val === newVal){
        val = newVal;
      }
    }
  })
}
```
> 在getter中收集依赖（用到对应变量的地方），在setter中触发依赖

依赖收集过程
![依赖收集](./img/depCollection.png)

Watcher构造函数读取了数据，触发了defineProperty的getter，触发依赖收集，将当前Watcher收集到Dep中；Watcher可以主动去订阅任意一个数据的变化

```js
delete this.obj.name
this.obj.__ob__.notify()
```

### 虚拟DOM

虚拟DOM的解决方法是通过状态生成一个虚拟节点树，然后使用虚拟节点树进行渲染。在渲染之前，会使用新生成的虚拟节点树和上一次生成的虚拟节点树进行比较，只渲染不同的部分。虚拟节点树其实是由组件树建立起来的整个虚拟节点。

模板（编译）==> 渲染函数（执行）==> 虚拟DOM（更新）==> 视图

删除节点：替换的过程是将新创建的DOM节点插入到旧节点的旁边，然后将旧节点删除，从而完成替换的过程。

当oldVnode不存在时，直接使用vnode渲染视图；当oldVnode和vnode都存在但并不是同一个节点时，使用vnode创建的DOM元素替换旧的DOM元素；当oldVnode和vnode是同一个节点时，使用更详细的对比操作对真实的DOM节点进行更新。

跨平台渲染的本质就是在设计框架的时候，要让框架的渲染机制和DOM解耦。

创建子节点：插入到oldChildren中所有未处理节点的前面.
更新子节点：
移动子节点：把需要移动的节点移动到所有未处理节点的最前面。
删除子节点：当newChildren中的所有节点都被循环了一遍后，也就是循环结束后，如果oldChildren中还有剩余的没有被处理的节点，那么这些节点就是被废弃、需要删除的节点。

### 编译原理

渲染函数的作用是：每次执行它，它会使用当前最新的状态生成一份新的vnode，然后使用这个vnode进行渲染
- 将模板解析为AST(解析器)
- 遍历AST标记静态节点（优化器）
- 使用AST生成渲染函数（代码生成器）

解析器
- HTML解析器
- 文本解析器
- 过滤器解析器


```js
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // 将回调函数添加到callbacks中
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // 只推一次（在一次事件循环中调用了两次nextTick，只有第一次才会将任务推进任务队列，第二次只会改变callbacks，因为中执行的是callbacks）
  if (!pending) {
    pending = true // 标记已经推进
    timerFunc()
  }
  /**
   * 如果没有提供回调且在支持Promise的环境中，则返回一个Promise
   * this.$nextTick().then((ctx)=>{
   *  // dom更新了
   * })
   */
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
```