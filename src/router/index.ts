import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('@/pages/Dashboard.vue'),
        meta: { title: 'Dashboard' }
    },
    {
        path: '/stream/:src',
        name: 'StreamPlayer',
        component: () => import('@/pages/StreamPlayer.vue'),
        meta: { title: 'Stream Player' }
    },
    {
        path: '/add',
        name: 'AddStream',
        component: () => import('@/pages/AddStream.vue'),
        meta: { title: 'Add Stream' }
    },
    {
        path: '/config',
        name: 'Config',
        component: () => import('@/pages/Config.vue'),
        meta: { title: 'Configuration' }
    },
    {
        path: '/logs',
        name: 'Logs',
        component: () => import('@/pages/Logs.vue'),
        meta: { title: 'Logs' }
    },
    {
        path: '/network',
        name: 'Network',
        component: () => import('@/pages/Network.vue'),
        meta: { title: 'Network' }
    },
    {
        path: '/links/:src',
        name: 'StreamLinks',
        component: () => import('@/pages/StreamLinks.vue'),
        meta: { title: 'Stream Links' }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, _from, next) => {
    document.title = `${to.meta.title || 'go2rtc'} - go2rtc`
    next()
})

export default router
