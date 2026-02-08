<template>
	<q-page padding class="column">
		<div class="col row justify-evenly">
			<div class="col-5 column">
				<MLobbies />
			</div>

			<div class="col-6 column">
				<div class="col column justify-between">
					<div class="col-6">
						<MLobbyPreview />
					</div>

					<div class="col-5">
						<!-- <q-card class="fit justify-center flex content-center">
							<q-card-section class="">
								Chat Card
							</q-card-section>
						</q-card> -->
						<MChat />
					</div>
				</div>
			</div>
		</div>
	</q-page>
</template>

<script setup lang="ts">
import { MLobbies } from 'src/components/lobbies';
import { MLobbyPreview } from 'src/components/lobby-preview';
import { MChat } from 'src/components/chat';
</script>
