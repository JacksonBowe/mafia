import type { UserInfo } from "@mafia/core/user/index";
import type { Presence } from "@mafia/core/user/presence";
import { api } from "src/boot/axios";

// Get the current user
export const getActor = async (): Promise<UserInfo> => {
    const response = await api.get<UserInfo>("/me");
    return response.data;
}

export const getPresence = async (): Promise<Presence> => {
    const response = await api.get<Presence>("/presence");
    return response.data;
}