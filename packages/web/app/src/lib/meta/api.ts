import type { UserInfo } from "@mafia/core/user/index";
import { api } from "src/boot/axios";

// Get the current user
export const getActor = async (): Promise<UserInfo> => {
    const response = await api.get<UserInfo>("/me");
    return response.data;
}