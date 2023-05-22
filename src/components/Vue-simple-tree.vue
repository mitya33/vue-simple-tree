<template>
  <ul :class='{isChild, noBullets}'>
    <textarea v-if='!isChild'>{{[...selected]}}</textarea>
    <li v-for='item in data'>
      <span>
        <input type='checkbox' :value='item.id' :checked='checked.has(item.id)' @change='inputChange(item.id)' />
        <span></span>
      </span>
      <label @click='toggleBranch(item.id)'>
        <span v-html='item.text'></span>
        <i v-show='loading.has(item.id)'></i>
      </label>
      <Vue-simple-tree
        v-if='expanded.has(item.id)'
        :key='childTreeKey'
        v-bind='$props'
        :data='childApiDataCache[item.id] || item.children'
        :itemId='item.id'
        :isChild='true'
        @loadedData='loadedData'
        @select='select'
        @deselect='deselect'
      />
    </li>
  </ul>
</template>

<script setup>

//prep
import { ref } from 'vue'
const childTreeKey = ref(Math.random());
const emit = defineEmits(['select', 'deselect', 'loadedData']);
const childApiDataCache = ref({});

//props
const props = defineProps({
  apiDomain: String,
  fetchEndpoint: {
    type: Object,
    validator(val) { return val.uri; }
  },
  itemId: {
    type: [String, Number],
    required: true
  },
  data: Array,
  preselected: Array,
  expandPreselected: {
    type: Boolean,
    default: true
  },
  transformer: {
    type: Function,
    default(data) { return data.map(obj => ({text: obj.text, id: obj.id})); }
  },
  noBullets: {
    type: Boolean,
    default: true
  },
  isChild: Boolean,
  throttle: {
    type: Number,
    default: .5
  },
  filter: [String, RegExp, Function],
  invertFilter: Boolean
});

//state for expanded/checked/loading/selected branches
const selected = ref(new Set(props.preselected));
const checked = ref(new Set(props.preselected));
const expanded = ref(new Set(!props.expandPreselected ? [] : props.preselected));
const loading = ref(new Set());

//de/select/expand/collapse items
const select = id => {
  emit('select', id, selected.value)
  checked.value.add(id);
  toggleBranch(id);
  if (!props.isChild) selected.value.add(id);
}
const deselect = id => {
  emit('deselect', id, selected.value);
  childTreeKey.value = Math.random();
  checked.value.delete(id);
  if (!props.isChild) selected.value.delete(id);
}
const inputChange = id => !checked.value.has(id) ? select(id) : deselect(id);
const toggleBranch = id => {
  if (!expanded.value.has(id) && !childApiDataCache.value[id]) loading.value.add(id);
  expanded.value[!expanded.value.has(id) ? 'add' : 'delete'](id);
}

//data - passed statically, or fetch from web service
const data = ref([]);
if (!props.data) {
  const url = props.apiDomain+'/'+props.fetchEndpoint.uri.replace('{id}', props.itemId);
  setTimeout(() => 
    fetch(url, {
      method: props.fetchEndpoint.method || 'GET',
      body: !props.fetchEndpoint.body ? null : props.fetchEndpoint.body.replace('{id}', props.itemId),
      headers: props.fetchEndpoint.headers
    })
      .then(resp => resp.json())
      .then(obj => {
        if (props.isChild) emit('loadedData', props.itemId, obj);
        data.value = props.transformer(obj);
      })
      .catch((e) => console.log(`Failed to get data from "${url}"`)),
    props.isChild ? props.throttle * 1000 : 0
  );
} else
  data.value = props.transformer(props.data);

//child finished loading API data
const loadedData = (childBranchId, data) => {
  loading.value.delete(childBranchId);
  childApiDataCache.value[childBranchId] = data;
};

</script>

<style scoped>

/* tree (<ul>) */
ul.noBullets { list-style: none; }
ul:not(.isChild).noBullets { padding: 0; }
ul.isChild { padding-left: 25px; border-left: solid 1px #ccc; margin-left: 10px; margin-top: 4px; }

/* branch */
li { position: relative; top: -4px; }

/* branch label */
label { cursor: pointer; position: relative; padding-right: 10px; }

/* loading spinner */
i {
  font-weight: bold;
  display: inline-block;
  animation: spin .4s infinite linear;
  margin-left: 6px;
  position: absolute;
  right: 0;
  top: -1px;
}
i::before { content: '\2240'; }
@keyframes spin {
  0%  { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* checkbox contianer */
li > span {
  width: 21px;
  height: 21px;
  display: inline-block;
  position: relative;
  top: 5px;
  margin-right: 6px;
  text-align: center;
}

/* checkbox icon */
span span {
  background: #ccc;
  border-radius: 3px;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  position: absolute;
  font-weight: bold;
  color: #78ec78;
}

/* checkbox icon (checked state) */
input:checked + span { background: #777; }
input:checked + span::before { margin-top: -1px; display: block; content: '\2714'; }

/* checkbox input (hidden) */
input[type=checkbox] {
  display: block;
  margin: 0;
  appearance: none;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1000;
  cursor: pointer;
}

</style>