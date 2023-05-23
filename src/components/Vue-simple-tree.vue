<template>
  <div :class='["outer-cntr", mode+"-mode", {isChild, root: !isChild}]'>
    <div v-if='!isChild && mode != "default"' class='tags-and-filter-cntr'>
      <component :is='hideTree ? AngleDown : AngleUp' @click='hideTree = !hideTree' />
      <div class='tags-area' :contenteditable='mode == "filter"'>
        <span v-for='item in allSelected'>
          {{item}}
          <a @click='deselect(item)'>&times;</a>
        </span>
      </div>
    </div>
    <div class='tree-cntr' v-show='!hideTree'>
      <ul :class='{isChild, noBullets}'>
        <li v-for='item in data'>
          <template v-if='filter(item.text)'>
            <span>
              <input type='checkbox' :value='item.id' :checked='checked.has(item.id)' @change='inputChange(item.id)' />
              <span></span>
            </span>
            <label @click='toggleBranch(item.id)'>
              <span v-html='item.text'></span>
              <span class='icons'>
                <Spinner class='loading' v-show='loading.has(item.id)' />
              </span>
            </label>
            <Vue-simple-tree
              v-if='expanded.has(item.id)'
              v-bind='$props'
              :data='childApiDataCache[item.id] || item.children'
              :itemId='item.id'
              :isChild='true'
              :deselectAll='deselectAllChildren'
              @loadedData='loadedData'
              @select='childSelected'
              @deselect='childDeselected'
            />
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>

//prep
import { ref, watch, nextTick } from 'vue'
import 'vfonts/Lato.css'
import { Spinner, AngleDown, AngleUp } from '@vicons/fa'
const emit = defineEmits(['select', 'deselect', 'loadedData']);
const childApiDataCache = ref({});
const deselectAllChildren = ref(false);
const hideTree = ref(!props.isChild && props.mode != 'default');

