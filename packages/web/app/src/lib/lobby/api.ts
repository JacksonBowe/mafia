import type { LobbyInfo } from "@mafia/core/lobby/index";
import { api } from "src/boot/axios";

export const hostLobby = async (lobby: Partial<LobbyInfo>): Promise<LobbyInfo> => {
    const res = await api.post<LobbyInfo>("/lobby", lobby);
    return res.data;
}

export const listLobbies = async (): Promise<LobbyInfo[]> => {
    const res = await api.get<LobbyInfo[]>("/lobby");
    return res.data;
}