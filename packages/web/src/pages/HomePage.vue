<template>
	<q-page padding class="column">
		<div class="col row justify-evenly">
			<div class="col-5 column">
				<m-lobby-card class="fit" />
			</div>

			<div class="col-6 column">
				<div class="col column justify-between">
					<div class="col-6">
						<q-card class="fit justify-center flex content-center">
							<q-card-section>
								Game Details
							</q-card-section>
						</q-card>
					</div>

					<div class="col-5">
						<q-card class="fit justify-center flex content-center">
							<q-card-section class="">
								Chat Card
							</q-card-section>
						</q-card>
					</div>

				</div>

			</div>
		</div>


	</q-page>
</template>

<script setup lang="ts">
import MLobbyCard from 'src/components/lobby/MLobbyCard.vue';

</script>
