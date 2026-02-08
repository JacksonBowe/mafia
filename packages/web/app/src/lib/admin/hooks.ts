import { useMutation } from '@tanstack/vue-query';
import { terminateGames, terminateLobbies } from './api';

export const useTerminateLobbies = () => {
	return useMutation({
		mutationFn: terminateLobbies,
	});
};

export const useTerminateGames = () => {
	return useMutation({
		mutationFn: terminateGames,
	});
};
