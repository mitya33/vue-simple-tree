<template>
  <div :class='["outer-cntr", mode+"-mode", "parent-"+itemId, {isChild, root: !isChild}]'>
    <div v-if='!isChild && mode == "field"' class='tags-and-filter-cntr' @click='hideTree = !hideTree'>
      <component :is='hideTree ? AngleDown : AngleUp' />
      <div class='tags-area'>
        <span v-for='id in globalSelected' @click.stop>
          <em class='tt top centre'>{{branchPath(id)}}</em>
          <template v-if='tree'>{{branchText(id)}}</template>
          <a @click='deleteTag(id)'>&times;</a>
        </span>
      </div>
    </div>
    <div class='tree-cntr' v-show='!hideTree'>
      <input v-if='!isChild && $props.data && search' v-model='searchTerm' placeholder='filter...'>
      <ul ref='tree' :class='{isChild, noBullets}'>
        <template v-for='item in treeData'>
          <li :data-id='item.id' :class='{searchMatch: searchTerm && item.text.includes(searchTerm)}'>
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
                v-if='thisTreeStore.expanded.has(item.id) || searchTerm'
                v-bind='$props'
                :data='childApiDataCache[item.id] || item.children || []'
                :itemId='item.id'
                :isChild='true'
                :deselectAll='deselectAllChildren'
                @loadedData='loadedData'
                @childSelected='select'
                @addToGlobalSelected='id => addToGlobalSelected(id, emit)'
                @deleteFromGlobalSelected='id => deleteFromGlobalSelected(id, emit)'
              />
            </template>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script setup>

//prep
import { ref, watch, nextTick, computed } from 'vue'
import { tagDeleted, globalSelected, addToGlobalSelected, deleteFromGlobalSelected, searchTerm } from '../store'
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'
import { Spinner, AngleDown, AngleUp } from '@vicons/fa'
const emit = defineEmits(['childSelected', 'loadedData', 'addToGlobalSelected', 'deleteFromGlobalSelected']);
const childApiDataCache = ref({});
const deselectAllChildren = ref(false);
const loading = ref(new Set());
const deselectAll = ref(props.deselectAll);
const tree = ref(null);

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
  search: Boolean,
  invertFilter: Boolean,
  deselectAll: [String, Number, Boolean]
});

//data mode - manual or API
const dataMode = props.apiDomain && props.fetchEndpoint ? 'api' : 'manual';

//if manual data, filter to those items that pertain to this depth
const preselected = !props.data || !props.preselected ?
  null :
  props.preselected.filter(id => props.data.find(obj => obj.id === id));

//selected/expanded state stores
const thisTreeStore = ref({
  selected: new Set(preselected),
  expanded: new Set(!props.expandPreselected ? null : preselected)
});

//get branch text/path for tag
const branchText = id => tree.value.querySelector(`[data-id='${id}'] label .branch-text`).textContent;
const branchPath = id => {
  const ret = [];
  let el = tree.value.querySelector(`[data-id='${id}']`);
  while(!el.matches('.outer-cntr.root')) {
    el.tagName == 'LI' && ret.push(el.querySelector('.branch-text').textContent);
    el = el.parentNode;
  }
  return ret.reverse().join(' > ');
}

//delete tag
const deleteTag = id => {
  tagDeleted.value = id;
  nextTick(() => tagDeleted.value = false);
}

//select item
const select = id => {
  globalSelected.value.add(id);
  thisTreeStore.value.selected.add(id);
  if (!thisTreeStore.value.expanded.has(id)) toggleBranch(id);
  emit('childSelected', props.itemId);
  emit('addToGlobalSelected', id);
}

//deselect item, or all (via tree)
const deselect = id => {
  if (id !== undefined) {
    thisTreeStore.value.selected.delete(id);
    globalSelected.value.delete(id);
  } else {
    if (props.isChild) [...thisTreeStore.value.selected].forEach(id => emit('deleteFromGlobalSelected', id));
    thisTreeStore.value.selected.clear();
  }
  deselectAllChildren.value = id ?? true;
  nextTick(() => deselectAllChildren.value = false);
}

