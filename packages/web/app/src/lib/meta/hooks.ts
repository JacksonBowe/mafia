import { useQuery } from "@tanstack/vue-query";
import { getActor, getPresence } from "./api";

export const useActor = () => {
    return useQuery({
        queryKey: ["actor"],
        queryFn: getActor,
    })
}

export const usePresence = () => {
    return useQuery({
        queryKey: ["actor", "presence"],
        queryFn: getPresence,
    })
}