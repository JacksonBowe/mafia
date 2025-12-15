import { useQuery } from "@tanstack/vue-query";
import { getActor } from "./api";

export const useActor = () => {
    return useQuery({
        queryKey: ["actor"],
        queryFn: getActor,
    })
}