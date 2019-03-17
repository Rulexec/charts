export default SvgHelper;

function SvgHelper() {
	let elementsPool = {};

	this.createElement = function(name) {
		let el = document.createElementNS('http://www.w3.org/2000/svg', name);

		el._stack = new Error();

		return el;
	};

	this.freeElement = function(el) {
		let name = el.tagName.toLowerCase();

		let pool = elementsPool[name];
		if (!Array.isArray(pool)) {
			pool = [];
			elementsPool[name] = pool;
		}

		pool.push(el);
	};
}