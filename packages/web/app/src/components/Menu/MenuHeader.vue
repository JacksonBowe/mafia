<template>
	<q-header class="bg-transparent flex justify-center">
		<MCard style="width: 80%; max-width: 1000px">
			<div class="row items-center q-gutter-x-md">
				<span class="text-subtitle1 text-mafia">Informed Minority</span>
				<q-btn
					flat
					dense
					icon="fa-brands fa-github"
					color="grey-6"
					rounded
					size="sm"
					target="_blank"
					href="https://github.com/JacksonBowe/mafia"
				/>
				<q-btn
					flat
					dense
					icon="fa-brands fa-discord"
					color="grey-6"
					rounded
					size="sm"
					target="_blank"
					href="https://discord.gg/kpdfPfVx"
				/>

				<q-space />

				<div class="q-gutter-sm flex items-cente">
					<q-skeleton v-if="isLoading" type="rect" dark class="q-mr-sm" width="100px" />
					<span v-else class="text-subtitle1 q-mr-sm">{{ actor?.name }}</span>

					<q-skeleton v-if="isLoading" type="QAvatar" dense size="24px" dark class="q-mr-sm" />
					<q-avatar v-else size="sm" class="">
						<img :src="actor?.avatar || 'https://cdn.quasar.dev/img/boy-avatar.png'" alt="Avatar" />
					</q-avatar>
				</div>
			</div>
		</MCard>
	</q-header>
</template>

<script setup lang="ts">
import MCard from 'src/components/ui/Card/MCard.vue';
import { useActor } from 'src/lib/meta/hooks';

const { data: actor, isLoading } = useActor();
</script>
