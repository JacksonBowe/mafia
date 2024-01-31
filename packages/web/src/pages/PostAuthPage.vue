<template>
  <q-page class="row items-center justify-evenly">
    Ayo you're here now
  </q-page>
</template>

<script setup lang="ts">
import { api } from 'boot/axios'
import { useRoute } from 'vue-router';
import { onMounted } from 'vue';

const route = useRoute()

console.log(route)


onMounted(async () => {
	console.log('fetching tokens')
	const r = await api.get('/auth/token/discord', {
		params: {
			code: route.query.code
		}
	})

	console.log(r)

	api.defaults.headers.common = {
		'Authorization': `Bearer ${r.data.AccessToken}`
	}

	
})

</script>
