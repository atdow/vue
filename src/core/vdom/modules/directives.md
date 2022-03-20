<!--
 * @Author: atdow
 * @Date: 2022-03-20 19:29:36
 * @LastEditors: null
 * @LastEditTime: 2022-03-20 19:35:37
 * @Description: file description
-->

|名称|触发时机|
|--|--|
|init|已添加vnode，在修补期间发现新的虚拟节点时触发|
|create|已经基于VNode创建了DOM元素|
|activated|keepAlive组件被创建|
|insert|一旦vnode对应的DOM元素被插入到视图中并且修补周期的其余部分已经完成，就会触发|
|prepatch|一个元素即将被修补|
|update|一个元素正在被更新|
|postpatch|一个元素已经被修补|
|destroy|它的DOM元素从DOM中移除时或它的父元素从DOM中移除时触发|
|remove|vnode对应的DOM元素从DOM中被移除时触发此钩子函数。需要说明的是，只有一个元素从父元素中被移除时会触发，但是如果它是被移除的元素的子项，则不会触发|
