<template>
	<q-page class="row justify-center content-center">
		<q-btn
			class="discord-color custom-shadow text-white"
			label="Login with Discord"
			icon="fa-brands fa-discord"
			push
			glossy
			@click="login"
		/>
	</q-page>
</template>

<!-- <script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
	name: 'AuthPage',
});
</script> -->

<script setup lang="ts">
import { authorizeDiscord } from 'src/api/auth';

const login = async () => {
	console.log('Redirecting to discord');
	const r = await authorizeDiscord();
	window.location.href = r.uri;
};
</script>

<style scoped>
.discord-color {
	background-color: #7289da;
}

.custom-shadow {
	box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.3);
}

.gradient-bg {
	background-image: linear-gradient(
		to right,
		rgba(0, 0, 0, 0),
		rgba(17, 19, 34, 0.7),
		rgba(17, 19, 34, 0.8),
		rgba(17, 19, 34, 0.9),
		rgba(17, 19, 34, 1)
	);
}
</style>
