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
				<span class="text-caption text-white text-weight-medium">{{ label }}</span>
				<span class="text-caption text-white text-weight-bold">{{ displayTime }}</span>
			</div>
		</q-linear-progress>
	</div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(
	defineProps<{
		/** Countdown duration in seconds */
		duration: number;
		/** Label displayed inside the progress bar */
		label?: string;
		/** Pause the countdown */
		paused?: boolean;
	}>(),
	{
		label: '',
		paused: false,
	},
);

const emit = defineEmits<{
	finished: [];
}>();

const TICK_MS = 50;

const remaining = ref(props.duration * 1000);
let intervalId: ReturnType<typeof setInterval> | null = null;

const progress = computed(() => {
	if (props.duration <= 0) return 0;
	return Math.max(0, remaining.value / (props.duration * 1000));
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
		remaining.value = Math.max(0, remaining.value - TICK_MS);
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

// Reset when duration changes
watch(
	() => props.duration,
	(dur) => {
		remaining.value = dur * 1000;
		if (!props.paused) {
			startInterval();
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
