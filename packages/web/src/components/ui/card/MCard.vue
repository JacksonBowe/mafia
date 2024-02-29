<template>
	<q-card v-bind="props" class="background">
	  	<!-- Your card content goes here -->
	  	<slot />
	</q-card>
  </template>

<script setup lang="ts">

// Define your default props
const props = defineProps<{
  // Add more default props as needed
}>();

// Optionally, define any other setup logic here
</script>

<style scoped>

.background {
    background: rgba(4, 6, 17, 0.6); /* Light semi-transparent color */
    backdrop-filter: blur(5px); /* Add blur effect */
    -webkit-backdrop-filter: blur(5px); /* For Safari */
}

</style>
