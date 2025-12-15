<template>
	<q-page padding class="q-gutter-lg">
		<!-- 1) Default -->
		<MCard title="Default" eyebrow="Base style" subtitle="No tone, no glow">
			This is the baseline card style used everywhere.
			<template #actions>
				<q-btn flat label="Dismiss" />
				<q-btn color="primary" label="Action" />
			</template>
		</MCard>

		<!-- 2) Primary tone + glow (your example) -->
		<MCard
			title="Lobby"
			eyebrow="Village of Ravenshollow"
			subtitle="Waiting for players…"
			tone="primary"
			:glow="true"
		>
			<div class="q-gutter-sm">
				<q-input v-model="t" dense filled label="Display name" />
				<q-input v-model="t" dense filled label="Room code" />
			</div>

			<template #actions>
				<q-btn flat label="Cancel" />
				<q-btn color="primary" label="Join" />
			</template>
		</MCard>

		<!-- 3) No header (content-only) -->
		<MCard :separated="false">
			<div class="text-subtitle2">Content-only</div>
			<div class="text-body2 text-grey-4">Useful for small inline panels or “system messages”.</div>
		</MCard>

		<!-- 4) Custom header slot -->
		<MCard tone="accent" :glow="true">
			<template #header>
				<div class="row items-center justify-between">
					<div>
						<div class="text-overline text-primary">Custom header</div>
						<div class="text-h6">Night Phase</div>
						<div class="text-caption text-grey-5">The village sleeps…</div>
					</div>
					<q-chip dense square color="dark" text-color="white" class="q-ml-md">
						<q-icon name="nights_stay" size="16px" class="q-mr-xs" />
						Night
					</q-chip>
				</div>
			</template>

			Players with night actions may act now.
			<template #actions>
				<q-btn flat label="View roles" />
				<q-btn color="primary" label="Continue" />
			</template>
		</MCard>

		<!-- 5) Top-right slot -->
		<MCard title="Players" eyebrow="Lobby" subtitle="3/12 connected" tone="primary">
			<template #topRight>
				<q-btn dense flat round icon="refresh" />
			</template>

			<div class="q-gutter-xs">
				<q-item dense>
					<q-item-section avatar
						><q-avatar size="28px" style="background: var(--player-2)"
					/></q-item-section>
					<q-item-section>Player 2</q-item-section>
				</q-item>

				<q-item dense>
					<q-item-section avatar
						><q-avatar size="28px" style="background: var(--player-7)"
					/></q-item-section>
					<q-item-section>Player 7</q-item-section>
				</q-item>

				<q-item dense>
					<q-item-section avatar
						><q-avatar size="28px" style="background: var(--player-11)"
					/></q-item-section>
					<q-item-section>Player 11</q-item-section>
				</q-item>
			</div>

			<template #actions>
				<q-btn flat label="Invite" />
				<q-btn color="primary" label="Start" />
			</template>
		</MCard>

		<!-- 6) Clickable card -->
		<MCard
			title="Clickable"
			eyebrow="Navigation / selection"
			subtitle="Hover lifts slightly"
			:clickable="true"
			tone="warning"
			:glow="true"
			@click="onClick('clickable')"
		>
			Great for “Choose a room”, “Pick a role”, “Select a target”.
		</MCard>

		<!-- 7) Danger / warning / success tones -->
		<div class="row q-col-gutter-md">
			<div class="col-12 col-md-4">
				<MCard title="Danger" eyebrow="Mafia" subtitle="Red strip" tone="danger" :glow="true">
					This reads as destructive / scary.
				</MCard>
			</div>
			<div class="col-12 col-md-4">
				<MCard title="Success" eyebrow="Town" subtitle="Green strip" tone="success" :glow="true">
					This reads as “confirmed / safe”.
				</MCard>
			</div>
			<div class="col-12 col-md-4">
				<MCard
					title="Warning"
					eyebrow="Neutral"
					subtitle="Yellow strip"
					tone="warning"
					:glow="true"
				>
					This reads as “attention / maybe”.
				</MCard>
			</div>
		</div>

		<!-- 8) Faction / Player tones via CSS variables (if your MCard supports toneVar) -->
		<MCard
			title="Faction toneVar"
			eyebrow="Uses CSS tokens"
			subtitle="toneVar='--mafia'"
			:tone-var="'--mafia'"
			:glow="true"
		>
			This variation is ideal if you want exact faction/player colors.
		</MCard>

		<MCard
			title="Player toneVar"
			eyebrow="Assigned color"
			subtitle="toneVar='--player-3'"
			:tone-var="'--player-3'"
			:glow="true"
		>
			Great for “You are Player X” reveals or player profile cards.
		</MCard>
	</q-page>
</template>

<script setup lang="ts">
import MCard from 'src/components/ui/Card/MCard.vue';
import { ref } from 'vue';

const t = ref('');

function onClick(which: string) {
	console.log('Clicked', which);
}
</script>
