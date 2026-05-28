<template>
	<MCard class="column">
		<MCardHeader title="Chat" subtitle="Stubbed chat log for UI iteration." />
		<MCardContent class="col">
			<div class="q-gutter-y-xs">
				<div class="text-caption">[System] Day has begun.</div>
				<div class="text-caption">[Player 4] I am suspicious of Player 7.</div>
				<div class="text-caption">[You] Let's hear defense first.</div>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
</script>
