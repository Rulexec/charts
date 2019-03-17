import ChartLine from '../src/chart-line.js';
import SvgHelper from '../src/svg-helper.js';
import { generalizePoints } from '../src/points-generalization.js';

let style = document.createElement('style');
style.innerHTML =
`#charts_container {
	width: 400px;
	height: 300px;
}

#charts_container > svg {
	width: 100%;
	height: 100%;
}

#charts_container > svg .chart-line {
	stroke: red;
}

#charts_container > svg .chart-line-g {
	stroke: blue;
}`;

document.head.appendChild(style);

let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox', '0 0 400 300');

let div = document.createElement('div');
div.id = 'charts_container';
div.appendChild(svg);

document.body.appendChild(div);

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

let points = [];

for (let x = 0; x <= 142; x += 0.001) {
	let y = 50 + Math.sin(8 * Math.PI * x / 142) * 30 + (0.5 - Math.random()) * 5;

	points.push({
		x,
		y,
	});
}


/*chartLine.setState({
	points,
	viewport: {
		left: 0,
		right: 142,
		bottom: 0,
		top: 100,
	},
});*/

let generalized = generalizePoints({
	points,
	step: 0.75,
});

generalized = generalized.map(({ x, y }) => ({ x, y: y + 10 }));

let chartLineG = new ChartLine({
	svg,
	svgHelper,
	viewBox: {
		width: 400,
		height: 300,
	},
	className: 'chart-line-g',
});

chartLineG.setState({
	points: generalized,
	viewport: {
		left: 0,
		right: 142,
		bottom: 0,
		top: 100,
		/*left: 55,
		right: 70,
		bottom: 28,
		top: 50,*/
	},
});

/*setTimeout(() => {
	chartLineG.moveViewport({
		left: 55,
		right: 70,
		bottom: 28,
		top: 50,
	});
}, 1000 + 500);*/

demo: {
	let start = -1;
	let end = -1;

	points.forEach(({ x }, i) => {
		if (start < 0 && x >= 55) start = i;
		if (end < 0 && x >= 70) end = i;
	});

	let generalizedZ = generalizePoints({
		points: points.slice(start - 1, end + 2),
		step: 2 * (70 - 55) / 400,
	});

	generalizedZ = generalizedZ.map(({ x, y }) => ({ x, y: y + 10 }));

	start = -1;
	end = -1;

	generalized.forEach(({ x }, i) => {
		if (start < 0 && x >= generalizedZ[0].x) start = i;
		if (end < 0 && x >= generalizedZ[generalizedZ.length - 1].x) end = i;
	});

	setTimeout(() => {
		let oldPoints = generalized.slice(start - 1, end + 1);

		console.log(oldPoints, generalizedZ);

		let { fromIndex: replacedFrom, toIndex: replacedTo } = chartLineG.replacePoints({
			points: generalizedZ,
			fromIndex: start - 1,
			toIndex: end,
		});

		chartLineG.moveViewport({
			left: 55,
			right: 70,
			bottom: 28,
			top: 50,
		});

		setTimeout(() => {
			chartLineG.replacePoints({
				points: oldPoints,
				fromIndex: replacedFrom,
				toIndex: replacedTo,
				//fromIndex: start - 1,
				//toIndex: start - 1 + generalizedZ.length - 1,
			});

			chartLineG.moveViewport({
				left: 0,
				right: 142,
				bottom: 0,
				top: 100,
			});
		}, 1000 + 500 + 500 + 500);
	}, 1000 + 500);
}

/*
let points = [
	{ x: 0, y: 0 },
	{ x: 0, y: 10 },
	{ x: 10, y: 20 },
	{ x: 20, y: 10 },
	{ x: 20, y: 0 },
	{ x: 20, y: 10 },
	{ x: 30, y: 20 },
	{ x: 40, y: 10 },
	{ x: 40, y: 0 },
	{ x: 40, y: 70 },
	{ x: 50, y: 80 },
	{ x: 60, y: 70 },
	{ x: 60, y: 0 },
	{ x: 60, y: 10 },
	{ x: 70, y: 20 },
	{ x: 80, y: 10 },
	{ x: 80, y: 0 },
	{ x: 80, y: 10 },
	{ x: 90, y: 20 },
	{ x: 100, y: 10 },
	{ x: 100, y: 0 },
	{ x: 110, y: 0 },
	{ x: 120, y: 10 },
	{ x: 140, y: 10 },
	{ x: 130, y: 0 },
];

setTimeout(() => {
	chartLine.moveViewport({
		left: 50,
		right: 140,
		bottom: 0,
		top: 150,
	});
}, 1000 + 500);

setTimeout(() => {
	chartLine.moveViewport({
		left: -20,
		right: 60,
		bottom: 0,
		top: 150,
	});
}, 1000 + 500 + 500 + 200);

setTimeout(() => {
	chartLine.moveViewport({
		left: 0,
		right: 140,
		bottom: 0,
		top: 100,
	});
}, 1000 + 500 + 500 + 500 + 200 + 200);*/