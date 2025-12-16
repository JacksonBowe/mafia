<template>
	<q-form @submit="onSubmit">
		<div class="row items-start no-wrap q-gutter-x-sm">
			<q-input
				v-model="formData.lobbyName"
				label="Lobby Name"
				standout
				dense
				class="col"
				hide-bottom-space
				:rules="[...rules.required]"
			/>

			<q-btn
				label="Host"
				type="submit"
				color="primary"
				no-caps
				glossy
				style="min-height: 40px"
				:loading="isPending"
				:disabled="lStore.lobbyActionPending"
			/>
		</div>
	</q-form>
</template>

<script setup lang="ts">
import { useHostLobby } from 'src/lib/lobby/hooks';
import { useActor } from 'src/lib/meta/hooks';
import { useLobbyStore } from 'src/stores/lobby';
import { reactive, watchEffect } from 'vue';
import { rules } from '../ui/Form';

const emit = defineEmits(['submit']);

type FormData = {
	lobbyName: string;
};

const formData: FormData = reactive({
	lobbyName: '',
});

const { mutateAsync, isPending } = useHostLobby();
const lStore = useLobbyStore();

const { data: actor } = useActor();

watchEffect(() => {
	if (actor.value) {
		formData.lobbyName = `${actor.value.name}'s Lobby`;
	}
});

const onSubmit = async () => {
	await mutateAsync(
		{ name: formData.lobbyName },
		{
			onSuccess: () => emit('submit'),
		},
	);
};
</script>
