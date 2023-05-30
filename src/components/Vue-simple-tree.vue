<template>
  <div :class='["outer-cntr", "data-mode-"+dataMode, mode+"-mode", "parent-"+itemId, {isChild, root: !isChild}]'>
    <div v-if='!isChild && mode == "field"' class='tags-and-filter-cntr' @click='hideTree = !hideTree'>
      <component :is='hideTree ? AngleDown : AngleUp' />
      <div class='tags-area' :data-total='globalSelected.size'>
        <template v-if='dataMode == "manual"'>
          <template v-for='id in globalSelected'>
            <span v-if='branchText(id)' @click.stop>
              {{branchText(id)}}
              <a @click='deleteTag(id)'>&times;</a>
            </span>
          </template>
        </template>
      </div>
    </div>
    <div class='tree-cntr' v-show='!hideTree'>
      <input v-if='!isChild && $props.data && search' v-model='searchTerm' placeholder='Search...'>
      <ul ref='tree' :class='{isChild, noBullets}'>
        <template v-for='item in treeData'>
          <li
            :data-id='item.id'
            :class='{
              selected: globalSelected.has(item.id),
              searchMatch: searchTerm && matchesSearchTerm(item[textProperty])
            }'
            v-if='filter(item)'
            v-show='filter(item, 1)'
          >
            <div class='branch-bits'>
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
                <span class='branch-text' v-html='truncateTextOrNot(item[textProperty])'></span>
                <span class='icons'>
                  <Spinner class='loading' v-show='loading.has(item.id)' />
                  <template v-if='admin'>
                    <PlusCircle />
                    <TrashAlt />
                    <Copy />
                  </template>
                </span>
              </label>
            </div>
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
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script setup>

//prep
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { tagDeleted, globalSelected, addToGlobalSelected, deleteFromGlobalSelected, searchTerm } from '../store'
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'
import jp from 'jsonpath'
import { Spinner, AngleDown, AngleUp, PlusCircle, TrashAlt, Copy } from '@vicons/fa'
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
  itemId: [String, Number],
  data: Array,
  preselected: Array,
  expandPreselected: {
    type: Boolean,
    default: true
  },
  textProperty: {
    type: String,
    default: 'text'
  },
  noBullets: {
    type: Boolean,
    default: true
  },
  textTruncate: [Number, Boolean],
  isChild: Boolean,
  throttle: {
    type: Number,
    default: .5
  },
  filter: [String, RegExp, Function],
  search: Boolean,
  invertFilter: Boolean,
  deselectAll: [String, Number, Boolean],
  admin: Boolean
});

//data mode - manual or API
const dataMode = props.apiDomain && props.fetchEndpoint ? 'api' : 'manual';

//item ID must be passed API mode
if (dataMode == 'api' && !props.itemId) console.error('Item ID prop must be passed when using data from API');

//if manual data, filter to those items that pertain to this depth
const preselected = dataMode == 'api' || !props.preselected ?
  props.preselected :
  props.preselected.filter(id => props.data.find(obj => obj.id.toString() === id));

//selected/expanded state stores
const thisTreeStore = ref({
  selected: new Set(preselected),
  expanded: new Set(!props.expandPreselected ? null : preselected)
});

