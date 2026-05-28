<template>
	<MCard>
		<MCardHeader :title="meta?.name ?? 'Unknown Role'" :subtitle="meta?.description" :separated="false" />
		<MCardContent>
			<div v-if="meta" class="q-gutter-y-sm">
				<div class="row q-gutter-xs">
					<QChip
						v-for="tag in meta.tags"
						:key="tag"
						dense
						color="grey-8"
						text-color="white"
						:label="tag"
					/>
				</div>
				<div v-if="hasSettings" class="q-gutter-y-xs">
					<div class="text-caption text-grey-5">Settings</div>
					<div v-for="(value, key) in settings" :key="key" class="text-body2">
						<span class="text-grey-4">{{ key }}:</span> {{ value }}
					</div>
				</div>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { ROLE_META, type RoleName, type RoleSettings } from '@mafia/sdk';
import { QChip } from 'quasar';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		roleName: RoleName;
		settings?: RoleSettings['settings'];
	}>(),
	{
		settings: () => ({}),
	},
);

const meta = computed(() => ROLE_META[props.roleName]);
const hasSettings = computed(() => Object.keys(props.settings ?? {}).length > 0);
</script>
