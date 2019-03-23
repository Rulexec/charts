export { binarySearch, draggableElement, createDebouncer };

function binarySearch(list, comparator, options) {
	if (!list.length) return (options && options.insertPlace) ? 0 : -1;

	var left = 0,
	    right = list.length;

	while (left < right) {
		var middle = (left + (right - left) / 2) | 0;

		var comparison = comparator(list[middle]);

		if (comparison < 0) {
			right = middle;
			continue;
		}

		if (comparison > 0) {
			if (left === middle) left++;
			else left = middle;
			continue;
		}

		// else === 0
		return middle;
	}

	return (options && options.insertPlace) ? left : -1;
}

function draggableElement(options) {
	let { element,
	      onStart,
	      onMove,
	      onEnd,
	    } = options;

	element.addEventListener('mousedown', onMouseDown);

	function onMouseDown(e) {
		var needStart = onStart(e);
		if (needStart === false) return;

		document.body.addEventListener('mousemove', onMouseMove);
		document.body.addEventListener('mouseup', onMouseUp);
		window.addEventListener('blur', onWindowBlur);
		window.addEventListener('mouseout', onWindowMouseOut);
	}

	function onMouseMove(e) {
		e.preventDefault();

		onMove(e);

		return false;
	}

	function onMouseUp(e) {
		document.body.removeEventListener('mousemove', onMouseMove);
		document.body.removeEventListener('mouseup', onMouseUp);
		window.removeEventListener('blur', onWindowBlur);
		window.removeEventListener('mouseout', onWindowMouseOut);

		onEnd(e, { isCancel: false });
	}

	function onWindowMouseOut(e) {
		var fromEl = e.relatedTarget || e.toElement;
		if (!fromEl || fromEl.nodeName == 'HTML') {
			// On leaving window

			/*document.body.removeEventListener('mousemove', onMouseMove);
			document.body.removeEventListener('mouseup', onMouseUp);
			window.removeEventListener('blur', onWindowBlur);
			window.removeEventListener('mouseout', onWindowMouseOut);

			onEnd(e, { isCancel: true });*/
		}
	}

	function onWindowBlur(e) {
		document.body.removeEventListener('mousemove', onMouseMove);
		document.body.removeEventListener('mouseup', onMouseUp);
		window.removeEventListener('blur', onWindowBlur);
		window.removeEventListener('mouseout', onWindowMouseOut);

		onEnd(e, { isCancel: true });
	}
}

function createDebouncer(TIME) {
	let timeoutId;
	let isRunning = false;
	let lastFinishTime = 0;
	let fun;

	return function(f) {
		if (!f) {
			// cancel execution
			fun = null;
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			return;
		}

		if (isRunning) {
			fun = f;
			return;
		}

		fun = f;
		run();

		function run() {
			isRunning = false;

			if (!fun) return;

			var diff = performance.now() - lastFinishTime;

			if (!timeoutId) {
				let waitTime = TIME - diff;
				if (waitTime < 0) waitTime = 0;

				timeoutId = setTimeout(function() {
					timeoutId = null;

					let oldFun = fun;
					fun = null;

					if (oldFun) {
						isRunning = true;
						oldFun();
						lastFinishTime = performance.now();
						run();
					}
				}, waitTime);
			}
		}
	};
}

if (module.hot) module.hot.accept();
