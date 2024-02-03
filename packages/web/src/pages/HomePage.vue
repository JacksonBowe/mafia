<template>
	<q-page padding>
		<!-- content -->
		<q-btn @click="refresh" label="refresh" color="primary" />
		<div v-if="isLoading || isFetching">
			... loading
		</div>
		<div v-else>
			{{  data }}
		</div>

	</q-page>
</template>

<script setup lang="ts">
import { useMe } from 'src/lib/state/me';
import { useQueryClient } from '@tanstack/vue-query';

const { data, isLoading, isFetching } = useMe()
const queryClient = useQueryClient()
const refresh = () => {


	queryClient.invalidateQueries({ queryKey: ['me']})
}
</script>
