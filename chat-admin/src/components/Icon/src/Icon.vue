<script setup lang="ts">
import { computed, unref } from 'vue'
import { propTypes } from '@/utils/propTypes'
import { useDesign } from '@/hooks/web/useDesign'
import { Icon } from '@iconify/vue'
import { ICON_PREFIX } from '@/constants'

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('icon')

const props = defineProps({
  // icon name
  icon: propTypes.string,
  // icon color
  color: propTypes.string,
  // icon size
  size: propTypes.number.def(16),
  hoverColor: propTypes.string
})

const isLocal = computed(() => props.icon?.startsWith('svg-icon:') || false)

const symbolId = computed(() => {
  return unref(isLocal) ? `#icon-${props.icon.split('svg-icon:')[1]}` : props.icon
})

// 是否使用在线图标
const isUseOnline = computed(() => {
  return import.meta.env.VITE_USE_ONLINE_ICON === 'true'
})

const getIconifyStyle = computed(() => {
  const { color, size } = props
  return {
    fontSize: `${size}px`,
    color
  }
})

const getIconName = computed(() => {
  return props.icon?.startsWith(ICON_PREFIX)
    ? props.icon.replace(ICON_PREFIX, '')
    : props.icon || ''
})
</script>

<template>
  <ElIcon :class="prefixCls" :size="size" :color="color">
    <svg v-if="isLocal" aria-hidden="true">
      <use :xlink:href="symbolId" />
    </svg>

    <template v-else>
      <Icon v-if="isUseOnline" :icon="getIconName" :style="getIconifyStyle" />
      <div v-else :class="`${icon} iconify`" :style="getIconifyStyle"></div>
    </template>
  </ElIcon>
</template>

<style lang="less" scoped>
@prefix-cls: ~'@{adminNamespace}-icon';

.@{prefix-cls},
.iconify {
  :deep(svg) {
    &:hover {
      // stylelint-disable-next-line
      color: v-bind(hoverColor) !important;
    }
  }
}

.iconify {
  &:hover {
    // stylelint-disable-next-line
    color: v-bind(hoverColor) !important;
  }
}
</style>
