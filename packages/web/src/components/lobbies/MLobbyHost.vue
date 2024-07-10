<template>
	<q-form class="column" @submit="submit">
		<div class="row justify-between q-mb-md">
			<MCard class="col-8">
				<q-input v-model="name" class="q-pl-sm" dense borderless dark />
			</MCard>
			<div class="content-center flex">
				<q-btn
					label="Host"
					type="submit"
					no-caps
					class="submit-button"
					size=""
				/>
			</div>
		</div>
		<div class="col">
			<MCard class="fit"></MCard>
		</div>
	</q-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { MCard } from '../ui/card';

import { useMe } from 'src/lib/composables';
import { mutHostLobby } from 'src/lib/composables';
const mutation = mutHostLobby();

const me = useMe();
const name = ref(`${me.data.value?.username}'s Lobby` || '');
const config = ref('');

const submit = () => {
	console.log(me.data);
	console.log('submit');
	let x = mutation.mutate({ name: name.value });
};
</script>

<style>
.lobby-name {
	background-color: #0d101c;
	border-radius: 5px;
	box-shadow: inset 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
	border: 1px solid rgba(116, 116, 116, 0.2);
	/* font-size: large; */
}

.lobby-name .input-label {
	color: rgba(91, 98, 117, 1);
}

.submit-button {
	background-image: linear-gradient(
		to bottom,
		rgba(138, 172, 255, 1),
		rgba(51, 107, 247, 1)
	);
	border-radius: 10px;
}
</style>
src/lib/composablessrc/lib/composables
