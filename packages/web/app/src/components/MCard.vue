<template>
	<q-card
		class="mafia-card"
		:class="[`mafia-card--${tone}`, { 'mafia-card--clickable': clickable }]"
		flat
		bordered
		@click="clickable ? $emit('click') : undefined"
	>
		<!-- Optional chrome -->
		<div v-if="glow" class="mafia-card__glow" />

		<q-card-section v-if="title || $slots.header" class="mafia-card__header">
			<slot name="header">
				<div class="row items-start justify-between q-gutter-sm">
					<div class="col">
						<div v-if="eyebrow" class="text-overline mafia-card__eyebrow">
							{{ eyebrow }}
						</div>
						<div v-if="title" class="text-h6 mafia-card__title">
							{{ title }}
						</div>
						<div v-if="subtitle" class="text-caption mafia-card__subtitle">
							{{ subtitle }}
						</div>
					</div>

					<div v-if="$slots.topRight" class="col-auto">
						<slot name="topRight" />
					</div>
				</div>
			</slot>
		</q-card-section>

		<q-separator v-if="(title || $slots.header) && separated" dark />

		<q-card-section class="mafia-card__content">
			<slot />
		</q-card-section>

		<q-separator v-if="$slots.actions && separated" dark />

		<q-card-actions v-if="$slots.actions" class="mafia-card__actions" :align="actionsAlign">
			<slot name="actions" />
		</q-card-actions>
	</q-card>
</template>

<script setup lang="ts">
type Tone = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

withDefaults(
	defineProps<{
		title?: string;
		eyebrow?: string;
		subtitle?: string;

		tone?: Tone;
		glow?: boolean;

		separated?: boolean;
		actionsAlign?: 'left' | 'right' | 'center' | 'between' | 'around' | 'evenly';

		clickable?: boolean;
	}>(),
	{
		tone: 'default',
		glow: false,
		separated: true,
		actionsAlign: 'right',
		clickable: false,
	},
);

defineEmits<{ (e: 'click'): void }>();
</script>

<style scoped lang="scss">
.mafia-card {
	position: relative;
	overflow: hidden;
	border-radius: var(--radius-md, 12px);

	/* Theme-driven knobs (override anywhere) */
	--tone: rgba(255, 255, 255, 0.12);
	--tone-text: var(--text-main);
	--tone-alpha: 0.95;
	--glow-alpha: 0.35;

	/* Text tokens */
	--text-main: rgba(255, 255, 255, 0.92);
	--text-body: rgba(255, 255, 255, 0.85);
	--text-muted: rgba(255, 255, 255, 0.65);

	/* Surface token (define globally if you want: --surface-glass) */
	background: var(--surface-glass, rgba(10, 15, 30, 0.66));
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);

	/* consistent border + depth */
	box-shadow:
		0 10px 30px rgba(0, 0, 0, 0.38),
		inset 0 0 0 1px rgba(255, 255, 255, 0.06);

	/* Quasar bordered draws its own border; keep it subtle */
	:deep(.q-card__section) {
		color: var(--text-main);
	}
}

/* Tone strip (top bar) */
.mafia-card::before {
	content: '';
	position: absolute;
	inset: 0 0 auto 0;
	height: 3px;
	opacity: var(--tone-alpha);
	background: var(--tone);
}

/* Optional glow */
.mafia-card__glow {
	position: absolute;
	inset: -40% -30% auto -30%;
	height: 220px;
	filter: blur(18px);
	opacity: var(--glow-alpha);
	pointer-events: none;
	background: radial-gradient(circle, var(--tone), transparent 60%);
	/* Optional: helps bright tones look nicer on dark */
	mix-blend-mode: screen;
}

.mafia-card--clickable {
	cursor: pointer;
	transition:
		transform 120ms ease,
		box-shadow 120ms ease;

	&:hover {
		transform: translateY(-1px);
		box-shadow:
			0 14px 36px rgba(0, 0, 0, 0.45),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}
}

.mafia-card__header {
	padding-bottom: 10px;
}

.mafia-card__content {
	color: var(--text-body);
	line-height: 1.55;
}

.mafia-card__actions {
	padding-top: 8px;
}

.mafia-card__eyebrow {
	color: var(--tone-text); /* follows tone */
	letter-spacing: 0.08em;
}

.mafia-card__subtitle {
	color: var(--text-muted);
}

/* Tone mapping: lean on Quasar theme vars */
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
