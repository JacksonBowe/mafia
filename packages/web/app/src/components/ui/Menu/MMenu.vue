<template>
	<q-menu
		class="mafia-menu"
		no-shadow
		:anchor="anchor"
		:self="self"
		:offset="offset"
		:cover="cover"
		:fit="fit"
		:touch-position="touchPosition"
		:no-parent-event="noParentEvent"
		:persistent="persistent"
		:transition-show="transitionShow"
		:transition-hide="transitionHide"
		v-bind="attrs"
	>
		<div class="mafia-menu__surface">
			<slot />
		</div>
	</q-menu>
</template>

<script setup lang="ts">
import { type QMenuProps } from 'quasar';
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		anchor?: QMenuProps['anchor'];
		self?: QMenuProps['self'];
		offset?: [number, number];
		cover?: boolean;
		fit?: boolean;
		touchPosition?: boolean;
		noParentEvent?: boolean;
		persistent?: boolean;
		transitionShow?: string;
		transitionHide?: string;
	}>(),
	{
		anchor: 'bottom left',
		self: 'top left',
		offset: () => [0, 8],
		cover: false,
		fit: false,
		touchPosition: false,
		noParentEvent: false,
		persistent: false,
		transitionShow: 'jump-down',
		transitionHide: 'jump-up',
	},
);

const attrs = useAttrs();

const {
	anchor,
	self,
	offset,
	cover,
	fit,
	touchPosition,
	noParentEvent,
	persistent,
	transitionShow,
	transitionHide,
} = props;
</script>

<style scoped lang="scss">
.mafia-menu__surface {
	background: rgba(18, 16, 20, 0.96);
	border: 1px solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 16px 36px rgba(0, 0, 0, 0.52);
	border-radius: 10px;
	padding: 6px;
}

.mafia-menu__surface :deep(.q-list) {
	padding: 0;
}

.mafia-menu__surface :deep(.q-item) {
	border-radius: 8px;
	min-height: 36px;
}

.mafia-menu__surface :deep(.q-item__section) {
	font-size: 0.95rem;
}
</style>
