<template>
  <q-page class="row items-center justify-evenly">
	<!-- <q-card flat> -->
      <!-- <q-card-section> -->
        <!-- <div class="text-subtitle2">Verifying...</div> -->
      <!-- </q-card-section> -->
    <!-- </q-card> -->
  </q-page>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { fetchTokensDiscord } from 'src/api/auth'
import { useAuthStore } from 'src/stores/auth';
import { useQuasar, QSpinnerGears } from 'quasar';

const q = useQuasar()
const route = useRoute()
const router = useRouter()

const aStore = useAuthStore()

onMounted(async () => {
	q.loading.show({
		message: 'Loading profile...',
		spinner: QSpinnerGears,
	})

	try {
		const tokens = await fetchTokensDiscord(route.query.code as string);
		aStore.authenticate(tokens)
		router.push('/home')

	} catch (error) {
		console.log('RETURNING TO AUTH')
		router.push('/auth')
	}

	q.loading.hide()
})

</script>
