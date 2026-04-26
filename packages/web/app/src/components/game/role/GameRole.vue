<template>
	<MCard>
		<MCardHeader title="Your Role" :subtitle="roleName ?? 'Unknown'" :separated="false" />
		<MCardContent>
			<div class="q-gutter-y-xs">
				<div v-for="(value, key) in settings" :key="key" class="text-body2">
					<span class="text-grey-4">{{ key }}:</span> {{ value }}
				</div>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import type { RoleName, RoleSettings } from '@mafia/sdk';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';

withDefaults(
	defineProps<{
		roleName: RoleName;
		settings: RoleSettings['settings'];
	}>(),
	{},
);
</script>
