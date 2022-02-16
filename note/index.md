<!--
 * @Author: atdow
 * @Date: 2022-02-10 21:36:03
 * @LastEditors: null
 * @LastEditTime: 2022-02-16 22:34:25
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


