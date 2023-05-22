<template>
	<Vue-simple-tree
		class='foo'
		:apiDomain='apiDomain'
		:fetchEndpoint='fetchEndpoint'
		:data_='data'
		:preselected_='preselected'
		:expandPreselected='false'
		itemId='1'
		:transformer='transformer'
	/>
</template>

<script setup>
import VueSimpleTree from './components/Vue-simple-tree.vue'
const apiDomain = 'https://jsonplaceholder.typicode.com';
const fetchEndpoint = {
	method: 'GET',
	uri: 'posts?userId={id}'
};
const transformer = data => data.map(obj => ({text: obj.title, id: obj.id, children: obj.children}));
const preselected = [1, '2b', 3];
const data = [{
	title: 'One',
	id: 1,
	children: [{
		title: 'Two A',
		id: '2a',
	}, {
		title: 'Two B',
		id: '2b',
		children: [{
			title: 'Three',
			id: 3
		}]
	}
]}]
</script>