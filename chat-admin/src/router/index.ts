import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { App } from 'vue'
import { Layout } from '@/utils/routerHelper'
import { useI18n } from '@/hooks/web/useI18n'

const { t } = useI18n()

export const constantRouterMap: AppRouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard/index',
    name: 'Root',
    meta: {
      hidden: true
    }
  },
  {
    path: '/redirect',
    component: Layout,
    name: 'RedirectWrap',
    children: [
      {
        path: '/redirect/:path(.*)',
        name: 'Redirect',
        component: () => import('@/views/Redirect/Redirect.vue'),
        meta: {}
      }
    ],
    meta: {
      hidden: true,
      noTagsView: true
    }
  },
  {
    path: '/login',
    component: () => import('@/views/Login/Login.vue'),
    name: 'Login',
    meta: {
      hidden: true,
      title: t('router.login'),
      noTagsView: true
    }
  },
  {
    path: '/personal',
    component: Layout,
    redirect: '/personal/personal-center',
    name: 'Personal',
    meta: {
      title: t('router.personal'),
      hidden: true,
      canTo: true
    },
    children: [
      {
        path: 'personal-center',
        component: () => import('@/views/Personal/PersonalCenter/PersonalCenter.vue'),
        name: 'PersonalCenter',
        meta: {
          title: t('router.personalCenter'),
          hidden: true,
          canTo: true
        }
      }
    ]
  },
  {
    path: '/404',
    component: () => import('@/views/Error/404.vue'),
    name: 'NoFind',
    meta: {
      hidden: true,
      title: '404',
      noTagsView: true
    }
  }
]

export const asyncRouterMap: AppRouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: Layout,
    redirect: '/dashboard/index',
    name: 'Dashboard',
    meta: {
      title: '仪表板',
      icon: 'vi-ant-design:dashboard-filled'
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/Dashboard/index.vue'),
        name: 'DashboardIndex',
        meta: {
          title: '数据概览',
          noCache: true,
          affix: true
        }
      }
    ]
  },
  {
    path: '/conversations',
    component: Layout,
    redirect: '/conversations/index',
    name: 'Conversations',
    meta: {
      title: '会话管理',
      icon: 'vi-ep:chat-dot-round'
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/conversations/index.vue'),
        name: 'ConversationsIndex',
        meta: {
          title: '会话列表',
          noCache: true
        }
      }
    ]
  },
  {
    path: '/users',
    component: Layout,
    redirect: '/users/index',
    name: 'Users',
    meta: {
      title: '用户管理',
      icon: 'vi-ep:user'
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/users/index.vue'),
        name: 'UsersIndex',
        meta: {
          title: '用户列表',
          noCache: true
        }
      }
    ]
  },
  {
    path: '/customers',
    component: Layout,
    redirect: '/customers/index',
    name: 'Customers',
    meta: {
      title: '客户管理',
      icon: 'vi-ep:user-filled'
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/customers/index.vue'),
        name: 'CustomersIndex',
        meta: {
          title: '客户列表',
          noCache: true
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  strict: true,
  routes: [...constantRouterMap, ...asyncRouterMap] as RouteRecordRaw[],
  scrollBehavior: () => ({ left: 0, top: 0 })
})

export const resetRouter = (): void => {
  const resetWhiteNameList = ['Redirect', 'Login', 'NoFind', 'Root']
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (name && !resetWhiteNameList.includes(name as string)) {
      router.hasRoute(name) && router.removeRoute(name)
    }
  })
}

export const setupRouter = (app: App<Element>) => {
  app.use(router)
}

export default router
