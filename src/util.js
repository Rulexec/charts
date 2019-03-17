export { createSvgElement };

function createSvgElement(name) {
	return document.createElementNS('http://www.w3.org/2000/svg', name);
}

if (module.hot) module.hot.accept();
