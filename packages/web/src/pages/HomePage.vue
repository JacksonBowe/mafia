<template>
  <q-page padding>
    <!-- content -->
		{{  data }}

  </q-page>
</template>

<script setup lang="ts">
import { useMe } from 'src/lib/state/me';

const { data } = useMe()


</script>
