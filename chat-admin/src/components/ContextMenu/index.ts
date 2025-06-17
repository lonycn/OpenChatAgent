import ContextMenu from './src/ContextMenu.vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export type { ContextMenuSchema } from './src/types'

export interface ContextMenuExpose {
  elDropdownMenuRef: ComponentRef<typeof ElDropdown>
  tagItem: RouteLocationNormalizedLoaded
}

export { ContextMenu }
