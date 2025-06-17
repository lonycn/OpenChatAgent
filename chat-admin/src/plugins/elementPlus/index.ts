import type { App } from 'vue'

// 需要全局引入一些组件，如ElScrollbar，不然一些下拉项样式有问题
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { ClickOutside } from 'element-plus'

export const setupElementPlus = (app: App<Element>) => {
  // 使用完整引入方式
  app.use(ElementPlus)

  // 注册指令
  app.directive('click-outside', ClickOutside)
}
