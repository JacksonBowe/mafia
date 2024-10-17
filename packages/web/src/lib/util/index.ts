import { Notify } from 'quasar';

export const warningNotify = (message: string) => {
	Notify.create({
		message: message,
		color: 'warning',
		icon: 'warning',
	});
};
