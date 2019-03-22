export default SvgHelper;

function SvgHelper() {
	let elementsPool = {};

	this.createElement = function(name) {
		let pool = elementsPool[name];
		if (pool && pool.length) {
			return pool.pop();
		}

		let el = document.createElementNS('http://www.w3.org/2000/svg', name);

		return el;
	};

	this.getOrCreateTree = function(name, create, modify) {
		let pool = elementsPool[name];
		if (pool && pool.length) {
			let tree = pool.pop();

			if (modify) tree = modify(tree);

			return tree;
		}

		return create();
	};

	this.freeElement = function(el) {
		let name = el.tagName.toLowerCase();

		this.freeTree(name, el);
	};

	this.freeTree = function(name, el) {
		let pool = elementsPool[name];
		if (!Array.isArray(pool)) {
			pool = [];
			elementsPool[name] = pool;
		}

		pool.push(el);
	};
}