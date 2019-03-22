import { VIEWPORT_ANIMATION_DURATION } from './consts.js';

export default AxisY;

const OPACITY_DURATION = VIEWPORT_ANIMATION_DURATION;

const LINE_HEIGHT = 20;
const LINE_GAP = 75;

function AxisY(options) {
	let { svg,
	      svgHelper,
	      viewBox: { left: LEFT, top: TOP, width: WIDTH, height: HEIGHT },
	      className,
	    } = options;

	let g = svgHelper.createElement('g');
	svg.appendChild(g);

	if (LEFT || TOP) g.setAttribute('transform', `translate(${LEFT} ${TOP})`);

	let animationRunning = false;

	let viewport;
	let animationViewportStartTime = 0;
	let animationOldViewport = null;
	let animationNewViewport = null;

	let animationLinesTransition = false;

	let linesCount = Math.floor((HEIGHT - LINE_HEIGHT) / LINE_GAP) + 1;
	let lineGapPx = (HEIGHT - LINE_HEIGHT) / linesCount;

	let lines = [];
	let linesYMap = new Map();

	this.setState = function(options) {
		let { bottom, top } = options.viewport;
		viewport = { bottom, top };

		// WARN: COPYPASTED to `moveViewport`
		let topLineChartY = bottom + (top - bottom) * (lineGapPx * linesCount / HEIGHT);

		let chartStep = (topLineChartY - bottom) / (linesCount - 1);

		let lineChartY = bottom;
		let linePxY = 0;

		for (let i = 0; i < linesCount; i++) {
			let line = createLine(lineChartY);
			lines.push(line);

			linesYMap.set(lineChartY, line);

			let px = HEIGHT * (line.y - bottom) / (top - bottom);

			line.setPxY(px);

			lineChartY += chartStep;
			linePxY += lineGapPx;
		}
	};

	function createLine(chartY) {
		let lineG = svgHelper.getOrCreateTree('axisY:line', () => {
			let lineG = svgHelper.createElement('g');
			if (className) lineG.setAttribute('class', className);

			let line = svgHelper.createElement('line');
			line.setAttribute('class', 'line');
			line.setAttribute('x1', '0');
			line.setAttribute('y1', '0');
			line.setAttribute('x2', WIDTH);
			line.setAttribute('y2', '0');
			lineG.appendChild(line);

			return lineG;
		});

		g.appendChild(lineG);

		return {
			y: chartY,
			node: lineG,
			setPxY(y) {
				lineG.setAttribute('transform', `translate(0 ${(HEIGHT - y) | 0}.5)`);
			},
		};
	}

	this.moveViewport = function(newViewport) {
		animationViewportStartTime = 0;
		animationOldViewport = viewport;
		animationNewViewport = {
			bottom: newViewport.bottom,
			top: newViewport.top,
		};

		let { bottom, top } = newViewport;

		// COPYPASTE of `setState`
		let topLineChartY = bottom + (top - bottom) * (lineGapPx * linesCount / HEIGHT);

		let chartStep = (topLineChartY - bottom) / (linesCount - 1);

		let lineChartY = bottom;
		let linePxY = 0;

		let linesToRemove = new Map(linesYMap);

		for (let i = 0; i < linesCount; i++) {
			let line;

			let existingLine = linesYMap.get(lineChartY);
			if (existingLine) {
				line = existingLine;

				linesToRemove.delete(lineChartY);

				if (line.removing) animationLinesTransition = true;
			} else {
				line = createLine(lineChartY);
				lines.push(line);

				linesYMap.set(lineChartY, line);

				line.node.style.opacity = '0';

				animationLinesTransition = true;
			}

			line.removing = false;
			line.adding = true;
			line.transitionStartTime = 0;

			let px = HEIGHT * (line.y - bottom) / (top - bottom);

			line.setPxY(px);

			lineChartY += chartStep;
			linePxY += lineGapPx;
		}

		if (linesToRemove.size) {
			animationLinesTransition = true;

			linesToRemove.forEach(line => {
				line.adding = false;
				line.removing = true;
				line.transitionStartTime = 0;
			});
		}

		startAnimation();
	};

	this.hintViewport = function(viewport) {
		let { top } = viewport;

		let topLog = Math.log10(top);

		let newTop = Math.pow(10, Math.floor(topLog));
		newTop = newTop + Math.ceil((top - newTop) / (newTop / 4)) * (newTop / 4);

		viewport.top = newTop;
	};

	function redrawLines() {
		let { bottom, top } = viewport;

		lines.forEach(line => {
			let px = HEIGHT * (line.y - bottom) / (top - bottom);

			line.setPxY(px);
		});
	}

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
					let opts = {
						redrawLines: false,
					};

					viewportAnimation(time, opts);

					if (opts.redrawLines) redrawLines();

					transitionLines(time);

					loop(time);
				});
			}
		});

		function checkFinish(time) {
			if (animationNewViewport && !animationViewportStartTime) {
				animationViewportStartTime = time;
			}

			let isAnimationGoing = !!animationViewportStartTime || animationLinesTransition;

			return !isAnimationGoing;
		}

		function viewportAnimation(time, opts) {
			if (!animationViewportStartTime) return;

			let { bottom: newBottom,
			      top: newTop,
			    } = animationNewViewport;

			let { bottom: oldBottom,
			      top: oldTop,
			    } = animationOldViewport;

			let elapsed = time - animationViewportStartTime;

			if (elapsed >= VIEWPORT_ANIMATION_DURATION) {
				viewport.bottom = newBottom;
				viewport.top = newTop;

				animationOldViewport = null;
				animationNewViewport = null;
				animationViewportStartTime = 0;
			} else {
				let t = elapsed / VIEWPORT_ANIMATION_DURATION;
				t = t * (2 - t);

				viewport.bottom = oldBottom + (newBottom - oldBottom) * t;
				viewport.top = oldTop + (newTop - oldTop) * t;
			}

			opts.redrawLines = true;
		}
	}

	function transitionLines(time) {
		if (!animationLinesTransition) return;

		animationLinesTransition = false;

		let linesToRemove = [];

		lines.forEach(line => {
			if (!line.transitionStartTime && (line.removing || line.adding)) {
				line.transitionStartTime = time;

				if (typeof line.opacity !== 'number') {
					line.opacity = line.adding ? 0 : 1;
					line.startOpacity = line.adding ? 0 : 1;

					if (line.adding) {
						line.node.style.opacity = 0;
					}
				}

				line.startOpacity = line.opacity;
				line.endOpacity = line.adding ? 1 : 0;

				animationLinesTransition = true;
				return;
			}

			if (!line.transitionStartTime) return;

			let elapsed = time - line.transitionStartTime;

			if (elapsed >= OPACITY_DURATION) {
				line.node.style.opacity = line.endOpacity;

				line.transitionStartTime = 0;

				if (line.removing) linesToRemove.push(line);

				line.removing = false;
				line.adding = false;
			} else {
				let t = elapsed / OPACITY_DURATION;

				if (line.removing) t = t * (2 - t);
				else t = t * t;

				line.opacity = line.startOpacity + (line.endOpacity - line.startOpacity) * t;
				line.node.style.opacity = line.opacity;

				animationLinesTransition = true;
			}
		});

		linesToRemove.forEach(line => {
			g.removeChild(line.node);

			svgHelper.freeTree('axisY:line', line.node);

			linesYMap.delete(line.y);
		});

		if (linesToRemove.length) {
			let index = 0;

			lines = lines.filter(line => {
				if (index >= linesToRemove.length) return true;

				if (linesToRemove[index] === line) {
					index++;
					return false;
				}

				return true;
			});
		}
	}
}