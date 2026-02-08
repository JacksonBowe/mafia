// src/boot/realtime.ts
import { defineBoot } from '#q-app/wrappers';
import { watch } from 'vue';
import { useAuthStore } from 'src/stores/auth';
import { useRealtime } from 'src/stores/realtime';

export default defineBoot(() => {
	const auth = useAuthStore();
	const rt = useRealtime();

	watch(
		() => ({ token: auth.session?.accessToken ?? null, userId: auth.userId ?? null }),
		({ token, userId }) => {
			if (!token || !userId) {
				rt.disconnect();
				return;
			}
			if (!rt.isConnected && rt.status !== 'connecting') {
				rt.connect({ token, userId });
			}
		},
		{ immediate: true },
	);
});
