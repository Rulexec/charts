import ChartLine from '../src/chart-line.js';
import Scroller from '../src/scroller.js';
import AxisX from '../src/axis-x.js';
import AxisY from '../src/axis-y.js';
import SvgHelper from '../src/svg-helper.js';
import Animation from '../src/animation.js';
import { generalizePoints } from '../src/points-generalization.js';

import tgData from './chart_data.json';

let style = document.createElement('style');
style.appendChild(document.createTextNode(
`#charts_container {
	width: 400px;
	height: 450px;
}

#charts_container > svg {
	width: 100%;
	height: 100%;

	font-family: sans-serif;
}

#charts_container > svg .y-axis .line {
	stroke: #dadfe2;
}
#charts_container > svg .y-axis .label {
	fill: #242a2d;
	font-size: 14px;
}
#charts_container > svg .x-axis text {
	fill: #242a2d;
	font-size: 14px;
}

#scroller_container {
	margin-top: 20px;
	max-width: 400px;
	height: 114px;
}

#toggles_container {
	margin-top: 20px;
}

.x-scroller {
	width: 100%;
	height: 100%;

	position: relative;
}

.x-scroller > svg {
	position: absolute;
}

.x-scroller > .cover {
	background: #d8f4ff;
	opacity: 0.4;

	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
}

.x-scroller > .window {
	box-sizing: border-box;

	border-left: 12px solid;
	border-right: 12px solid;

	border-color: rgba(134, 221, 255, 0.4);

	position: absolute;
	top: 0;
	left: 0;
	height: 100%;

	cursor: ew-resize;
}

.x-scroller > .window > .move {
	box-sizing: border-box;

	border-top: 3px solid;
	border-bottom: 3px solid;

	border-color: rgba(134, 221, 255, 0.4);

	width: 100%;
	height: 100%;

	cursor: grab;
}

body.x-cursor-grabbing * {
	cursor: grabbing !important;
}

body.x-cursor-ew-resize * {
	cursor: ew-resize !important;
}`));

document.head.appendChild(style);

let chartLinesStyle = document.createElement('style');
document.head.appendChild(chartLinesStyle);

const HEIGHT = 450;
const PADDING_BOTTOM = 10;

let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox', `0 0 400 ${HEIGHT}`);

let div = document.createElement('div');
div.id = 'charts_container';
div.appendChild(svg);

document.body.appendChild(div);

let scrollerDiv = document.createElement('div');
scrollerDiv.id = 'scroller_container';

document.body.appendChild(scrollerDiv);

let lineTogglesDiv = document.createElement('div');
lineTogglesDiv.id = 'toggles_container';
document.body.appendChild(lineTogglesDiv);

let svgHelper = new SvgHelper();

let animation = new Animation();

const AXIS_X_HEIGHT = 30;

let axisX = new AxisX({
	svg,
	svgHelper,
	viewBox: {
		left: 0,
		top: HEIGHT - AXIS_X_HEIGHT,
		width: 400,
		height: AXIS_X_HEIGHT,
	},

	getLabel(x) {
		let date = new Date(x);

		let month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];

		return month + ' ' + date.getDate();
	},

	animation,
});

let axisY = new AxisY({
	svg,
	svgHelper,
	viewBox: {
		left: 0,
		top: 0,
		width: 400,
		height: HEIGHT - AXIS_X_HEIGHT,
	},
	className: 'y-axis',

	animation,
});

let lines = [];

{
	let data = tgData[4];

	let xColumn = data.columns[0];

	let linesCount = data.columns.length - 1;
	let xColumnLength = xColumn.length;

	for (let i = 0; i < linesCount; i++) {
		let yColumn = data.columns[i + 1];

		let key = yColumn[0];

		let points = [];

		for (let j = 1; j < xColumnLength; j++) {
			let x = xColumn[j];
			let y = yColumn[j];

			points.push({ x, y });
		}

		lines.push({
			id: key,
			className: 'chart-line-' + i,
			_name: data.names[key],
			_color: data.colors[key],
			points,
		});
	}
}

{
	let style = lines.map(({ className, _color }) => {
		let s = `svg .${className} {\n`;
		s += `stroke: ${_color};\n`;
		s += `stroke-width: 2px;\n`;
		s += `}`;

		return s;
	}).join('\n');

	chartLinesStyle.appendChild(document.createTextNode(style));
}

lines.forEach(line => {
	line._chartLine = new ChartLine({
		svg,
		svgHelper,
		viewBox: {
			width: 400,
			height: HEIGHT - AXIS_X_HEIGHT - PADDING_BOTTOM,
		},
		className: line.className,

		animation,
	});
});

function hintViewport(viewport) {
	viewport.bottom = 0;

	viewport.left = Math.floor(viewport.left);
	viewport.right = Math.ceil(viewport.right);
	viewport.top = Math.ceil(viewport.top);

	axisY.hintViewport(viewport);
}

let scroller = new Scroller({
	svgHelper,
	onViewportUpdate(viewport) {
		hintViewport(viewport);

		animation.moveViewport(viewport);
	},
});

scrollerDiv.appendChild(scroller.getElement());
scroller.setState({
	lines,
});
scroller.onShown();

{
	let viewport = scroller.getViewport();
	hintViewport(viewport);

	animation.setViewport(viewport);
	axisX.setState({ viewport });
	axisY.setState({ viewport });

	lines.forEach(line => {
		let { _chartLine,
		      points,
		    } = line;

		_chartLine.setState({
			points,
			viewport,
		});
	});

	lines.forEach(line => {
		let lineId = line.id;

		let label = document.createElement('label');

		let checkbox = document.createElement('input');
		checkbox.setAttribute('type', 'checkbox');
		checkbox.checked = true;

		checkbox.addEventListener('change', () => {
			let toggle = checkbox.checked;

			scroller.toggleLine(lineId, toggle);

			line._chartLine.toggle(toggle);
		});

		label.appendChild(checkbox);

		label.appendChild(document.createTextNode(' ' + line._name));

		lineTogglesDiv.appendChild(label);
	});
}

//

/*let chartLineG = new ChartLine({
	svg,
	svgHelper,
	viewBox: {
		width: 400,
		height: 300,
	},
	className: 'chart-line-g',
});

chartLineG.setState({
	points,
	viewport: {
		left: 0,
		right: 142,
		bottom: 0,
		top: 100,
	},
});*/
