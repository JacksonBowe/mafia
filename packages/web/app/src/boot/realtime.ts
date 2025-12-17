import { defineBoot } from '#q-app/wrappers'
import { useRealtime } from 'src/stores/realtime'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(({ router }) => {
    router.afterEach((to) => {
        const realtime = useRealtime()
        if (to.meta?.requiresAuth) {
            if (!realtime.isConnected) {
                realtime.connect()
            }
        }
    })
})
