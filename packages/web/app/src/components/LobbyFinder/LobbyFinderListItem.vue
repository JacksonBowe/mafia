<template>
	<q-item
		clickable
		:active="selected"
		active-class="lobby-item--active"
		class="lobby-item q-pa-sm"
		:class="backgroundColor"
		role="button"
		tabindex="0"
		@click="onPreview"
		@keyup.enter="onPreview"
		@keyup.space.prevent="onPreview"
	>
		<q-item-section>
			<!-- Title row -->
			<div class="row items-center no-wrap">
				<q-item-label class="lobby-item__title ellipsis">
					<span class="lobby-item__index">{{ index + 1 }}.</span>
					<span class="lobby-item__name">{{ lobby.name }}</span>
				</q-item-label>

				<q-space />

				<!-- Status chip -->
				<q-chip
					dense
					square
					class="lobby-item__chip"
					:class="isFull ? 'lobby-item__chip--full' : 'lobby-item__chip--open'"
					:text-color="isFull ? 'grey-4' : 'white'"
				>
					{{ isFull ? 'Full' : 'Open' }}
				</q-chip>
			</div>

			<!-- Meta row -->
			<div class="row items-center q-mt-xs">
				<q-item-label caption class="lobby-item__meta">
					Players: {{ memberCount }} / {{ MAX_PLAYERS }}
				</q-item-label>

				<q-space />

				<q-item-label caption class="lobby-item__meta"> {{ occupancyPct }}% </q-item-label>
			</div>

			<!-- Progress -->
			<q-linear-progress
				class="lobby-item__progress q-mt-xs"
				:value="occupancy"
				track-color="white"
			/>
		</q-item-section>

		<!-- Right side actions -->
		<q-item-section side class="items-end">
			<q-btn
				flat
				dense
				no-caps
				padding="xs sm"
				class="lobby-item__join"
				:disable="isFull"
				@click.stop="onJoin"
				icon="chevron_right"
			/>
			<!-- <q-icon name="chevron_right" size="18px" class="lobby-item__chev" /> -->
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import type { LobbyInfo } from '@mafia/core/lobby/index';
import { computed } from 'vue';

const props = defineProps<{
	lobby: LobbyInfo;
	index: number;
	selected?: boolean;
	maxPlayers?: number;
}>();

const emit = defineEmits<{
	(e: 'preview', lobby: LobbyInfo): void;
	(e: 'join', lobby: LobbyInfo): void;
}>();

const MAX_PLAYERS = 15;
const memberCount = computed(() => props.lobby.members?.length ?? 0);

const isFull = computed(() => memberCount.value >= MAX_PLAYERS);
const occupancy = computed(() =>
	MAX_PLAYERS <= 0 ? 0 : Math.min(1, memberCount.value / MAX_PLAYERS),
);
const occupancyPct = computed(() => Math.round(occupancy.value * 100));

const backgroundColor = computed(() => {
	switch (props.selected) {
		case true:
			return 'bg-gradient-selected';
		default:
			return `bg-gradient-lobby-${props.index % 2}`;
	}
});

function onPreview() {
	emit('preview', props.lobby);
}

function onJoin() {
	emit('join', props.lobby);
}
</script>

<style scoped lang="scss">
/* Alternating lobby row backgrounds */
.bg-gradient-lobby-0 {
	background:
		radial-gradient(
			120% 120% at 0% 0%,
			rgba(125, 82, 210, 0.18) 0%,
			rgba(125, 82, 210, 0.06) 38%,
			rgba(10, 12, 20, 0) 72%
		),
		linear-gradient(
			135deg,
			rgba(12, 14, 24, 0.92) 0%,
			rgba(10, 12, 20, 0.92) 55%,
			rgba(8, 10, 16, 0.92) 100%
		);
}

.bg-gradient-lobby-1 {
	background:
		radial-gradient(
			120% 120% at 100% 0%,
			rgba(203, 182, 245, 0.14) 0%,
			rgba(203, 182, 245, 0.05) 40%,
			rgba(10, 12, 20, 0) 72%
		),
		linear-gradient(
			135deg,
			rgba(10, 12, 20, 0.92) 0%,
			rgba(12, 14, 24, 0.92) 55%,
			rgba(8, 10, 16, 0.92) 100%
		);
}

/* Selected item background (a bit brighter + more “intent”) */
.bg-gradient-selected {
	background:
		radial-gradient(
			120% 120% at 0% 0%,
			rgba(125, 82, 210, 0.3) 0%,
			rgba(203, 182, 245, 0.14) 40%,
			rgba(10, 12, 20, 0) 78%
		),
		linear-gradient(
			135deg,
			rgba(18, 14, 32, 0.96) 0%,
			rgba(12, 12, 22, 0.96) 60%,
			rgba(8, 10, 16, 0.96) 100%
		);
}

.lobby-item {
	border-radius: var(--radius-md, 12px);
	overflow: hidden;

	/* subtle depth that matches your dark theme */
	box-shadow:
		0 10px 28px rgba(0, 0, 0, 0.32),
		inset 0 0 0 1px rgba(255, 255, 255, 0.06);

	transition:
		transform 120ms ease,
		box-shadow 120ms ease,
		filter 120ms ease;

	&:hover {
		transform: translateY(-1px);
		box-shadow:
			0 14px 36px rgba(0, 0, 0, 0.38),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	&:focus-visible {
		outline: 2px solid rgba(125, 82, 210, 0.65);
		outline-offset: 2px;
	}
}

.lobby-item--active {
	filter: brightness(1.08);
	box-shadow:
		0 14px 38px rgba(0, 0, 0, 0.42),
		inset 0 0 0 1px rgba(203, 182, 245, 0.22);
}

.lobby-item__title {
	font-weight: 500;
	color: rgba(255, 255, 255, 0.94);
}

.lobby-item__index {
	opacity: 0.75;
	margin-right: 6px;
}

.lobby-item__name {
	letter-spacing: 0.2px;
}

.lobby-item__meta {
	color: rgba(255, 255, 255, 0.72);
}

.lobby-item__chip {
	background: rgba(0, 0, 0, 0.18);
	border: 1px solid rgba(255, 255, 255, 0.1);
	color: rgba(255, 255, 255, 0.9);
}

.lobby-item__chip--full {
	opacity: 0.8;
}

.lobby-item__chip--open {
	border-color: rgba(203, 182, 245, 0.22);
}

.lobby-item__progress {
	height: 6px;
	border-radius: 999px;
	overflow: hidden;
	opacity: 0.9;

	/* Quasar progress bar inner */
	:deep(.q-linear-progress__model) {
		background: rgba(203, 182, 245, 0.95);
	}
}

.lobby-item__join {
	color: rgba(255, 255, 255, 0.9);
	background: rgba(0, 0, 0, 0.18);
	// border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 10px;

	&:hover {
		background: rgba(0, 0, 0, 0.24);
		border-color: rgba(203, 182, 245, 0.22);
	}
}

.lobby-item__chev {
	margin-top: 2px;
	opacity: 0.65;
}
</style>
