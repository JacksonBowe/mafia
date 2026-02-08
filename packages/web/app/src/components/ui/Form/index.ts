export { useForm } from './useForm';
import { date, patterns } from 'quasar';

export const rules = {
	required: [(val: unknown) => Boolean(val) || 'Field required'],

	minLength: (min: number) => [
		(val: string | null | undefined) =>
			(!!val && val.length >= min) || `Minimum ${min} characters required`,
	],

	maxLength: (max: number) => [
		(val: string | null | undefined) =>
			(!!val && val.length <= max) || `Maximum ${max} characters allowed`,
	],

	exactLength: (exact: number) => [
		(val: string | null | undefined) =>
			(!!val && val.length === exact) || `Must be exactly ${exact} characters`,
	],

	isEqualTo: (compareTo: string | number, message?: string) => [
		(val: string | number | null | undefined) =>
			val === compareTo || (message ?? `Value must be equal to ${compareTo}`),
	],

	isEmail: [
		(val: string | null) => (val !== null && val?.replace(' ', '').length > 0) || 'Email required',
		(val: string | null) => patterns.testPattern.email(val) || 'Invalid email',
	],

	arrayMinLength: (min: number) => [
		(val: unknown[] | null | undefined) =>
			(!!val && val.length >= min) || `Select at least ${min} item(s)`,
	],
	unique: (list: (string | number)[], message = 'Value must be unique', caseInsensitive = true) => [
		(val: string | number | null | undefined) => {
			if (val === null || val === undefined) return true;
			const checkVal = typeof val === 'string' && caseInsensitive ? val.toLowerCase() : val;
			const listCheck = caseInsensitive
				? list.map((v) => (typeof v === 'string' ? v.toLowerCase() : v))
				: list;
			return !listCheck.includes(checkVal) || message;
		},
	],
	calendar: {
		disablePastDates: (candidateDate: string) => {
			const today = date.formatDate(new Date(), 'YYYY/MM/DD');
			return candidateDate >= today;
		},
	},
};