//event - toggle expand/collapse branch
const toggleBranch = id => {
  if (!thisTreeStore.value.expanded.has(id) && dataMode == 'api') loading.value.add(id);
  thisTreeStore.value.expanded[!thisTreeStore.value.expanded.has(id) ? 'add' : 'delete'](id);
}

//event - toggle de/select branch
const toggleInput = id => !thisTreeStore.value.selected.has(id) ? select(id) : deselect(id);

//watch - for parent deselect - deselect all children/descendents
watch(() => props.deselectAll, val => {
  if ([props.itemId, true].includes(val)) {
    deselect();
    deselectAll.value = false;
  }
});

//watch - for tag being deleted (corresponding branch could be at any level)
watch(tagDeleted, id => id !== false && thisTreeStore.value.selected.has(id) && deselect(id));

//filter manual data?
const filter = text =>
    !props.filter ||
    (typeof props.filter == 'string' && ((!props.invertFilter && text.includes(props.filter)) || (props.invertFilter && !text.includes(props.filter)))) ||
    (props.filter instanceof RegExp && ((!props.invertFilter && props.filter.test(text)) || props.invertFilter && !props.filter.test(text))) ||
    (typeof props.filter == 'function' && props.filter(text))

//hide tree? Yes if is root tree and field mode (i.e. show only on activate dropdown) or if tree has no manual data
const hideTree = ref(!props.isChild && props.mode == 'field');

//data - passed manually, or fetch from web service
const treeData = ref([]);
const getData = new Promise(res => {
  if (dataMode == 'api') {
    if (props.apiDomain && props.fetchEndpoint) {
      const reqSetup = getRequestSetup('fetch');
      setTimeout(() => 
        fetch(reqSetup.url, reqSetup.config)
          .then(resp => resp.json())
          .then(obj => {
            if (props.isChild) emit('loadedData', props.itemId, obj);
            res(obj);
          })
          .catch((e) => console.log(`Failed to get data from "${url}"`)),
        props.isChild ? props.throttle * 1000 : 0
      );
    }
  } else
    res(props.data);
});
getData.then(data => {
  treeData.value = props.transformer(data);
  if (props.isChild) hideTree.value = false;
});

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

* { box-sizing: border-box; }

/* tooltips */
.tt { color: #aaa; font-family: v-mono; font-size: 13px; line-height: 16px; }

/* top-level container */
.outer-cntr { font-family: v-sans; font-size: 14.5px; color: #333; position: relative; }


/* tags/filter container */
.tags-and-filter-cntr { position: relative; }
.tags-and-filter-cntr > svg { cursor: pointer; position: absolute; right: 4px; top: 7px; }
.tags-area { padding: 6px; background: #fff; min-height: 20px; border: solid 1px #ccc; }
.tags-area:empty::before { content: '(No items selected)'; font-size: 13px; color: #999; }
.tags-area span {
  display: inline-block;
  border-radius: 4px;
  background: #f9dc60;
  border: solid 1px #cab55f;
  padding: 3px 6px;
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
.root > .tree-cntr { position: absolute; width: 100%; }
.root.field-mode > .tree-cntr { background: #eee; }

/* tree filter */
.tree-cntr > input {
  outline: none;
  display: block;
  width: calc(100% - (8px * 2));
  padding: 4px;
  margin: 8px auto 0 auto;
}
.field-mode .tree-cntr > input { border: none; }

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
.branch-text { position: relative; z-index: 1; }
.searchMatch > label > .branch-text::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -4px;
  width: calc(100% + (4px * 2));
  height: calc(100% + (4px * 2));
  background: #f7f79e;
  z-index: -1;
}

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
.icons { display: inline-block; position: relative; margin-left: 5px; }
svg { width: 18px; height: 18px; }

/* ...loading */
svg.loading { animation: spin .4s infinite linear; color: #999; }
@keyframes spin {
  0%  { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

</style>