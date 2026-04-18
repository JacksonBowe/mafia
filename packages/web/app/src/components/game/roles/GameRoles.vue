<template>
	<MCard>
		<MCardHeader title="Roles" :separated="false" />
		<MCardContent>
			<div class="q-gutter-y-xs">
				<!-- <div v-for="n in totalSlots" :key="n" class="text-body2 text-grey-4">-</div> -->
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';

withDefaults(
	defineProps<{
		totalSlots?: number;
	}>(),
	{
		totalSlots: 15,
	},
);
</script>
