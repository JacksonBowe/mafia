<template>
	<router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import * as events from 'src/lib/events';
const q = useQuasar();

q.screen.setSizes({
	// Override XL screen size slightly. This means that a 1920x1080 screen will be considered "lg" instead of "xl"
	xl: 2000,
});

// q.dark.set(true)

console.log(events);
</script>
