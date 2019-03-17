import { binarySearch } from './util.js';

export default ChartLine;

const VIEWPORT_ANIMATION_DURATION = 250;
const POINTS_ANIMATION_DURATION = 250;

const ASSERTS = true;

function ChartLine(options) {
	let { svg,
		  svgHelper,
	      viewBox: { width: WIDTH, height: HEIGHT },
	      className,
	    } = options;

	let g = svgHelper.createElement('g');

	svg.appendChild(g);

	let linePoints = [];

	let needPointsAnimation = false;
	let animationPointsStartTime = 0;

	let viewport;

	let animationRunning = false;

	let animationViewportStartTime = 0;
	let animationOldViewport = null;
	let animationNewViewport = null;

	let prevRedrawXLeft = 0;
	let prevRedrawXRight = 0;

	this.setState = function(options) {
		let { points,
		    } = options;

		viewport = options.viewport;

		linePoints = [{
			point: { x: -Infinity, y: 0 },
			leftLine: null,
			rightLine: null,
			fake: true,
		}];

		let {
		     left, right,
		     bottom, top,
		    } = viewport;

		prevRedrawXLeft = left;
		prevRedrawXRight = right;

		let xWidth = right - left;
		let yWidth = top - bottom;

		let prevLineXY = { point: null, x: 0, y: 0 };
		let prevLinePoint = null;

		let startPointIndex = 0;

		{ // Find point before `left`
			let prevPreLeftPoint = null;

			for (let i = 0; i < points.length; i++) {
				let point = points[i];
				let { x, y } = point;

				prevLinePoint = {
					point: { x, y },
					leftLine: null,
					rightLine: null,
				};

				linePoints.push(prevLinePoint);

				if (x < left) {
					prevPreLeftPoint = point;
					continue;
				}

				if (prevPreLeftPoint) {
					point = prevPreLeftPoint;
					startPointIndex = i;
				} else {
					startPointIndex = i + 1;
				}

				({ x, y } = point);

				let x1 = (WIDTH * ((x - left) / xWidth)) | 0;
				let y1 = (HEIGHT - HEIGHT * ((y - bottom) / yWidth)) | 0;

				prevLineXY.point = point;
				prevLineXY.x = x1;
				prevLineXY.y = y1;

				break;
			}
		}

		let lineEl = g.firstElementChild;

		for (let i = startPointIndex; i < points.length; i++) {
			let point = points[i];
			let { x, y } = point;

			let needBreak = false;

			if (x > right) needBreak = true;

			let line;

			if (lineEl) {
				line = lineEl;
				lineEl = lineEl.nextElementSibling;
			} else {
				line = svgHelper.createElement('line');
				line.setAttribute('class', className || '');
				g.appendChild(line);
			}

			let x2 = (WIDTH * ((x - left) / xWidth)) | 0;
			let y2 = (HEIGHT - HEIGHT * ((y - bottom) / yWidth)) | 0;

			line.setAttribute('x1', prevLineXY.x);
			line.setAttribute('y1', prevLineXY.y);
			line.setAttribute('x2', x2);
			line.setAttribute('y2', y2);

			prevLinePoint.rightLine = line;

			prevLinePoint = {
				point: { x, y },
				leftLine: line,
				rightLine: null,
			};

			linePoints.push(prevLinePoint);

			prevLineXY.point = point;
			prevLineXY.x = x2;
			prevLineXY.y = y2;

			if (needBreak) {
				for (let j = i + 1; j < points.length; j++) {
					let point = points[j];
					let { x, y } = point;

					prevLinePoint = {
						point: { x, y },
						leftLine: null,
						rightLine: null,
					};

					linePoints.push(prevLinePoint);
				}

				break;
			}
		}

		linePoints.push({
			point: { x: Infinity, y: 0 },
			leftLine: null,
			rightLine: null,
			fake: true,
		});

		while (lineEl) {
			g.removeChild(lineEl);

			svgHelper.freeElement(lineEl);

			lineEl = lineEl.nextElementSibling;
		}
	};

	// FIXME: single-point cases
	this.replacePoints = function(options) {
		let { points,
		      fromIndex,
		      toIndex,
		    } = options;

		let leftX = points[0].x;
		let leftIndex = binarySearch(linePoints, ({ point: { x } }) => {
			return leftX - x;
		}, { insertPlace: true });

		let rightX = points[points.length - 1].x;
		let rightIndex = binarySearch(linePoints, ({ point: { x } }) => {
			return rightX - x;
		}, { insertPlace: true });

		fromIndex = leftIndex;
		if (fromIndex <= 0) fromIndex = 1;

		toIndex = rightIndex;
		if (toIndex >= linePoints.length - 1) toIndex = linePoints.length - 2;

		if (ASSERTS) {
			// Check correct order
			if (linePoints[fromIndex - 1].point.x > points[0].x) debugger;;
			if (linePoints[toIndex + 1].point.x < points[points.length - 1].x) debugger;
		}

		let mergedPoints = [];

		let oldPointsIndex = fromIndex;
		let newPointsIndex = 0;

		// Merge old/new points in order
		while (oldPointsIndex <= toIndex && newPointsIndex < points.length) {
			if (oldPointsIndex > toIndex) {
				// add rest new points

				while (newPointsIndex < points.length) {
					let newPoint = points[newPointsIndex];

					mergedPoints.push({
						oldIndex: oldPointsIndex,
						newIndex: newPointsIndex,
						oldPointData: null,
						newPoint,
					});

					oldPointsIndex++;
				}

				break;
			}

			if (newPointsIndex >= points.length) {
				// delete old points

				while (oldPointsIndex <= toIndex) {
					let oldPointData = linePoints[oldPointsIndex];

					mergedPoints.push({
						oldIndex: oldPointsIndex,
						newIndex: newPointsIndex,
						oldPointData,
						newPoint: null,
					});

					oldPointsIndex++;
				}

				break;
			}

			let oldPointData = linePoints[oldPointsIndex];
			let oldPoint = oldPointData.point;

			let newPoint = points[newPointsIndex];

			let needOnlyMovePoint =
				    oldPoint.x === newPoint.x
				 || oldPointsIndex === 1
				 || oldPointsIndex === linePoints.length - 2;

			if (needOnlyMovePoint) {
				mergedPoints.push({
					oldIndex: oldPointsIndex,
					newIndex: newPointsIndex,
					oldPointData,
					newPoint,
				});

				oldPointsIndex++;
				newPointsIndex++;

				continue;
			}

			if (oldPoint.x < newPoint.x) {
				// add old point to delete

				mergedPoints.push({
					oldIndex: oldPointsIndex,
					newIndex: newPointsIndex,
					oldPointData,
					newPoint: null,
				});

				oldPointsIndex++;
			} else {
				// add new point to create

				mergedPoints.push({
					oldIndex: oldPointsIndex,
					newIndex: newPointsIndex,
					oldPointData: null,
					newPoint,
				});

				newPointsIndex++;
			}
		}

		if (ASSERTS) {
			// check `mergedPoints` order
			let prevX = -Infinity;

			mergedPoints.forEach(({ oldPointData, newPoint }) => {
				let x = oldPointData ? oldPointData.point.x : newPoint.x;
				if (typeof x !== 'number') debugger;

				if (prevX > x) debugger;

				prevX = x;
			});
		}

		let newLinePoints = linePoints.slice(0, fromIndex);

		mergedPoints.forEach(({ oldIndex, newIndex, oldPointData, newPoint }) => {
			if (oldPointData && newPoint) {
				// just animate existing point

				let oldPoint = oldPointData.point;

				oldPointData.animatePointFrom = { x: oldPoint.x, y: oldPoint.y };
				oldPointData.animatePointTo = { x: newPoint.x, y: newPoint.y };

				oldPointData.leftLine = newLinePoints[newLinePoints.length - 1].rightLine;

				newLinePoints.push(oldPointData);

				return;
			}

			if (oldPointData) {
				// animate & destroy existing point

				let oldPoint = oldPointData.point;

				let prevPoint;

				if (newIndex > 0) prevPoint = points[newIndex - 1];
				else prevPoint = linePoints[oldIndex - 1].point;

				let nextPoint = points[newIndex];

				let newY = prevPoint.y + ((oldPoint.x - prevPoint.x) / (nextPoint.x - prevPoint.x)) * (nextPoint.y - prevPoint.y);

				oldPointData.animatePointFrom = { x: oldPoint.x, y: oldPoint.y };
				oldPointData.animatePointTo = {
					x: oldPoint.x,
					y: newY,
				};
				oldPointData.deleteAfterAnimation = true;

				oldPointData.leftLine = newLinePoints[newLinePoints.length - 1].rightLine;

				newLinePoints.push(oldPointData);
			} else {
				// create new point

				let prevPoint = linePoints[oldIndex - 1].point;
				let oldPoint = linePoints[oldIndex].point;

				let currY = prevPoint.y + ((newPoint.x - prevPoint.x) / (oldPoint.x - prevPoint.x)) * (oldPoint.y - prevPoint.y);

				let currPoint = {
					x: newPoint.x,
					y: currY,
				};

				let line = svgHelper.createElement('line');
				line.setAttribute('class', className || '');
				g.appendChild(line);

				let newPointData = {
					point: currPoint,
					animatePointFrom: Object.assign({}, currPoint),
					animatePointTo: newPoint,

					leftLine: newLinePoints[newLinePoints.length - 1].rightLine,
					rightLine: line,
				};

				line._x = {
					a: { oldIndex, newIndex, oldPointData, newPoint },
					lp: linePoints.slice(),
					newPointData,
				};

				newLinePoints.push(newPointData);
			}
		});

		linePoints[toIndex + 1].leftLine = newLinePoints[newLinePoints.length - 1].rightLine;

		{
			let pointData = linePoints[toIndex];

			if (pointData !== newLinePoints[newLinePoints.length - 1]) {
				let rightLine = pointData.rightLine;

				if (rightLine) {
					g.removeChild(rightLine);
					svgHelper.freeElement(rightLine);
				}
			}
		}

		for (let i = toIndex + 1; i < linePoints.length; i++) {
			newLinePoints.push(linePoints[i]);
		}

		linePoints = newLinePoints;

		if (ASSERTS) {
			checkLinesLinking(linePoints);
		}

		needPointsAnimation = true;
		startAnimation();

		return {
			fromIndex: fromIndex - 1,
			toIndex: fromIndex - 1 + mergedPoints.length,
		};

		function checkLinesLinking(linePoints) {
			// Check for lines linking
			for (let i = 1; i < linePoints.length; i++) {
				if (linePoints[i - 1].rightLine !== linePoints[i].leftLine) debugger;
			}
		}
	};

	this.moveViewport = function(newViewport) {
		animationOldViewport = Object.assign({}, viewport);
		animationNewViewport = Object.assign({}, newViewport);

		animationViewportStartTime = 0;

		startAnimation();
	};

	function startAnimation() {
		if (animationRunning) return;

		animationRunning = true;

		requestAnimationFrame(time => {
			let startTime = time;

			loop(startTime);

			function loop(prevTime) {
				if (checkFinish(prevTime)) {
					animationRunning = false;
					return;
				}

				requestAnimationFrame(time => {
					pointsAnimation(time);
					viewportAnimation(time);

					redrawLines();

					loop(time);
				});
			}
		});

		function checkFinish(time) {
			if (animationNewViewport && !animationViewportStartTime) {
				animationViewportStartTime = time;
			}

			if (needPointsAnimation && !animationPointsStartTime) {
				animationPointsStartTime = time;
			}

			let isAnimationGoing = !!animationViewportStartTime || !!animationPointsStartTime;

			return !isAnimationGoing;
		}

		function pointsAnimation(time) {
			if (!animationPointsStartTime) return;

			let elapsed = time - animationPointsStartTime;

			let isFinished = elapsed >= POINTS_ANIMATION_DURATION;

			let t = elapsed / POINTS_ANIMATION_DURATION;
			t = t * (2 - t);

			if (isFinished) {
				// FIXME: delete only unneeded lines

				linePoints = linePoints.filter((pointData, i) => {
					if (!pointData.animatePointTo) return true;
					if (!pointData.deleteAfterAnimation) return true;

					return false;
				});

				g.innerHTML = '';

				linePoints.forEach(pointData => {
					pointData.leftLine = null;
					pointData.rightLine = null;
				});
			}

			linePoints.forEach(pointData => {
				if (!pointData.animatePointTo) return;

				if (isFinished) {
					pointData.point = pointData.animatePointTo;
					pointData.animatePointFrom = null;
					pointData.animatePointTo = null;
					return;
				}

				let newX = pointData.animatePointFrom.x + (pointData.animatePointTo.x - pointData.animatePointFrom.x) * t;
				let newY = pointData.animatePointFrom.y + (pointData.animatePointTo.y - pointData.animatePointFrom.y) * t;

				pointData.point.x = newX;
				pointData.point.y = newY;
			});

			if (isFinished) {
				needPointsAnimation = false;
				animationPointsStartTime = 0;
			}
		}

		function viewportAnimation(time) {
			if (!animationViewportStartTime) return;

			let { left: newLeft,
			      right: newRight,
			      bottom: newBottom,
			      top: newTop,
			    } = animationNewViewport;

			let { left: oldLeft,
			      right: oldRight,
			      bottom: oldBottom,
			      top: oldTop,
			    } = animationOldViewport;

			let elapsed = time - animationViewportStartTime;

			if (elapsed >= VIEWPORT_ANIMATION_DURATION) {
				viewport.left = newLeft;
				viewport.right = newRight;
				viewport.bottom = newBottom;
				viewport.top = newTop;

				animationOldViewport = null;
				animationNewViewport = null;
				animationViewportStartTime = 0;
			} else {
				let t = elapsed / VIEWPORT_ANIMATION_DURATION;
				t = t * (2 - t);

				viewport.left = oldLeft + (newLeft - oldLeft) * t;
				viewport.right = oldRight + (newRight - oldRight) * t;
				viewport.bottom = oldBottom + (newBottom - oldBottom) * t;
				viewport.top = oldTop + (newTop - oldTop) * t;
			}
		}
	}

	function redrawLines() {
		let {
		     left, right,
		     bottom, top,
		    } = viewport;

		let xWidth = right - left;
		let yWidth = top - bottom;

		// TODO: binary search?

		let linesToRemove = [];
		function getOrCreateLine() {
			if (linesToRemove.length) return linesToRemove.pop();

			let line = svgHelper.createElement('line');
			line.setAttribute('class', className || '');
			g.appendChild(line);

			return line;
		}

		let visibleIndexes = [];

		// find visible lines/to remove
		// start from 1, since 0 will not have left line
		{
			let prevPointData = linePoints[0];
			let prevPointX = -Infinity;

			for (let i = 1; i < linePoints.length - 1; i++) {
				let pointData = linePoints[i];

				let { point: { x },
				      leftLine,
				    } = pointData;

				let willBeVisible =
					    left <= prevPointX && prevPointX <= right
					 || left <= x && x <= right;

				if (willBeVisible) {
					visibleIndexes.push(i);
				} else {
					if (leftLine) linesToRemove.push(leftLine);

					pointData.leftLine = null;
					prevPointData.rightLine = null;
				}

				prevPointData = pointData;
				prevPointX = x;
			}
		}

		visibleIndexes.forEach(index => {
			let pointData = linePoints[index];

			let { leftLine,
			      rightLine
			    } = pointData;

			if (!leftLine && index > 1) {
				leftLine = getOrCreateLine();
				pointData.leftLine = leftLine;
				linePoints[index - 1].rightLine = leftLine;
			}

			if (!rightLine && index < linePoints.length - 2) {
				rightLine = getOrCreateLine();
				pointData.rightLine = rightLine;
				linePoints[index + 1].leftLine = rightLine;
			}
		});

		if (visibleIndexes.length) {
			let firstVisibleIndex = visibleIndexes[0];
			if (firstVisibleIndex > 1) updatePoint(firstVisibleIndex - 1);

			visibleIndexes.forEach(index => { updatePoint(index); });

			let lastVisibleIndex = visibleIndexes[visibleIndexes.length - 1];
			if (lastVisibleIndex < linePoints.length - 2) updatePoint(lastVisibleIndex + 1);
		}

		linesToRemove.forEach(line => {
			g.removeChild(line);
			svgHelper.freeElement(line);
		});

		prevRedrawXLeft = left;
		prevRedrawXRight = right;

		function updatePoint(index) {
			let pointData = linePoints[index];

			let { point: { x, y },
			      leftLine,
			      rightLine
			    } = pointData;

			let px = (WIDTH * ((x - left) / xWidth)) | 0;
			let py = (HEIGHT - HEIGHT * ((y - bottom) / yWidth)) | 0;

			if (leftLine) {
				leftLine.setAttribute('x2', px);
				leftLine.setAttribute('y2', py);
			}

			if (rightLine) {
				rightLine.setAttribute('x1', px);
				rightLine.setAttribute('y1', py);
			}
		}
	}

	this.destroy = function() {
		if (!g) return;

		svg.removeChild(g);
		g = null;
	};
}

if (module.hot) module.hot.accept();


