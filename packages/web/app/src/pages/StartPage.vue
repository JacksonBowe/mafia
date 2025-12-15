<template>
	<q-page class="flex flex-center q-pa-lg">
		<MCard class="login-card q-pa-lg">
			<div class="q-gutter-y-sm">
				<div class="text-overline text-mafia text-weight-bold">MAFIA</div>

				<div class="text-h5 text-white">Informed Minority</div>

				<div class="text-body2 text-grey-5">
					A quick web version of the <span class="text-mafia">Mafia</span> party game.
				</div>

				<q-separator dark class="q-my-md" />

				<q-btn
					class="discord-color custom-shadow text-white full-width"
					label="Login with Discord"
					icon="fa-brands fa-discord"
					push
					glossy
					@click="start"
				/>
			</div>
		</MCard>
	</q-page>
</template>

<script setup lang="ts">
import MCard from 'src/components/ui/Card/MCard.vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const start = async () => {
	// If your auth guard sets ?redirect=/somewhere, respect it.
	// Otherwise go to a known private route (or '/')
	const redirect = (route.query.redirect as string | undefined) ?? '/';
	await router.replace(redirect);
};
</script>

<style scoped>
.login-card {
	width: min(480px, 92vw);
}

/* keep your existing styling */
.discord-color {
	background-color: #7289da;
}

.custom-shadow {
	box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.3);
}
</style>
