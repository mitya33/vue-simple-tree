<template>
	<div>
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
			:expandPreselected='false'
			itemId='1'
			:throttle='5'
			textProperty_='title'
			:textTruncate='30'
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
const preselected = ['1', '11', '112'];
const data = [{
	text: 'Features/config',
	id: 0,
	children: [{
		text: 'Projects',
		id: '01',
		children: [{
			text: 'Is live',
			id: '011'
		}]
	},{
		text: 'Clients',
		id: '02',
		children: [{
			text: 'Send email reports',
			id: '021'
		}]
	}]
},{
	text: 'Classification',
	id: 1,
	children: [{
		text: 'Clients',
		id: '11',
		children: [{
			text: 'UBC',
			id: '111'
		},{
			text: 'EA',
			id: '112'
		},{
			text: 'Harbour Trust',
			id: '113'
		},{
			text: 'Media City',
			id: '114'
		}]
	}, {
		text: 'Sectors',
		id: '12',
		children: [{
			text: 'Local government',
			id: '121'
		},{
			text: 'Tourism',
			id: '122'
		},{
			text: 'Tourism',
			id: '123'
		}]
	}
]}];
</script>

<style scoped>
* { font-family: v-sans; }
div { width: 500px; }
</style>