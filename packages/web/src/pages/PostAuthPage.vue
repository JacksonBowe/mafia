<template>
  <q-page class="row items-center justify-evenly">
	<q-card flat>
      <q-card-section>
        <div class="text-subtitle2">Beep boop, verifying...</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { api } from 'boot/axios'
import { useRoute, useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { LocalStorage } from 'quasar';

const route = useRoute()
const router = useRouter()



onMounted(async () => {
	console.log('fetching tokens')
	const r = await api.get('/auth/token/discord', {
		params: {
			code: route.query.code
		}
	})

	api.defaults.headers.common = {
		'Authorization': `Bearer ${r.data.AccessToken}`
	}

	LocalStorage.set('mtokens', r.data)

	router.push('/home')
})

</script>
