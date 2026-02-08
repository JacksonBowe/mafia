// src/composables/useForm.ts
import { addedDiff, diff as objDiff, updatedDiff } from 'deep-object-diff';
import { computed, reactive, shallowRef, type ComputedRef, type Ref } from 'vue';

function clone<T>(v: T): T {
	return structuredClone(v);
}

function replaceReactive<T extends Record<string, unknown>>(target: T, src: T) {
	for (const k in target) {
		if (!(k in src)) delete target[k];
	}
	for (const k in src) {
		target[k] = src[k];
	}
}

export interface UseFormResult<T extends Record<string, unknown>> {
	baseline: Ref<T>;
	form: T;
	reset: () => void;
	rebase: () => void;
	added: ComputedRef<Partial<T>>;
	updated: ComputedRef<Partial<T>>;
	diff: ComputedRef<Partial<T>>;
	dirty: ComputedRef<boolean>;
}

export function useForm<T extends Record<string, unknown>>(initial: T): UseFormResult<T> {
	const baseline = shallowRef<T>(clone(initial)) as unknown as Ref<T>;
	const form = reactive<T>(clone(initial)) as T;

	// IMPORTANT: compare against the reactive `form` (no toRaw)
	const added = computed<Partial<T>>(() => addedDiff(baseline.value, form) as Partial<T>);
	const updated = computed<Partial<T>>(() => updatedDiff(baseline.value, form) as Partial<T>);
	const diff = computed<Partial<T>>(() => objDiff(baseline.value, form) as Partial<T>);
	const dirty = computed<boolean>(() => Object.keys(diff.value).length > 0);

	const reset = () => replaceReactive(form, clone(baseline.value));
	const rebase = () => {
		baseline.value = clone(form);
	};

	return { baseline, form, reset, rebase, added, updated, diff, dirty };
}
