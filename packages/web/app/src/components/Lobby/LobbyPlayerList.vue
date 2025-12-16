<template>
	<q-scroll-area class="fit">
		<div class="q-pa-sm">
			<slot name="header" />

			<q-list :separator="separator" :bordered="bordered" class="rounded-borders" :dense="dense">
				<q-item v-if="!members?.length" class="text-grey-6">
					<q-item-section>
						<q-item-label>No players yet</q-item-label>
						<q-item-label caption>Waiting for people to join…</q-item-label>
					</q-item-section>
				</q-item>

				<q-item
					v-for="m in members"
					:key="m.id"
					:clickable="clickable"
					:active="selectedId === m.id"
					active-class="member-item--active"
					@click="onClick(m)"
				>
					<q-item-section avatar v-if="showAvatar">
						<q-avatar size="28px" class="member-avatar">
							{{ initials(m.name) }}
						</q-avatar>
					</q-item-section>

					<q-item-section>
						<q-item-label class="ellipsis">{{ m.name }}</q-item-label>
					</q-item-section>

					<q-item-section side v-if="$slots.side">
						<slot name="side" :member="m" />
					</q-item-section>
				</q-item>
			</q-list>
		</div>
	</q-scroll-area>
</template>

<script setup lang="ts">
import type { RelatedEntity } from '@mafia/core/db/types';

const props = withDefaults(
	defineProps<{
		members: RelatedEntity[];
		dense?: boolean;
		separator?: boolean;
		bordered?: boolean;
		clickable?: boolean;
		selectedId?: string | null;
		showAvatar?: boolean;
	}>(),
	{
		dense: true,
		separator: true,
		bordered: false,
		clickable: false,
		selectedId: null,
		showAvatar: true,
	},
);

const emit = defineEmits<{
	(e: 'memberClick', member: RelatedEntity): void;
}>();

function onClick(member: RelatedEntity) {
	if (!props.clickable) return;
	emit('memberClick', member);
}

function initials(name: string) {
	const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] ?? '?';
	const second = parts[1]?.[0] ?? '';
	return (first + second).toUpperCase();
}
</script>

<style scoped lang="scss">
.member-avatar {
	background: rgba(125, 82, 210, 0.25);
	border: 1px solid rgba(203, 182, 245, 0.18);
	color: rgba(255, 255, 255, 0.92);
}

.member-item--active {
	background: rgba(125, 82, 210, 0.12);
}
</style>
