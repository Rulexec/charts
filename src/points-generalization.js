export { generalizePoints };

function generalizePoints(options) {
	let { points,
	      step,
	    } = options;

	step *= 2;

	if (points.length <= 3) return points.slice();

	let result = [];

	let prevPoint = points[0];
	let interval = {
		left: prevPoint,
		right: null,
		middle: [],
	};

	let nextBound = prevPoint.x + step;

	for (let i = 1; i < points.length - 1; i++) {
		let point = points[i];

		if (point.x < nextBound) {
			interval.middle.push(point);
		} else {
			nextBound = point.x + step;

			interval.right = point;

			processInterval(interval);

			interval = {};

			interval.left = point;
			interval.right = null;
			interval.middle = [];
		}
	}

	interval.right = points[points.length - 1];

	processInterval(interval);
	result.push(interval.right);

	return result;

	function processInterval(interval) {
		result.push(interval.left);

		if (!interval.middle.length) return;

		let xSum = 0;

		interval.middle.forEach(({ x }) => { xSum += x; });

		let xAvg = xSum / interval.middle.length;

		let left = interval.left.x;
		let right = interval.right.x;
		let width = right - left;

		let yAvg = 0;
		let yWeights = 0;

		interval.middle.forEach(({ x, y }) => {
			let w = 1 - Math.abs(x - xAvg) / width;

			yAvg += w * y;
			yWeights += w;
		});

		yAvg /= yWeights;

		result.push({
			x: xAvg,
			y: yAvg,
		});
	}
}