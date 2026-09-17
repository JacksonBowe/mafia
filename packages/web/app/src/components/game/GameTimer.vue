<template>
	<div class="game-timer" style="min-width: 180px; max-width: 240px">
		<q-linear-progress
			:value="progress"
			:color="progressColor"
			rounded
			stripe
			instant-feedback
			size="26px"
			track-color="grey-9"
		>
			<div class="absolute-full row items-center justify-between q-px-sm">
				<span class="text-caption text-white text-weight-medium text-capitalize">{{ label }}</span>
				<span class="text-caption text-white text-weight-bold">{{ displayTime }}</span>
			</div>
		</q-linear-progress>
	</div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(
	defineProps<{
		/** Server-authoritative current phase start, in epoch milliseconds. */
		phaseStartedAt: number;
		/** Server-authoritative current phase deadline, in epoch milliseconds. */
		phaseEndsAt: number;
		/** Label displayed inside the progress bar */
		label?: string;
		/** Pause the countdown */
		paused?: boolean;
		/** Reset countdown when this identity changes, even if duration stays same. */
		resetKey?: string | number;
	}>(),
	{
		label: '',
		paused: false,
		resetKey: '',
	},
);

const emit = defineEmits<{
	finished: [];
}>();

const TICK_MS = 50;

const now = ref(Date.now());
let intervalId: ReturnType<typeof setInterval> | null = null;

const durationMs = computed(() => Math.max(0, props.phaseEndsAt - props.phaseStartedAt));
const remaining = computed(() => Math.max(0, props.phaseEndsAt - now.value));

const progress = computed(() => {
	if (durationMs.value <= 0) return 0;
	return Math.max(0, remaining.value / durationMs.value);
});

const progressColor = computed(() => {
	const p = progress.value;
	if (p > 0.5) return 'primary';
	if (p > 0.25) return 'warning';
	return 'negative';
});

const displayTime = computed(() => {
	const secs = Math.ceil(remaining.value / 1000);
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
});

function startInterval() {
	stopInterval();
	intervalId = setInterval(() => {
		now.value = Date.now();
		if (remaining.value <= 0) {
			stopInterval();
			emit('finished');
		}
	}, TICK_MS);
}

function stopInterval() {
	if (intervalId !== null) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

// Start/stop based on paused prop
watch(
	() => props.paused,
	(paused) => {
		if (paused) {
			stopInterval();
	} else if (remaining.value > 0) {
			startInterval();
		}
	},
	{ immediate: true },
);

// Reset when the authoritative phase occurrence changes.
watch(
	() => [props.phaseStartedAt, props.phaseEndsAt, props.resetKey] as const,
	() => {
		now.value = Date.now();
		if (!props.paused) {
			if (remaining.value > 0) startInterval();
			else stopInterval();
		}
	},
);

onUnmounted(() => {
	stopInterval();
});
</script>

<style scoped>
.game-timer :deep(.q-linear-progress__model) {
	transition: none !important;
}
</style>
