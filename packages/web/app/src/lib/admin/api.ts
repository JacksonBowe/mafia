import { api } from "src/boot/axios";


export const terminateLobbies = async (): Promise<void> => {
    await api.post(`/admin/terminate-lobbies`);
}