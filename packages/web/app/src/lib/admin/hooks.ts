import { useMutation } from "@tanstack/vue-query"
import { terminateLobbies } from "./api"

export const useTerminateLobbies = () => {
    return useMutation({
        mutationFn: terminateLobbies
    })
}