import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false
  }),

  getters: {
    doubleCount (state) {
      return
    }
  },

  actions: {
    setAuthenticated () {
      this.isAuthenticated = true;
    }
  }
});
