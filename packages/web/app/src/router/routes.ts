import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: () => import('layouts/MainLayout.vue'),
        meta: { requiresAuth: true },
        children: [{ path: '', component: () => import('pages/MainPage.vue') }],
    },

    {
        path: '/start',
        component: () => import('src/layouts/StartLayout.vue'),
        children: [{ path: '', component: () => import('src/pages/StartPage.vue') }],
    },

    // Always leave this as last one,
    // but you can also remove it
    {
        path: '/:catchAll(.*)*',
        component: () => import('pages/ErrorNotFound.vue'),
    },
];

export default routes;
