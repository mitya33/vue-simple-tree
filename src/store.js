import { ref, computed } from 'vue'
export const globalSelected = ref(new Set());
export const addToGlobalSelected = (id, emit) => {
  globalSelected.value.add(id);
  emit('addToGlobalSelected', id);
}
export const deleteFromGlobalSelected = (id, emit) => {
  globalSelected.value.delete(id);
  emit('deleteFromGlobalSelected', id);
}
export const tagDeleted = ref(null);
export const searchTerm = ref(null);