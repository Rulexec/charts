import ChartLine from '../src/chart-line.js';
import Scroller from '../src/scroller.js';
import SvgHelper from '../src/svg-helper.js';
import { generalizePoints } from '../src/points-generalization.js';

import tgData from './chart_data.json';

let style = document.createElement('style');
style.appendChild(document.createTextNode(
`#charts_container {
	width: 400px;
	height: 300px;
}

#charts_container > svg {
	width: 100%;
	height: 100%;
}

#scroller_container {
	margin-top: 20px;
	max-width: 400px;
	height: 114px;
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
}`));

document.head.appendChild(style);

let chartLinesStyle = document.createElement('style');
document.head.appendChild(chartLinesStyle);

let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox', '0 0 400 300');

let div = document.createElement('div');
div.id = 'charts_container';
div.appendChild(svg);

document.body.appendChild(div);

let scrollerDiv = document.createElement('div');
scrollerDiv.id = 'scroller_container';

document.body.appendChild(scrollerDiv);

let svgHelper = new SvgHelper();

let chartLine = new ChartLine({
	svg,
	svgHelper,
	viewBox: {
		width: 400,
		height: 300,
	},
	className: 'chart-line',
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
			className: 'chart-line-' + i,
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
			height: 300,
		},
		className: line.className,
	});
});

let scroller = new Scroller({
	svgHelper,
	onViewportUpdate(viewport) {
		lines.forEach(({ _chartLine }) => {
			_chartLine.moveViewport(viewport);
		});
	},
});

scrollerDiv.appendChild(scroller.getElement());
scroller.setState({
	lines,
});
scroller.onShown();

{
	let viewport = scroller.getViewport();

	lines.forEach(line => {
		let { _chartLine,
		      points,
		    } = line;

		_chartLine.setState({
			points,
			viewport,
		});
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
