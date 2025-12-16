<template>
	<q-scroll-area class="fit">
		<div class="q-pa-sm">
			<slot name="header" />

			<q-list :separator="separator" :bordered="bordered" class="rounded-borders" :dense="dense">
				<q-item v-if="!members?.length" class="text-grey-6">
					<q-item-section>
						<q-item-label>No players yet</q-item-label>
						<q-item-label caption> Waiting for people to join… </q-item-label>
					</q-item-section>
				</q-item>

				<LobbyPlayerListItem
					v-for="m in members"
					:key="m.id"
					:member="m"
					:host="host"
					:clickable="clickable"
					:active="selectedId === m.id"
					@click="onClick"
				>
					<template v-if="$slots.side" #side="{ member }">
						<slot name="side" :member="member" />
					</template>
				</LobbyPlayerListItem>
			</q-list>
		</div>
	</q-scroll-area>
</template>

<script setup lang="ts">
import type { RelatedEntity } from '@mafia/core/db/types';
import LobbyPlayerListItem from './LobbyPlayerListItem.vue';

const props = withDefaults(
	defineProps<{
		members: RelatedEntity[];
		host: RelatedEntity | null;
		dense?: boolean;
		separator?: boolean;
		bordered?: boolean;
		clickable?: boolean;
		selectedId?: string | null;
	}>(),
	{
		dense: true,
		separator: true,
		bordered: false,
		clickable: false,
		selectedId: null,
	},
);

const emit = defineEmits<{
	(e: 'memberClick', member: RelatedEntity): void;
}>();

function onClick(member: RelatedEntity) {
	if (!props.clickable) return;
	emit('memberClick', member);
}
</script>
