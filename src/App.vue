<template>
	<div>
		{{[...globalSelected].join()}}
		<h1 v-if='admin'>HLP taxonomy editor</h1>
		<template v-else>
			<h1>Question editor</h1>
			<label>Question text</label>
			<br><br>
			<input style='width: 96%; border: solid 1px #ccc; padding: 9px'>
			<br><br>
			<label>Question taxonomy</label>
			<br><br>	
		</template>
		<Vue-simple-tree
			:admin='admin'
			:mode='!admin ? "field" : "default"'
			:search='true'
			:apiDomain_='apiDomain'
			:fetchEndpoint_='fetchEndpoint'
			:data='data'
			:preselected='preselected'
			:expandPreselected='true'
			itemId='1'
			:transformer='transformer'
		/>
	</div>
</template>

<script setup>
const admin = location.href.includes('admin');

import { globalSelected } from './store'
import VueSimpleTree from './components/Vue-simple-tree.vue'
const apiDomain = 'https://jsonplaceholder.typicode.com';
const fetchEndpoint = {
	method: 'GET',
	uri: 'posts?userId={id}'
};
const transformer = data => data.map(obj => ({text: obj.title, id: obj.id, children: obj.children}));
const preselected = [1, '11', '112'];
const data = admin ? [{
	title: 'Features/config',
	id: 0,
	children: [{
		title: 'Projects',
		id: '01',
		children: [{
			title: 'Is live',
			id: '011'
		}]
	},{
		title: 'Clients',
		id: '02',
		children: [{
			title: 'Send email reports',
			id: '021'
		}]
	}]
},{
	title: 'Classification',
	id: 1,
	children: [{
		title: 'Clients',
		id: '11',
		children: [{
			title: 'UBC',
			id: '111'
		},{
			title: 'EA',
			id: '112'
		},{
			title: 'Harbour Trust',
			id: '113'
		},{
			title: 'Media City',
			id: '114'
		}]
	}, {
		title: 'Sectors',
		id: '12',
		children: [{
			title: 'Local government',
			id: '121'
		},{
			title: 'Tourism',
			id: '122'
		},{
			title: 'Tourism',
			id: '123'
		}]
	}
]}] : [{
		title: 'Clients',
		id: '11',
		children: [{
			title: 'UBC',
			id: '111'
		},{
			title: 'EA',
			id: '112'
		},{
			title: 'Harbour Trust',
			id: '113'
		},{
			title: 'Media City',
			id: '114'
		}]
	}, {
		title: 'Sectors',
		id: '12',
		children: [{
			title: 'Local government',
			id: '121'
		},{
			title: 'Tourism',
			id: '122'
		},{
			title: 'Tourism',
			id: '123'
		}]
	}
]
</script>

<style scoped>
* { font-family: v-sans; }
div { width: 500px; }
</style>

<style>
@import './assets/tooltips.css'
</style>