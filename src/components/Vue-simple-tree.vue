<template>
  <div :class='["outer-cntr", mode+"-mode", {isChild, root: !isChild}]'>
    <div v-if='!isChild && mode != "default"' class='tags-and-filter-cntr'>
      <component :is='hideTree ? AngleDown : AngleUp' @click='hideTree = !hideTree' />
      <div class='tags-area' :contenteditable='mode == "filter"'>
        <span v-for='item in thisTreeStore.selected'>
          foo
          <a @click='deselect(item)'>&times;</a>
        </span>
      </div>
    </div>
    <div class='tree-cntr' v-show='!hideTree'>
      <ul :class='{isChild, noBullets}'>
        <li :data-id='item.id' v-for='item in data'>
          <template v-if='filter(item.text)'>
            <span>
              <input
                type='checkbox'
                :value='item.id'
                :checked='thisTreeStore.selected.has(item.id)'
                @change='toggleInput(item.id)'
              />
              <span></span>
            </span>
            <label @click='toggleBranch(item.id)'>
              <span class='branch-text' v-html='item.text'></span>
              <span class='icons'>
                <Spinner class='loading' v-show='loading.has(item.id)' />
              </span>
            </label>
            <Vue-simple-tree
              v-if='thisTreeStore.expanded.has(item.id)'
              v-bind='$props'
              :data='childApiDataCache[item.id] || item.children'
              :itemId='item.id'
              :isChild='true'
              :deselectAll='deselectAllChildren'
              @loadedData='loadedData'
              @childSelected='select'
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
import store from '../store.js'
import 'vfonts/Lato.css'
import { Spinner, AngleDown, AngleUp } from '@vicons/fa'
const emit = defineEmits(['childSelected', 'loadedData']);
const childApiDataCache = ref({});
const deselectAllChildren = ref(false);
const hideTree = ref(!props.isChild && props.mode != 'default');
const loading = ref(new Set());
const deselectAll = ref(props.deselectAll);

//log manual data in store
store.value[props.itemId] = {
  selected: new Set(props.preselected),
  expanded: new Set(!props.expandPreselected ? null : props.preselected)
};
const thisTreeStore = store.value[props.itemId];

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
  deselectAll: Boolean
});

//select item
const select = id => {
  thisTreeStore.selected.add(id);
  if (!thisTreeStore.expanded.has(id)) toggleBranch(id);
  emit('childSelected', props.itemId);
}

//deselect item, or all (via tree)
const deselect = id => {
  id && thisTreeStore.selected.delete(id);
  !id && thisTreeStore.selected.clear();
  deselectAllChildren.value = true;
  nextTick(() => deselectAllChildren.value = false);
}

//event - toggle expand/collapse branch
const toggleBranch = id => {
  if (!thisTreeStore.expanded.has(id) && !props.data) loading.value.add(id);
  thisTreeStore.expanded[!thisTreeStore.expanded.has(id) ? 'add' : 'delete'](id);
}

//event - toggle de/select branch
const toggleInput = id => !thisTreeStore.selected.has(id) ? select(id) : deselect(id);

//watch - for parent deselect - deselect all children/descendents
watch(() => props.deselectAll, () => {
  deselect();
  deselectAll.value = false;
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