//props
const props = defineProps({
  mode: {
    type: String,
    default: 'default',
    validator(val) { return ['default', 'field', 'filter'].includes(val); }
  },
  apiDomain: String,
  fetchEndpoint: {
    type: Object,
    validator(val) { return ['string', 'function'].includes(typeof val.uri); }
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
    default(data) { return data.map(obj => ({text: obj.text, id: obj.id, children: obj.children})); }
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
  invertFilter: Boolean,
  deselectAll: [Boolean, Number, String]
});

//state for expanded/checked/loading branches
const checked = ref(new Set(props.preselected));
const expanded = ref(new Set(!props.expandPreselected ? [] : props.preselected));
const loading = ref(new Set());
const allSelected = ref(new Set(props.preselected));

//select item
const select = id => {
  checked.value.add(id);
  allSelected.value.add(id);
  emit('select', id, props.itemId); 
  if (!expanded.value.has(id)) toggleBranch(id);
}

//deselect item (via tree)
const deselect = id => {
  checked.value.delete(id);
  allSelected.value.delete(id);
  deselDescendants(id);
  emit('deselect', id, props.itemId);
}

//toggle expand/collapse branch
const toggleBranch = id => {
  if (!expanded.value.has(id) && !props.data) loading.value.add(id);
  expanded.value[!expanded.value.has(id) ? 'add' : 'delete'](id);
}

//event - input change
const inputChange = id => !checked.value.has(id) ? select(id) : deselect(id);

//event - child selected
const childSelected = (id, parentId) => {
  checked.value.add(parentId);
  allSelected.value.add(id);
  emit('select', parentId, props.itemId);
}

//event - child deselected
const childDeselected = (id, parentId) => {
  allSelected.value.delete(id);
  emit('deselect', parentId, props.itemId);
}

//on parent deselect, deselect children/descendants
watch(() => props.deselectAll, val => {
  if (val === props.itemId || val === true) {
    checked.value.clear();
    deselDescendants(true);
  }
});

//data filter
const filter = text =>
  !props.filter ||
  (typeof props.filter == 'string' && ((!props.invertFilter && text.includes(props.filter)) || (props.invertFilter && !text.includes(props.filter)))) ||
  (props.filter instanceof RegExp && ((!props.invertFilter && props.filter.test(text)) || props.invertFilter && !props.filter.test(text))) ||
  (typeof props.filter == 'function' && props.filter(text))

//data - passed statically, or fetch from web service
const data = ref([]);
if (!props.data) {
  if (props.apiDomain && props.fetchEndpoint) {
    const reqSetup = getRequestSetup('fetch');
    setTimeout(() => 
      fetch(reqSetup.url, reqSetup.config)
        .then(resp => resp.json())
        .then(obj => {
          if (props.isChild) emit('loadedData', props.itemId, obj);
          data.value = props.transformer(obj);
        })
        .catch((e) => console.log(`Failed to get data from "${url}"`)),
      props.isChild ? props.throttle * 1000 : 0
    );
  }
} else
  data.value = props.transformer(props.data);

//child finished loading API data
const loadedData = (childBranchId, data) => {
  loading.value.delete(childBranchId);
  childApiDataCache.value[childBranchId] = data;
};

//util - get request setup i.e. URL and config
function getRequestSetup(endpoint) {
    const obj = props[endpoint+'Endpoint'];
    const uri = typeof obj.uri == 'string' ? obj.uri.replace('{id}', props.itemId) : obj.uri(props.itemId);
    const url = `${props.apiDomain}/${uri}`;
    const config = !obj.config ? {} : (typeof obj.config == 'object' ? obj.config : obj.config(props.itemId));
    return {url, config};
}

//util - deselect child/descendants
function deselDescendants(filter) {
  deselectAllChildren.value = filter;
  nextTick(() => deselectAllChildren.value = false);
}

</script>

<style scoped>

/* top-level container */
.outer-cntr { font-family: v-sans; font-size: 14.5px; color: #333; position: relative; }

/* tags/filter container */
.tags-and-filter-cntr { position: relative; }
.tags-and-filter-cntr > svg { cursor: pointer; position: absolute; right: 4px; top: 9px; }
.tags-area { padding: 6px; background: #fff; min-height: 20px; border: solid 1px #ccc; }
.tags-area span {
  display: inline-block;
  border-radius: 4px;
  background: #f9dc60;
  border: solid 1px #cab55f;
  padding: 3px 6px;
  font-size: 13px;
  position: relative;
  cursor: default;
}
.tags-area span:not(:last-child) { margin-right: 3px; }
.tags-area a {
  display: none;
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  background: #555;
  color: white;
  border-radius: 50%;
  text-align: center;
  font-weight: bold;
  font-size: 12px;
  line-height: 15px;
  cursor: pointer;
  z-index: 1;
}
.tags-area span:hover a { display: block; }

/* tree container */
.root > .tree-cntr { position: absolute; background: #eee; width: 100%; }

/* tree (<ul>) */
ul { margin: 0; }
ul.noBullets { list-style: none; }
.root > .tree-cntr > ul { padding-left: 22px; }
.root > .tree-cntr > ul.noBullets { padding: 10px; }
ul.isChild { padding-left: 16px; border-left: solid 1px #ccc; margin-left: 10px; margin-top: 4px; }

/* branch */
li { position: relative; top: -4px; }

/* branch label */
label { cursor: pointer; }

/* checkbox contianer */
li > span {
  width: 19px;
  height: 19px;
  display: inline-block;
  position: relative;
  top: 4px;
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
  color: #78ec78;
}

/* checkbox icon (checked state) */
input:checked + span { background: #777; }
input:checked + span::before { display: block; content: '\2714'; }

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

/* branch icons/actions... */
.icons { display: inline-block; position: relative; top: 3px; margin-left: 5px; }
svg { width: 18px; height: 18px; }

/* ...loading */
svg.loading { animation: spin .4s infinite linear; color: #999; }
@keyframes spin {
  0%  { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

</style>