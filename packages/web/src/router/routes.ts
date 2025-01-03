import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
	{
		path: '/auth',
		component: () => import('layouts/AuthLayout.vue'),
		children: [
			{
				path: '',
				component: () => import('pages/AuthPage.vue'),
				meta: { requiresAuth: false },
			},
			{
				path: 'discord/callback',
				component: () => import('pages/PostAuthPage.vue'),
				meta: { requiresAuth: false },
			},
		],
	},
	{
		path: '/game',
		component: () => import('layouts/GameLayout.vue'),
		children: [
			{ path: '', component: () => import('pages/GamePage.vue') },
		],
	},
	{
		path: '',
		component: () => import('layouts/MainLayout.vue'),
		children: [
			{ path: 'home', component: () => import('pages/HomePage.vue') },
		],
	},

	// Always leave this as last one,
	// but you can also remove it
	{
		path: '/:catchAll(.*)*',
		component: () => import('pages/ErrorNotFound.vue'),
	},
];

export default routes;
