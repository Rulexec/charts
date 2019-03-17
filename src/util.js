export { binarySearch };

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

if (module.hot) module.hot.accept();
