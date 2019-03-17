import ChartLine from './chart-line.js';
import { generalizePoints } from '../src/points-generalization.js';

export default Scroller;

function Scroller(options) {
	let { svgHelper, } = options;

	let element = document.createElement('div');
	element.className = 'x-scroller';

	let svg = svgHelper.createElement('svg');
	element.appendChild(svg);

	let coverLeft = document.createElement('div');
	coverLeft.className = 'cover';
	element.appendChild(coverLeft);

	coverLeft.style.width = '150px';

	let coverRight = document.createElement('div');
	coverRight.className = 'cover';
	element.appendChild(coverRight);

	coverRight.style.left = '300px';
	coverRight.style.width = '100px';

	let coverWindow = document.createElement('div');
	coverWindow.className = 'window';
	element.appendChild(coverWindow);

	coverWindow.style.left = '150px';
	coverWindow.style.width = '150px';

	let coverWindowMove = document.createElement('div');
	coverWindowMove.className = 'move';
	coverWindow.appendChild(coverWindowMove);

	let chartLines = [];

	let WIDTH;
	let HEIGHT;

	let state = null;

	this.getElement = () => element;

	this.setState = function(options) {
		state = options;

		if (isFinite(WIDTH)) updateState();
	};

	this.onShown = function() {
		let rect = element.getBoundingClientRect();

		WIDTH = rect.width | 0;
		HEIGHT = rect.height | 0;

		svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

		if (state) updateState();
	};
	this.destroy = () => {};

	function updateState() {
		let { lines,
		      //,
		    } = state;

		let minX = Infinity;
		let maxX = -Infinity;

		lines.forEach(({ points }) => {
			let leftX = points[0].x;
			let rightX = points[points.length - 1].x;

			if (leftX < minX) minX = leftX;
			if (rightX > maxX) maxX = rightX;
		});

		let xWidth = maxX - minX;

		let generalizedPoints = [];

		lines.forEach(({ className, points }) => {
			let chartLine = new ChartLine({
				svg,
				svgHelper,
				viewBox: {
					width: WIDTH,
					height: HEIGHT,
				},
				className,
			});

			chartLines.push(chartLine);

			if (points.length > WIDTH / 2) {
				let lineXWidth = points[points.length - 1].x - points[0].x;

				points = generalizePoints({
					points,
					step: lineXWidth / WIDTH * 2,
				});

				generalizedPoints.push(points);
			} else {
				generalizedPoints.push(points);
			}
		});

		let minY = Infinity;
		let maxY = -Infinity;

		generalizedPoints.forEach(points => {
			points.forEach(({ y }) => {
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			});
		});

		let yWidth = maxY - minY;

		let fewPixelsGapY = (yWidth / HEIGHT) * 4;

		generalizedPoints.forEach((points, i) => {
			let chartLine = chartLines[i];

			chartLine.setState({
				points,
				viewport: {
					left: minX,
					right: maxX,
					bottom: minY - fewPixelsGapY,
					top: maxY + fewPixelsGapY,
				},
			});
		});
	}
}