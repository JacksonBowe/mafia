<template>
	<MCard>
		<MCardHeader title="Your Role" :subtitle="roleName" :separated="false" />
		<MCardContent>
			<div class="q-gutter-y-xs">
				<div v-for="(value, key) in config" :key="key" class="text-body2">
					<span class="text-grey-4">{{ key }}:</span> {{ value }}
				</div>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';

withDefaults(
	defineProps<{
		roleName?: string;
		config?: Record<string, string>;
	}>(),
	{
		roleName: 'Unknown',
		config: () => ({}),
	},
);
</script>
