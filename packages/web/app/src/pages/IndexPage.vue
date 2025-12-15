<template>
	<q-page padding class="q-gutter-lg">
		<MCard variant="solid">
			<MCardHeader title="Lobby" subtitle="Waiting for players…" :separated="false" />
			<MCardContent>
				<div class="text-body2 text-grey-4">Share the code with friends to start.</div>
			</MCardContent>
		</MCard>

		<MCard variant="solid" tone="primary" tonePlacement="left" :toneSize="5" size="sm" hoverable>
			<MCardHeader
				eyebrow="Game"
				title="Night 2"
				subtitle="3 alive · 1 eliminated"
				:separated="false"
			>
				<template #topRight>
					<q-badge outline color="primary" label="Active" />
				</template>
			</MCardHeader>

			<MCardContent>
				<div class="text-caption text-grey-5">Next phase begins in 00:18</div>
			</MCardContent>
		</MCard>

		<MCard
			variant="solid"
			clickable
			hoverable
			tone="accent"
			tonePlacement="top"
			@click="() => $router.push('/lobbies')"
		>
			<MCardHeader title="Browse lobbies" subtitle="Find an open room" :separated="true" />
			<MCardContent>
				<div class="text-body2 text-grey-4">See public games and join instantly.</div>
			</MCardContent>
		</MCard>

		<MCard variant="glass" glow tone="primary" tonePlacement="top" size="lg">
			<MCardHeader
				eyebrow="Featured"
				title="Informed Minority"
				subtitle="A modern Mafia web game"
			/>
			<MCardContent>
				<div class="text-body1">Create a lobby, invite friends, and play entirely in-browser.</div>
			</MCardContent>

			<MCardActions align="right">
				<q-btn flat label="Learn more" />
				<q-btn color="primary" label="Create lobby" />
			</MCardActions>
		</MCard>

		<MCard variant="flat" size="sm" tonePlacement="none">
			<MCardHeader title="Rules" :separated="false" />
			<MCardContent>
				<ul class="q-pl-md q-my-none">
					<li>Town wins by eliminating Mafia.</li>
					<li>Mafia wins when they equal Town.</li>
				</ul>
			</MCardContent>
		</MCard>

		<MCard variant="solid" disabled tone="warning" tonePlacement="left" :toneSize="5">
			<MCardHeader title="Ranked mode" subtitle="Unlock by completing 3 games" :separated="false" />
			<MCardContent>
				<div class="text-caption text-grey-5">This mode is currently unavailable.</div>
			</MCardContent>

			<MCardActions align="right">
				<q-btn flat label="How to unlock" disable />
			</MCardActions>
		</MCard>

		<MCard variant="solid" size="sm" hoverable>
			<MCardHeader title="Leave lobby" :separated="false">
				<template #topRight>
					<q-icon name="logout" size="18px" class="text-grey-5" />
				</template>
			</MCardHeader>

			<MCardActions align="right" :separated="false">
				<q-btn flat label="Cancel" />
				<q-btn color="negative" label="Leave" />
			</MCardActions>
		</MCard>
	</q-page>
</template>

<script setup lang="ts">
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
</script>
