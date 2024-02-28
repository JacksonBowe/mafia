import { defineStore } from 'pinia';
import { LocalStorage } from 'quasar';
import { api } from 'src/boot/axios';
import type { AccessTokenResponse } from '../lib/api/auth';

export const useAuthStore = defineStore('auth', {
	state: () => ({
		isAuthenticated: false
	}),

	getters: {
		accessToken () {
			if (LocalStorage.has('mtokens')) {
				return (LocalStorage.getItem('mtokens') as AccessTokenResponse).AccessToken;
			} else {
				return null
			}
		},
		refreshToken () {
			if (LocalStorage.has('mtokens')) {
				return (LocalStorage.getItem('mtokens') as AccessTokenResponse).RefreshToken;
			} else {
				return null
			}
		}
	},

	actions: {
		setAuthenticated () {
			this.isAuthenticated = true;
		},
		authenticate (tokens: AccessTokenResponse) {
			console.log('TOKIES', tokens)
			LocalStorage.set('mtokens', tokens);
			this.setAuthenticated();

			// Set the default headers
			api.defaults.headers.common = {
				'Authorization': `Bearer ${tokens.AccessToken}`
			};
		},
		doLogout () {
			LocalStorage.remove('mtokens');
			this.isAuthenticated = false;
			this.router.push('/auth');
		}
	}
});
