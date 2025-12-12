<template>
	<q-item
		v-if="user.username"
		style="padding: 0px; border-radius: 8px"
		clickable
		@click="click"
	>
		<q-item-section no-wrap>
			<q-item-label class="ellipsis content-center flex" lines="1">
				<div class="q-px-xs">
					<q-icon
						v-if="isHost"
						name="star"
						class="q-mr-xs"
						color="yellow-4"
					/>
					{{ user.username }}
				</div>
			</q-item-label>
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import type { LobbyUser } from 'src/lib/api/lobby';

const props = defineProps<{
	user: LobbyUser;
	isHost?: boolean;
}>();

const click = () => {
	console.log('clicked');
	window.navigator.clipboard.writeText(props.user.id);
};
</script>
