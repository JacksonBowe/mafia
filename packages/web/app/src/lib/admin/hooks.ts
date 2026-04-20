import { useMutation } from '@tanstack/vue-query';
import { api } from 'src/boot/axios';

export const useTerminateLobbies = () => {
	return useMutation({
		mutationFn: api.terminateLobbies,
	});
};

export const useTerminateGames = () => {
	return useMutation({
		mutationFn: api.terminateGames,
	});
};
