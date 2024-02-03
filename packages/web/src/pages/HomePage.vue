<template>
	<q-page padding>
		<!-- content -->
		<div v-if="isLoading">
			... loading
		</div>
		<div v-else>
			{{  data }}
		</div>

	</q-page>
</template>

<script setup lang="ts">
import { useMe } from 'src/lib/state/me';

const { data, isLoading } = useMe()


</script>
