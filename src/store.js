import { ref, computed } from 'vue'
export const store = ref({});
export const selected = computed(() =>
	Object.values(store.value).map(obj => [...obj.selected]).flat()
);