<template>
  <q-page class="row items-center justify-evenly">
    <q-btn class="discord-color"  label="Login with Discord" icon="email" @click="login"/>
  </q-page>
</template>

<script setup lang="ts">
import { api } from 'boot/axios'
import { authorizeDiscord } from 'src/lib/api/auth'


const login = async () => {
	console.log("Redirecting to discord")
	const r = await authorizeDiscord()
	window.location.href = r.uri
}
</script>

<style scoped>

.discord-color {
	background-color: #7289da;
}
</style>
