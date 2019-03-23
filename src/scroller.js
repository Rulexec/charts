import ChartLine from './chart-line.js';
import Animation from  './animation.js';
import { generalizePoints } from './points-generalization.js';
import { draggableElement, createDebouncer, binarySearch } from './util.js';

export default Scroller;

function Scroller(options) {
	let { svgHelper,
	      onViewportUpdate,
	    } = options;

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
	coverRight.style.right = '0';

	let coverWindow = document.createElement('div');
	coverWindow.className = 'window';
	element.appendChild(coverWindow);

	let windowX = 150;
	let windowWidth = 150;
	let maxWindowX;

	coverWindow.style.left = '150px';
	coverWindow.style.width = '150px';

	let coverWindowMove = document.createElement('div');
	coverWindowMove.className = 'move';
	coverWindow.appendChild(coverWindowMove);

	setupDragging();

	let animation = new Animation();

	let previewLines = [];

	let WIDTH;
	let HEIGHT;

	let minX;
	let maxX;

	let state = null;

	let viewportUpdateDebouncer = createDebouncer(100);

	this.getElement = () => element;

	this.getViewport = getViewport;

	this.setState = function(options) {
		state = options;

		if (isFinite(WIDTH)) updateState();
	};

	this.toggleLine = function(lineId, toggle) {
		let line = previewLines.find(line => line.id === lineId);
		if (!line) return;

		line.chartLine.toggle(toggle);

		let minY = Infinity;
		let maxY = -Infinity;

		previewLines.forEach(line => {
			if (!line.chartLine.isShown()) return;

			for (let { y } of line.chartLine.pointsIterator()) {
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		});

		let yWidth = maxY - minY;
		let fewPixelsGapY = (yWidth / HEIGHT) * 4;

		previewLines.forEach(line => {
			animation.moveViewport({
				left: minX,
				right: maxX,
				bottom: minY - fewPixelsGapY,
				top: maxY + fewPixelsGapY,
			});
		});

		updateViewport();
	};

	this.onShown = function() {
		let rect = element.getBoundingClientRect();

		WIDTH = rect.width | 0;
		HEIGHT = rect.height | 0;

		maxWindowX = WIDTH - windowWidth;

		svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

		if (state) updateState();
	};
	this.destroy = () => {};

	function updateState() {
		let { lines,
		      //,
		    } = state;

		minX = Infinity;
		maxX = -Infinity;

		lines.forEach(({ points }) => {
			let leftX = points[0].x;
			let rightX = points[points.length - 1].x;

			if (leftX < minX) minX = leftX;
			if (rightX > maxX) maxX = rightX;
		});

		let xWidth = maxX - minX;

		let generalizedPoints = [];

		lines.forEach(({ id, className, points }) => {
			let chartLine = new ChartLine({
				svg,
				svgHelper,
				viewBox: {
					width: WIDTH,
					height: HEIGHT,
				},
				className,

				animation,
			});

			previewLines.push({
				id,
				chartLine,
			});

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

		let viewport = {
			left: minX,
			right: maxX,
			bottom: minY - fewPixelsGapY,
			top: maxY + fewPixelsGapY,
		};

		animation.setViewport(viewport);

		generalizedPoints.forEach((points, i) => {
			let chartLine = previewLines[i].chartLine;

			chartLine.setState({
				points,
				viewport,
			});
		});
	}

	function setupDragging() {
		let dragWindow = null;

		draggableElement({
			element: coverWindowMove,
			onStart(e) {
				dragWindow = {
					startX: e.pageX,
					startWindowX: windowX,
				};

				document.body.classList.add('x-cursor-grabbing');
			},
			onMove(e) {
				if (!dragWindow) return;

				let diff = e.pageX - dragWindow.startX;

				let newWindowX = dragWindow.startWindowX + diff;

				if (newWindowX < 0) newWindowX = 0;
				else if (newWindowX > maxWindowX) newWindowX = maxWindowX;

				newWindowX = newWindowX | 0;

				windowX = newWindowX;

				coverWindow.style.left = windowX + 'px';
				coverLeft.style.width = windowX + 'px';

				coverRight.style.left = ((windowX + windowWidth) | 0) + 'px';

				viewportUpdateDebouncer(updateViewport);
			},
			onEnd(e, opts) {
				if (!dragWindow) return;

				dragWindow = null;

				document.body.classList.remove('x-cursor-grabbing');
			},
		});

		let resizeSide = null;

		draggableElement({
			element: coverWindow,
			onStart(e) {
				if (e.target !== coverWindow) return false;

				resizeSide = {
					startX: e.pageX,
					startWindowX: windowX,
					startWindowWidth: windowWidth,
					isLeft: e.offsetX <= 0,
				};

				document.body.classList.add('x-cursor-ew-resize');
			},
			onMove(e) {
				if (!resizeSide) return;

				let diff = e.pageX - resizeSide.startX;

				if (resizeSide.isLeft) {
					if (diff < 0) {
						if (-diff > resizeSide.startWindowX) diff = -resizeSide.startWindowX;
					} else {
						if (diff > resizeSide.startWindowWidth - 24) diff = resizeSide.startWindowWidth - 24;
					}

					windowX = resizeSide.startWindowX + diff;
					windowX = windowX | 0;

					windowWidth = (resizeSide.startWindowWidth - diff) | 0;
					maxWindowX = WIDTH - windowWidth;
				} else {
					if (diff < 0) {
						if (-diff > resizeSide.startWindowWidth - 24) diff = -(resizeSide.startWindowWidth - 24);
					} else {
						let maxDiff = WIDTH - resizeSide.startWindowX - resizeSide.startWindowWidth;

						if (diff > maxDiff) diff = maxDiff;
					}

					windowWidth = (resizeSide.startWindowWidth + diff) | 0;
					maxWindowX = WIDTH - windowWidth;
				}

				coverWindow.style.left = windowX + 'px';
				coverWindow.style.width = windowWidth + 'px';
				coverLeft.style.width = windowX + 'px';

				coverRight.style.left = ((windowX + windowWidth) | 0) + 'px';

				viewportUpdateDebouncer(updateViewport);
			},
			onEnd(e, opts) {
				if (!resizeSide) return;

				resizeSide = null;

				document.body.classList.remove('x-cursor-ew-resize');
			},
		});
	}

	function updateViewport() {
		onViewportUpdate(getViewport());
	}

	function getViewport() {
		let xWidth = maxX - minX;

		let left = minX + (xWidth * (windowX / WIDTH));
		let right = left + (xWidth * (windowWidth / WIDTH));

		let top = -Infinity;
		let bottom = Infinity;

		state.lines.forEach(({ points }, i) => {
			let line = previewLines[i];
			if (!line.chartLine.isShown()) return;

			let leftIndex = binarySearch(points, ({ x }) => {
				return left - x;
			}, { insertPlace: true });

			let rightIndex = binarySearch(points, ({ x }) => {
				return right - x;
			}, { insertPlace: true });

			for (let i = leftIndex; i < rightIndex; i++) {
				let y = points[i].y;

				if (y < bottom) bottom = y;
				if (y > top) top = y;
			}
		});

		return {
			left, right,
			bottom, top,
		};
	}
}