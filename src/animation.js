import { VIEWPORT_ANIMATION_DURATION } from './consts.js';

export default Animation;

function Animation(options) {
	let onViewportMoveStartCallbacks = [];
	let onViewportUpdateCallbacks = [];
	let animationFrames = [];

	let animationRunning = false;

	let viewport;
	let animationViewportStartTime = 0;
	let animationOldViewport = null;
	let animationNewViewport = null;

	let frameIndex = 0;

	this.createFrameState = function(fun) {
		return {
			_state: null,
			_stateFrameIndex: 0,

			getState(frameIndex) {
				if (this._stateFrameIndex === frameIndex) return this._state;

				this._state = fun();
				this._stateFrameIndex = frameIndex;

				return this._state;
			},
		};
	};

	this.onViewportMoveStart = callback => { onViewportMoveStartCallbacks.push(callback); };
	this.onViewportUpdate = (opts, callback) => {
		if (typeof opts === 'function') {
			callback = opts;
			opts = null;
		}

		onViewportUpdateCallbacks.push({ opts, callback });
	};
	this.animationFrame = (opts, callback) => {
		if (typeof opts === 'function') {
			callback = opts;
			opts = null;
		}

		let obj = {
			frameState: opts && opts.frameState,
			callback,
			cancelled: false,
		};

		animationFrames.push(obj);

		return {
			cancel() {
				if (!obj) return;

				obj.cancelled = true;
				obj = null;
			},
		};
	};

	this.setViewport = function(newViewport) { viewport = newViewport; };

	this.moveViewport = function(newViewport) {
		animationViewportStartTime = 0;
		animationOldViewport = viewport;
		animationNewViewport = {
			left: newViewport.left,
			right: newViewport.right,
			bottom: newViewport.bottom,
			top: newViewport.top,
		};

		onViewportMoveStartCallbacks.forEach(fun => { fun({ oldViewport: viewport, newViewport }); });

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
					frameIndex++;

					viewportAnimation(time);

					let needRemoveAnimationFrames = false;

					animationFrames.forEach(frame => {
						if (frame.cancelled) {
							needRemoveAnimationFrames = true;
							return;
						}

						let state;

						if (frame.frameState) state = frame.frameState.getState(frameIndex);

						frame.callback({ state, prevTime, time, viewport });

						if (frame.cancelled) needRemoveAnimationFrames = true;
					});

					if (needRemoveAnimationFrames) {
						animationFrames = animationFrames.filter(x => !x.cancelled);
					}

					loop(time);
				});
			}
		});

		function checkFinish(time) {
			if (animationNewViewport && !animationViewportStartTime) {
				animationViewportStartTime = time;
			}

			let isAnimationGoing = !!animationViewportStartTime || animationFrames.length;

			return !isAnimationGoing;
		}

		function viewportAnimation(time, state) {
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

			onViewportUpdateCallbacks.forEach(({ opts, callback }, i) => {
				let state;

				if (opts && opts.frameState) state = opts.frameState.getState(frameIndex);

				callback({ viewport, state });
			});
		}
	}
}