<template>
	<MCard class="jury-card">
		<MCardHeader title="On Trial" :subtitle="playerLabel" :separated="false" />
		<MCardContent>
			<div class="text-body2 text-grey-3">Vote guilty or innocent when trial begins.</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';

withDefaults(
	defineProps<{
		playerLabel?: string;
	}>(),
	{
		playerLabel: 'Unknown',
	},
);
</script>

<style scoped>
.jury-card {
	min-width: 240px;
}
</style>
