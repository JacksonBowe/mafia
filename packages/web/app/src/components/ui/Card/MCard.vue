<template>
	<q-card
		class="mafia-card"
		:class="[
			`mafia-card--${tone}`,
			`mafia-card--${variant}`,
			`mafia-card--size-${size}`,
			`mafia-card--tone-${tonePlacement}`,
			{
				'mafia-card--clickable': clickable && !disabled,
				'mafia-card--hoverable': hoverable && !disabled,
				'mafia-card--disabled': disabled,
				'mafia-card--has-tone': tonePlacement !== 'none',
				'mafia-card--has-glow': glow && variant === 'glass',
			},
		]"
		:style="{ '--tone-size': `${toneSize}px` }"
		flat
		bordered
		:role="clickable && !disabled ? 'button' : undefined"
		:tabindex="clickable && !disabled ? 0 : undefined"
		:aria-disabled="disabled || undefined"
		@click="onClick"
		@keydown.enter.prevent="onKeyActivate"
		@keydown.space.prevent="onKeyActivate"
	>
		<!-- Optional chrome (only meaningful in glass variant) -->
		<div v-if="glow && variant === 'glass'" class="mafia-card__glow" />

		<div class="mafia-card__inner">
			<slot />
		</div>
	</q-card>
</template>

<script setup lang="ts">
export type Tone = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';
export type Variant = 'solid' | 'glass' | 'flat';
export type TonePlacement = 'top' | 'left' | 'none';
export type CardSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
	defineProps<{
		tone?: Tone;
		glow?: boolean;

		variant?: Variant;

		clickable?: boolean;
		hoverable?: boolean;
		disabled?: boolean;

		tonePlacement?: TonePlacement;
		toneSize?: number; // px

		size?: CardSize;
	}>(),
	{
		tone: 'default',
		glow: false,

		// boring-by-default is ideal, but keeping your current defaults:
		variant: 'glass',

		clickable: false,
		hoverable: false,
		disabled: false,

		tonePlacement: 'top',
		toneSize: 3,

		size: 'md',
	},
);

const emit = defineEmits<{ (e: 'click'): void }>();

function onClick() {
	if (props.disabled) return;
	if (!props.clickable) return;
	emit('click');
}

function onKeyActivate() {
	// only activates when "button-like"
	if (props.disabled) return;
	if (!props.clickable) return;
	emit('click');
}
</script>

<style scoped lang="scss">
.mafia-card {
	position: relative;
	overflow: hidden;
	border-radius: var(--radius-md, 12px);
	font-size: 16px; /* was effectively ~14 in many Quasar contexts */
	line-height: 1.55;

	/* Theme-driven knobs (override anywhere) */
	--tone: rgba(255, 255, 255, 0.12);
	--tone-text: var(--text-main);
	--tone-alpha: 0.95;
	--glow-alpha: 0.35;

	/* Sizing knobs */
	--card-pad: 16px;

	/* Text tokens */
	--text-main: rgba(255, 255, 255, 0.92);
	--text-body: rgba(255, 255, 255, 0.85);
	--text-muted: rgba(255, 255, 255, 0.65);
}

.mafia-card__inner {
	padding: var(--card-pad);

	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

/* size presets */
.mafia-card--size-sm {
	--card-pad: 12px;
	font-size: 14px;
}
.mafia-card--size-md {
	--card-pad: 16px;
	font-size: 15px;
}
.mafia-card--size-lg {
	--card-pad: 20px;
	font-size: 16px;
}

/* Make Quasar sections not “double pad” */
.mafia-card :deep(.q-card__section),
.mafia-card :deep(.q-card__actions) {
	padding: 0;
}

/* ---- Variants ---- */

/* Glass (your current default look) */
.mafia-card--glass {
	background: var(--surface-glass, rgba(10, 15, 30, 0.66));
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);

	box-shadow:
		0 10px 30px rgba(0, 0, 0, 0.38),
		inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

/* Solid (boring, versatile) */
.mafia-card--solid {
	background: var(--surface-solid, rgba(12, 16, 26, 0.92));
	box-shadow:
		0 6px 18px rgba(0, 0, 0, 0.28),
		inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

/* Flat (embedded/list cards) */
.mafia-card--flat {
	background: var(--surface-flat, rgba(0, 0, 0, 0));
	box-shadow: none;
	:deep(.q-card__section) {
		padding: var(--card-pad);
	}
}

/* ---- Size presets ---- */
.mafia-card--size-sm {
	--card-pad: 12px;
}

.mafia-card--size-md {
	--card-pad: 16px;
}

.mafia-card--size-lg {
	--card-pad: 20px;
}

/* ---- Tone indicator (top or left) ---- */

/* default: no tone strip unless enabled */
.mafia-card::before {
	content: '';
	position: absolute;
	opacity: 0;
	pointer-events: none;
	background: var(--tone);
}

/* turn on tone */
.mafia-card--has-tone::before {
	opacity: var(--tone-alpha);
}

/* top strip */
.mafia-card--tone-top::before {
	inset: 0 0 auto 0;
	height: calc(var(--tone-size, 3px));
}

/* left strip */
.mafia-card--tone-left::before {
	inset: 0 auto 0 0;
	width: calc(var(--tone-size, 3px));
}

/* none */
.mafia-card--tone-none::before {
	display: none;
}

/* Wire prop into CSS var */
.mafia-card {
	--tone-size: 3px;
}
.mafia-card--tone-top,
.mafia-card--tone-left {
	/* kept for clarity */
}

/* Because scoped styles can’t read props directly, use inline style if you want dynamic:
   <q-card :style="{ '--tone-size': `${toneSize}px` }" ... />
*/
</style>

<style scoped lang="scss">
/* Optional glow (only meaningful on glass) */
.mafia-card__glow {
	position: absolute;
	inset: -40% -30% auto -30%;
	height: 220px;
	filter: blur(18px);
	opacity: var(--glow-alpha);
	pointer-events: none;
	background: radial-gradient(circle, var(--tone), transparent 60%);
	mix-blend-mode: screen;
}

/* ---- Interaction states ---- */

.mafia-card--hoverable,
.mafia-card--clickable {
	transition:
		transform 120ms ease,
		box-shadow 120ms ease;
}

.mafia-card--hoverable:hover,
.mafia-card--clickable:hover {
	transform: translateY(-1px);
	box-shadow:
		0 14px 36px rgba(0, 0, 0, 0.45),
		inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.mafia-card--clickable {
	cursor: pointer;
}

.mafia-card--disabled {
	opacity: 0.55;
	filter: saturate(0.85);
	cursor: not-allowed;

	/* Prevent hover lift even if classes exist */
	transform: none !important;
	box-shadow: inherit !important;
}

/* ---- Tone mapping ---- */
.mafia-card--default {
	--tone: rgba(255, 255, 255, 0.12);
	--tone-text: var(--text-main);
}

.mafia-card--primary {
	--tone: var(--q-primary);
	--tone-text: var(--q-primary);
}

.mafia-card--accent {
	--tone: var(--q-accent);
	--tone-text: var(--q-accent);
}

.mafia-card--success {
	--tone: var(--q-positive);
	--tone-text: var(--q-positive);
}

.mafia-card--warning {
	--tone: var(--q-warning);
	--tone-text: var(--q-warning);
}

.mafia-card--danger {
	--tone: var(--q-negative);
	--tone-text: var(--q-negative);
}
</style>
