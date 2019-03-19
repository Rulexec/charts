import { VIEWPORT_ANIMATION_DURATION } from './consts.js';

export default AxisX;

const OPACITY_DURATION = 250;

function AxisX(options) {
	let { svg,
	      svgHelper,
	      viewBox: { left: LEFT, top: TOP, width: WIDTH, height: HEIGHT },
	      getLabel,
	    } = options;

	let g = svgHelper.createElement('g');
	svg.appendChild(g);

	g.setAttribute('transform', `translate(${LEFT} ${TOP})`);

	let animationRunning = false;

	let viewport;
	let animationViewportStartTime = 0;
	let animationOldViewport = null;
	let animationNewViewport = null;

	let animationLabelsTransition = false;

	let labels = [];

	let maxHalfWidth = 0;
	let stepChartX;
	let oldStepPixelsX;

	this.setState = function(options) {
		let { left, right } = options.viewport;

		viewport = { left, right };
		animationViewportStartTime = 0;
		animationOldViewport = null;
		animationNewViewport = null;

		// TODO: reuse/free elements
		g.innerHTML = '';
		labels = [];

		let leftTextNode = createTextNode(getLabel(left));
		let rightTextNode = createTextNode(getLabel(right));

		let maxWidth = 0;

		{
			let rect;

			rect = leftTextNode.getBoundingClientRect();

			leftTextNode.setAttribute('x', (rect.width / 2) | 0);

			maxWidth = rect.width;

			rect = rightTextNode.getBoundingClientRect();

			rightTextNode.setAttribute('x', WIDTH - (rect.width / 2) | 0);

			if (rect.width > maxWidth) maxWidth = rect.width;
		}

		let labelWidth = maxWidth * 1.5;

		let leftX = labelWidth / 2;
		let rightX = WIDTH - leftX;

		let innerSpace = rightX - leftX - labelWidth;

		let innerCount = Math.floor(innerSpace / labelWidth);

		if (innerSpace - innerCount * labelWidth >= maxWidth * 1.2) {
			innerCount++;
		}

		let stepX = (innerSpace + labelWidth) / (innerCount + 1);

		stepChartX = getChartXByPixelsX(stepX, left, right) - left;
		oldStepPixelsX = stepX;

		leftTextNode.setAttribute('x', leftX | 0);
		rightTextNode.setAttribute('x', rightX | 0);

		let leftChartX = getChartXByPixelsX(leftX, left, right);
		let rightChartX = getChartXByPixelsX(rightX, left, right);

		leftTextNode.textContent = '' + getLabel(leftChartX);
		rightTextNode.textContent = '' + getLabel(rightChartX);

		labels.push({
			x: leftChartX,
			node: leftTextNode,
			halfWidth: leftTextNode.getBoundingClientRect().width / 2,
		});

		for (let i = 0; i < innerCount; i++) {
			let x = leftX + (i + 1) * stepX;
			let chartX = getChartXByPixelsX(x, left, right);

			let text = '' + getLabel(chartX);

			let textNode = createTextNode(text);

			textNode.setAttribute('x', x | 0);

			labels.push({
				x: chartX,
				node: textNode,
				halfWidth: textNode.getBoundingClientRect().width / 2,
			});
		}

		labels.push({
			x: rightChartX,
			node: rightTextNode,
			halfWidth: rightTextNode.getBoundingClientRect().width / 2,
		});

		labels.forEach(label => {
			if (label.halfWidth > maxHalfWidth) maxHalfWidth = label.halfWidth;
		});
	};

	this.moveViewport = function(newViewport) {
		animationViewportStartTime = 0;
		animationOldViewport = viewport;
		animationNewViewport = {
			left: newViewport.left,
			right: newViewport.right,
		};

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
					let opts = {
						redrawLabels: false,
					};

					viewportAnimation(time, opts);

					if (opts.redrawLabels) redrawLabels();

					transitionLabels(time);

					loop(time);
				});
			}
		});

		function checkFinish(time) {
			if (animationNewViewport && !animationViewportStartTime) {
				animationViewportStartTime = time;
			}

			let isAnimationGoing = !!animationViewportStartTime || animationLabelsTransition;

			return !isAnimationGoing;
		}

		function viewportAnimation(time, opts) {
			if (!animationViewportStartTime) return;

			let { left: newLeft,
			      right: newRight,
			    } = animationNewViewport;

			let { left: oldLeft,
			      right: oldRight,
			    } = animationOldViewport;

			let elapsed = time - animationViewportStartTime;

			if (elapsed >= VIEWPORT_ANIMATION_DURATION) {
				viewport.left = newLeft;
				viewport.right = newRight;

				animationOldViewport = null;
				animationNewViewport = null;
				animationViewportStartTime = 0;
			} else {
				let t = elapsed / VIEWPORT_ANIMATION_DURATION;
				t = t * (2 - t);

				viewport.left = oldLeft + (newLeft - oldLeft) * t;
				viewport.right = oldRight + (newRight - oldRight) * t;
			}

			opts.redrawLabels = true;
		}
	}

	function redrawLabels(opts) {
		if (!labels.length) {
			console.error('NO LABELS');
			return;
		}

		let { left, right } = viewport;

		let labelsToRemove = [];
		let labelsToAdd = [];

		let stepPixelsX = getPixelsXByChartX(left + stepChartX, left, right);

		// Insert/remove middle labels

		let needSortLabels =
			    stepPixelsX - maxHalfWidth * 2.5 <= 0
			 || stepPixelsX >= maxHalfWidth * 5;

		if (needSortLabels) {
			labels.sort((a, b) => a.x - b.x);
		}

		// remove every second label
		while (stepPixelsX - maxHalfWidth * 2.2 <= 0) {
			let remove = true;

			for (let i = 0; i < labels.length; i++) {
				let label = labels[i];

				if (label.removing) continue;

				if (remove) {
					label.removing = true;
					label.adding = false;

					label.transitionStartTime = 0;
					animationLabelsTransition = true;
				}

				remove = !remove;
			}

			stepChartX *= 2;
			stepPixelsX = getPixelsXByChartX(left + stepChartX, left, right);

			console.log('increase', stepPixelsX, stepChartX);
		}

		// add labels to the middle
		while (stepPixelsX >= maxHalfWidth * 5) {
			stepChartX /= 2;
			stepPixelsX = getPixelsXByChartX(left + stepChartX, left, right);

			let newLabels = [];

			let isFirstNonRemoving = true;
			let lastNonRemovingLabel;

			for (let i = 0; i < labels.length;) {
				let label = labels[i];

				newLabels.push(label);

				i++;

				if (label.removing) continue;

				lastNonRemovingLabel = label;

				if (isFirstNonRemoving) {
					isFirstNonRemoving = false;

					// FIXME: extract label creation from `getOrCreateLabel`
					// FIXME: there can be `removing` at the same place
					let newLabel = getOrCreateLabel(label.x - stepChartX, 0, true);

					newLabel.removing = false;
					newLabel.adding = true;
					newLabel.transitionStartTime = 0;

					newLabels.push(newLabel);
				}

				let j = i;

				while (i < labels.length) {
					let nextLabel = labels[i];
					if (nextLabel.removing) {
						newLabels.push(nextLabel);

						i++;
						continue;
					}

					let middleCount = i - j;

					if (middleCount > 0) {
						let middle = j + (middleCount / 2) | 0;

						let removingLabel = labels[middle];

						removingLabel.removing = false;
						removingLabel.adding = true;
						removingLabel.transitionStartTime = 0;
					} else {
						// FIXME: extract label creation from `getOrCreateLabel`
						let newLabel = getOrCreateLabel(label.x + stepChartX, 0, true);

						newLabel.removing = false;
						newLabel.adding = true;
						newLabel.transitionStartTime = 0;

						newLabels.push(newLabel);
					}

					animationLabelsTransition = true;
					break;
				}
			}

			if (lastNonRemovingLabel) {
				isFirstNonRemoving = false;

				// FIXME: extract label creation from `getOrCreateLabel`
				// FIXME: there can be `removing` at the same place
				let newLabel = getOrCreateLabel(lastNonRemovingLabel.x + stepChartX, 0, true);

				newLabel.removing = false;
				newLabel.adding = true;
				newLabel.transitionStartTime = 0;

				newLabels.push(newLabel);
			}

			labels = newLabels;
		}

		// Move labels/remove outscreen

		let mostLeftChartX = Infinity;
		let mostRightChartX = -Infinity;
		let mostLeftPixelsX, mostRightPixelsX;

		labels.forEach(label => {
			let { x, node, halfWidth } = label;

			let pixelsX = getPixelsXByChartX(x, left, right);

			if (x < mostLeftChartX && !label.removing) {
				mostLeftChartX = x;
				mostLeftPixelsX = pixelsX;
			}
			if (x > mostRightChartX && !label.removing) {
				mostRightChartX = x;
				mostRightPixelsX = pixelsX;
			}

			let needRemove = false;

			if (pixelsX + halfWidth < 0) needRemove = true;
			else if (pixelsX - halfWidth > WIDTH) needRemove = true;

			if (needRemove) {
				labelsToRemove.push(label);
				return;
			}

			node.setAttribute('x', pixelsX | 0);
		});

		// insert labels

		do {
			mostRightChartX += stepChartX;
			mostRightPixelsX += stepPixelsX;
		} while (mostRightChartX < 0);

		while (mostRightPixelsX <= WIDTH + maxHalfWidth * 1.5) {
			getOrCreateLabel(mostRightChartX, mostRightPixelsX);

			mostRightChartX += stepChartX;
			mostRightPixelsX += stepPixelsX;
		}

		do {
			mostLeftChartX -= stepChartX;
			mostLeftPixelsX -= stepPixelsX;
		} while (mostRightChartX < 0);

		while (mostLeftPixelsX >= -maxHalfWidth * 1.5) {
			getOrCreateLabel(mostLeftChartX, mostLeftPixelsX);

			mostLeftChartX -= stepChartX;
			mostLeftPixelsX -= stepPixelsX;
		}

		labelsToRemove.forEach(label => {
			g.removeChild(label.node);

			svgHelper.freeElement(label.node);
		});

		if (labelsToRemove.length) {
			let index = 0;

			labels = labels.filter(label => {
				if (index >= labelsToRemove.length) return true;

				if (labelsToRemove[index] === label) {
					index++;
					return false;
				}

				return true;
			});
		}

		labelsToAdd.forEach(label => { labels.push(label); });

		function getOrCreateLabel(chartX, pixelsX, doNotPush) {
			let label;

			if (labelsToRemove.length) {
				label = labelsToRemove.pop();
			} else {
				label = {
					x: 0,
					node: createTextNode(),
					halfWidth: 0,
				};

				g.appendChild(label.node);

				if (!doNotPush) labelsToAdd.push(label);
			}

			label.x = chartX;
			label.node.textContent = getLabel(chartX);
			label.halfWidth = label.node.getBoundingClientRect().width / 2;

			label.node.setAttribute('x', pixelsX | 0);

			return label;
		}
	}

	function transitionLabels(time) {
		if (!animationLabelsTransition) return;

		animationLabelsTransition = false;

		let labelsToRemove = [];

		labels.forEach(label => {
			if (!label.transitionStartTime && (label.removing || label.adding)) {
				label.transitionStartTime = time;

				if (typeof label.opacity !== 'number') {
					label.opacity = label.adding ? 0 : 1;
					label.startOpacity = label.adding ? 0 : 1;

					if (label.adding) {
						label.node.style.opacity = 0;
					}
				}

				label.startOpacity = label.opacity;
				label.endOpacity = label.adding ? 1 : 0;

				animationLabelsTransition = true;
				return;
			}

			if (!label.transitionStartTime) return;

			let elapsed = time - label.transitionStartTime;

			if (elapsed >= OPACITY_DURATION) {
				label.node.style.opacity = label.endOpacity;

				label.transitionStartTime = 0;

				if (label.removing) labelsToRemove.push(label);

				label.removing = false;
				label.adding = false;
			} else {
				let t = elapsed / OPACITY_DURATION;

				if (label.removing) t = t * (2 - t);
				else t = t * t;

				label.opacity = label.startOpacity + (label.endOpacity - label.startOpacity) * t;
				label.node.style.opacity = label.opacity;

				animationLabelsTransition = true;
			}
		});

		labelsToRemove.forEach(label => {
			g.removeChild(label.node);

			svgHelper.freeElement(label.node);
		});

		if (labelsToRemove.length) {
			let index = 0;

			labels = labels.filter(label => {
				if (index >= labelsToRemove.length) return true;

				if (labelsToRemove[index] === label) {
					index++;
					return false;
				}

				return true;
			});
		}
	}

	function getChartXByPixelsX(x, left, right) {
		return left + (right - left) * (x / WIDTH);
	}
	function getPixelsXByChartX(x, left, right) {
		return WIDTH * (x - left) / (right - left);
	}

	function createTextNode(text) {
		let node = svgHelper.createElement('text');

		node.setAttribute('text-anchor', 'middle');
		node.setAttribute('alignment-baseline', 'middle');

		node.setAttribute('y', '' + ((HEIGHT / 2) | 0));

		node.textContent = text;

		g.appendChild(node);

		return node;
	}
}