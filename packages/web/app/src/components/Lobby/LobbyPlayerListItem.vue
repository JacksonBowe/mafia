<template>
	<q-item
		:clickable="clickable"
		:active="active"
		active-class="member-item--active"
		class="member-item"
		@click="onClick"
	>
		<!-- Host indicator column (always reserved) -->
		<q-item-section avatar class="host-slot">
			<div class="host-badge" :class="{ 'host-badge--on': isHost }">
				<q-icon v-if="isHost" name="fa-solid fa-crown" size="12px" class="host-icon" />
			</div>
		</q-item-section>

		<!-- Main content -->
		<q-item-section class="member-main">
			<q-item-label class="member-name ellipsis">
				{{ member.name }}
			</q-item-label>
		</q-item-section>

		<!-- Optional side slot -->
		<q-item-section side v-if="$slots.side" class="member-side">
			<slot name="side" :member="member" />
		</q-item-section>

		<!-- Subtle active indicator -->
		<div class="active-rail" aria-hidden="true" />
	</q-item>
</template>

<script setup lang="ts">
import type { RelatedEntity } from '@mafia/core/db/types';
import { computed } from 'vue';

const props = defineProps<{
	member: RelatedEntity;
	host: RelatedEntity | null;
	clickable?: boolean;
	active?: boolean;
}>();

const emit = defineEmits<{
	(e: 'click', member: RelatedEntity): void;
}>();

const isHost = computed(() => props.host?.id === props.member.id);

function onClick() {
	if (!props.clickable) return;
	emit('click', props.member);
}
</script>

<style scoped lang="scss">
.member-item {
	position: relative;
	border-radius: 10px;
	padding: 8px 10px;
	margin: 6px 0;

	/* Slight “lift” without going full glass */
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.05);

	transition:
		background 120ms ease,
		border-color 120ms ease,
		transform 120ms ease;
}

.member-item:hover {
	background: rgba(255, 255, 255, 0.045);
	border-color: rgba(203, 182, 245, 0.16);
	transform: translateY(-1px);
}

.host-slot {
	width: 36px;
	min-width: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.host-badge {
	width: 22px;
	height: 22px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;

	/* reserved space look, even when not host */
	background: rgba(255, 255, 255, 0.035);
	border: 1px solid rgba(255, 255, 255, 0.06);
}

.host-badge--on {
	background: rgba(125, 82, 210, 0.18);
	border-color: rgba(203, 182, 245, 0.22);
	box-shadow: 0 0 0 4px rgba(125, 82, 210, 0.08);
}

.host-icon {
	color: rgba(203, 182, 245, 0.95);
}

.member-main {
	min-width: 0; /* keep ellipsis working */
}

.member-name {
	font-weight: 600;
	color: rgba(255, 255, 255, 0.92);
	letter-spacing: 0.1px;
}

.member-sub {
	margin-top: 2px;
	color: rgba(203, 182, 245, 0.78);
	min-height: 16px; /* keeps row height consistent */
}

.member-side {
	margin-left: 8px;
}

/* Right-side active rail (looks “intentional”) */
.active-rail {
	position: absolute;
	top: 8px;
	bottom: 8px;
	right: 6px;
	width: 3px;
	border-radius: 999px;
	background: transparent;
}

.member-item--active {
	background: rgba(125, 82, 210, 0.1);
	border-color: rgba(203, 182, 245, 0.18);
}

.member-item--active .active-rail {
	background: rgba(203, 182, 245, 0.65);
}
</style>
