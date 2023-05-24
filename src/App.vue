<template>
	<div>
		<Vue-simple-tree
			mode='field'
			:filter='true'
			:fetchEndpoint='fetchEndpoint'
			:data='data'
			:preselected_='preselected'
			:expandPreselected='true'
			itemId='1'
			:transformer='transformer'
		/>
	</div>
</template>

<script setup>
import VueSimpleTree from './components/Vue-simple-tree.vue'
const apiDomain = 'https://jsonplaceholder.typicode.com';
const fetchEndpoint = {
	method: 'GET',
	uri: 'posts?userId={id}'
};
const transformer = data => data.map(obj => ({text: obj.title, id: obj.id, children: obj.children}));
const preselected = [1, '1b', '1c'];
const data = [{
	title: 'Zero',
	id: 0
},{
	title: 'One',
	id: 1,
	children: [{
		title: 'One A',
		id: '1a',
	}, {
		title: 'One B',
		id: '1b',
		children: [{
			title: 'One C',
			id: '1c'
		}]
	}
]}, {
	title: 'Three',
	id: 3
}]
</script>

<style scoped>
div { width: 200px; margin: 5rem; }
</style>

<style>
@import './assets/tooltips.css'
</style>