//get branch text for selected item tag, either from tree (for API mode, as items selected) or from manual data
const branchText = id => {
  let ret;
  const el = tree.value.querySelector(`[data-id='${id}'] label .branch-text`);
  if (el)
    ret = el.textContent;
  else {
    const data = treeData.value;
    const node = [jp.query(data, `$[?(@.id=="${id}")]`), jp.query(data, `$..*[?(@.id=="${id}")]`)].flat();
    if (node[0]) ret = node[0][props.textProperty];
  }
  if (ret) return truncateTextOrNot(ret);
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

//on mount, if manual data, set preselected
!props.isChild && onMounted(() => props.preselected && props.preselected.forEach(id => addToGlobalSelected(id)));

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

//filter manual data - initially, if filter prop passed, else if search term active
const filter = (item, forSearchTerm) => {
  const text = item[props.textProperty];
  if (forSearchTerm)
    return (
      !searchTerm.value ||
      matchesSearchTerm(item[props.textProperty]) ||
      !!jp.query(treeData.value, `$[?(@.id=="${item.id}")]..*[?(/${searchTerm.value}/i.test(@.${props.textProperty}))]`).length
    );
  else
    return (
      !props.filter ||
      (typeof props.filter == 'string' && ((!props.invertFilter && text.includes(props.filter)) || (props.invertFilter && !text.includes(props.filter)))) ||
      (props.filter instanceof RegExp && ((!props.invertFilter && props.filter.test(text)) || props.invertFilter && !props.filter.test(text))) ||
      (typeof props.filter == 'function' && props.filter(text))
    );
}

//hide tree? Yes if is root tree and field mode (i.e. show only on activate dropdown) or if tree has no manual data
const hideTree = ref(!props.isChild && props.mode == 'field');

//get data - passed manually, or fetch from web service...
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

//...cast IDs to strings, for JSONPath usage
getData.then(data => {
  data.forEach(obj => obj.id = obj.id.toString());
  treeData.value = data;
  if (props.isChild) hideTree.value = false;
});

//util - text matches search term?
const matchesSearchTerm = text => text.toLowerCase().includes(searchTerm.value.toLowerCase())

//branch finished loading API data
const loadedData = (id, data) => {
  loading.value.delete(id);
  childApiDataCache.value[id] = data;
};

//util - truncate branch text or not
const truncateTextOrNot = (str = '??') =>
  !props.textTruncate || str.length < props.textTruncate ? str : str.substr(0, props.textTruncate)+'…';

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

/* top-level container */
.outer-cntr { font-family: v-sans; font-size: 14.5px; color: #333; position: relative; }

/* tags/filter container */
.tags-and-filter-cntr { position: relative; }
.tags-and-filter-cntr > svg { cursor: pointer; position: absolute; right: 6px; top: 10px; }
.tags-area { padding: 6px; background: #fff; height: 38px; border: solid 1px #ccc; }
.tags-area::before { display: block; color: #999; margin-top: 4px; }
.tags-area:empty::before { content: '(No items selected)'; }
.data-mode-api .tags-area::before { content: attr(data-total) ' selected'; }
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

.foo { border: solid 2px red; }

/* tree container */
.root > .tree-cntr { position: absolute; width: 100%; }
.root.field-mode > .tree-cntr { background: #fff; border: solid 1px #ccc; border-top: none; }

/* tree search */
.tree-cntr > input { background: #eee; outline: none; display: block; max-width: 200px; width: calc(100% - (8px * 2)); padding: 5px; border: none; }
.field-mode .tree-cntr > input { border: none; margin: 8px auto 0 auto; }

/* tree (<ul>) */
ul { margin: 0; }
ul.noBullets { list-style: none; }
.root > .tree-cntr > ul { padding-left: 22px; }
.root > .tree-cntr > ul.noBullets { padding: 10px; }
ul.isChild { padding-left: 16px; border-left: solid 1px #ccc; margin-left: 10px; }

/* branch */
li { margin-block: 5px; }
.branch-bits { position: relative; width: fit-content; }
.branch-bits::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -1px;
  width: calc(100% + (4px * 2));
  height: calc(100% + (1.5px * 2));
  border-radius: 4px;
  transition: .3s;
}
.branch-bits:hover::before { background: #f6f6f6; }
.selected > .branch-bits::before { background: #deffdf; }
.searchMatch > .branch-bits::before { background: #fcfcaa; }

/* branch label */
label { cursor: pointer; position: relative; top: 2px; }
.branch-text { position: relative; z-index: 1; }

/* checkbox contianer */
.branch-bits > span {
  width: 17px;
  height: 17px;
  display: inline-block;
  position: relative;
  margin-right: 6px;
  text-align: center;
  vertical-align: middle;
}

/* checkbox icon */
span span {
  background: white;
  border: solid 1px #ccc;
  border-radius: 3px;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  position: absolute;
  color: #78ec78;
}

/* checkbox icon (checked state) */
input:checked + span { sbackground: #777; }
input:checked + span::before {
  display: block;
  content: '';
  background: url("data:image/svg+xml,%3Csvg version='1.2' baseProfile='tiny' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='24px' height='24px' viewBox='0 0 24 24' xml:space='preserve'%3E%3Cpath fill='%2356d256' d='M16.972,6.251c-0.967-0.538-2.185-0.188-2.72,0.777l-3.713,6.682l-2.125-2.125c-0.781-0.781-2.047-0.781-2.828,0 c-0.781,0.781-0.781,2.047,0,2.828l4,4C9.964,18.792,10.474,19,11,19c0.092,0,0.185-0.006,0.277-0.02 c0.621-0.087,1.166-0.46,1.471-1.009l5-9C18.285,8.005,17.937,6.788,16.972,6.251z'/%3E%3C/svg%3E") no-repeat center/105%;
  width: 100%;
  height: 100%;
}

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
.icons { margin-left: 5px; position: relative; top: 2px; float: right; }
svg { width: 16px; height: 16px; margin-right: 2px; color: #333; }

/* ...loading */
svg.loading { animation: spin .5s infinite linear; }
@keyframes spin {
  0%  { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ...others */
.icons svg:not(.loading) { display: none; }
.branch-bits:hover > label > .icons svg:not(.loading) { display: inline; }

</style>