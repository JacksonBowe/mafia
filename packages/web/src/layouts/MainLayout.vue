<template>
  <q-layout view="hHh Lpr fFf"> <!-- Be sure to play with the Layout demo on docs -->
	<div class="bg-splash">
		<img src="~assets/mafia-village-night.png" class="fit" />
	</div>
	<q-header class="bg-transparent" height-hint="98">
    <q-toolbar class="q-px-md toolbar">
      <q-btn flat dense class="logo" icon="mdi-home" />
      <q-toolbar-title class="text-body q-mr-md text-mafia">Mafia</q-toolbar-title>
      <q-space />
      <div class="q-gutter-sm flex items-center">
        <span class="text-subtitle1">John Doe</span>
        <q-btn push glossy no-caps size="sm" icon="logout" color="negative" />
      </div>
    </q-toolbar>
  </q-header>
    <q-page-container>
      <!-- This is where pages get injected -->
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup lang="ts">
</script>

<style scoped>

.bg-splash {
    position: fixed;
    height: 100%;
    width: 100%;
    z-index: 0;
}

.toolbar {
    background: rgba(4, 6, 17, 0.6); /* Light semi-transparent color */
    backdrop-filter: blur(5px); /* Add blur effect */
    -webkit-backdrop-filter: blur(5px); /* For Safari */
}

.toolbar::after {
    content: '';
    position: absolute;
	top: -10px;
    left: -10px;
    right: -10px;
    bottom: 0px;
    box-shadow: 0 0 10px 10px rgba(4, 6, 17, 0.6); /* Adjust glow color and intensity */
    z-index: -1;
}
</style>
