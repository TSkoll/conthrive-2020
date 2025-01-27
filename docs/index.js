const chartDiv = document.getElementById("charts");
const tableDiv = document.getElementById("table");
setElementShown(tableDiv, false);

let consumption = {};
let metadata;
let zoomFlag = false;
let c;
let comparer = "people";
let resolution;

let charts = {
    buildingCharts: [],
    other: []
}

Promise.all([
    fetchWaterConsum(),
    fetchMetaData()
]).then(values => {
    const tempConsumption = convertEpochToDate(values[0]);
    const tempKeys = Object.keys(tempConsumption);
    for (let tempKey of tempKeys) {
        consumption[tempKey] = values[0][tempKey].filter(x => x.date.getUTCFullYear() == 2019);
    }
    metadata = values[1];

    generateCharts();
    const data = generateData();
    updateCharts(data);

    for (let i = 1; i < charts.buildingCharts.length; i++) {
        setElementShown(charts.buildingCharts[i].hostDiv, false)
    }
});

function generateCharts() {
    const keys = Object.keys(metadata);

    for (let key of keys) {
        const m = metadata[key];

        const hostDiv = document.createElement("div");

        const title = document.createElement("h3")
        title.innerText = `Housing ${Number(key) + 1}`

        const description = document.createElement("p");
        description.innerText = `
        Built: ${m.year}
        Volume: ${m.volume || "Unknown"} Cubic meters
        Apartments: ${m.apartments || "Unknown"}
        Inhabitants: ${m.people || "Unknown"}
        `;

        hostDiv.appendChild(title);
        hostDiv.appendChild(description);

        chartDiv.appendChild(hostDiv);

        const ctx = createCanvas(hostDiv);
        const chart = drawChart(ctx,
            "line",
            null,
            null, {
                onClick: function(evt) {
                    
                    console.log('Clicked');
                    if(zoomFlag) {
                        const oldData = generateData();
                        updateCharts(oldData);       
                        zoomFlag = false;
                        return;
                    }
                    const element = chart.getElementAtEvent(evt);
                    const pointIndex = chartClickEvent(evt, element);
                    if(pointIndex < 0) {
                        pointIndex = 0;
                        return;
                    }
                    const pointDate = c[pointIndex * resolution].date;
                    console.log(getNumberOfWeek(pointDate));

                    const monthlyTotals = groupData(c, 2, pointDate.getUTCMonth() + 1, getNumberOfWeek(pointDate));
                    chart.data.labels = Array.from(new Array(monthlyTotals.length).keys());
                    chart.data.datasets.forEach(set => {
                        set.data.forEach(item => {
                            chart.data.datasets[0].data.pop();
                        })
                    })

                    chart.data.datasets[1].data = [];

                    monthlyTotals.forEach(item => {
                        chart.data.datasets[0].data.push(item)
                    })
                    chart.update();
                    zoomFlag = true;
            }
            }
        );


        charts.buildingCharts.push({
            hostDiv,
            ctx,
            chart
        });
    }
}

function getNumberOfWeek(date) {
    const firstDayOfYear = new Date(date.getUTCFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}


function generateData() {
    const keys = Object.keys(consumption);

    const totals = [];
    const weekBuildings = {}
    let recent = [];
    for (let key of keys) {
        c = consumption[key];
        const grouped = groupData(c, 0, 0, 0);
        const m = metadata[key];

        totals.push({
            meta: m,
            values: grouped.reduce((a, b) => a + b, 0)
        });

        recent.push(grouped.map(x => x / m[comparer]));

        for (let i = 0; i < grouped.length; i++) {
            if (!weekBuildings[i]) {
                weekBuildings[i] = {
                    count: 0,
                    amount: 0,
                    people: 0,
                    volume: 0,
                    apartments: 0
                }
            }


            weekBuildings[i].count++;
            weekBuildings[i].amount += grouped[i];
            weekBuildings[i].people += m.people;
            weekBuildings[i].volume += m.volume;
            weekBuildings[i].apartments += m.apartments;
        }
    }

    let avg = [];

    const wBKeys = Object.keys(weekBuildings);
    for (let i = 0; i < wBKeys.length; i++) {
        const wBK = wBKeys[i];
        const wB = weekBuildings[wBK];

        avg.push(wB.amount / wB[comparer]);
    }

    return {
        avg,
        totals,
        weekBuildings,
        recent
    }
}

function updateCharts(data) {
    charts.buildingCharts.forEach((item, i) => {
        const chart = item.chart;

        chart.data.labels = Array.from(new Array(data.recent[i].length - 1).keys());
        chart.data.datasets = [];
        chart.data.datasets.push({
            label: "Consumption",
            data: data.recent[i].slice(0, data.recent[i].length - 1),
            borderColor: "rgb(255, 0, 0)"
        });

        chart.data.datasets.push({
            label: "Average",
            data: data.avg.slice(0, data.avg.length - 1),
            borderColor: "rgb(0,0,255)"
        })

        chart.update();
    });
}

function createCanvas(hostdiv) {
    const e = document.createElement("canvas")
    hostdiv.appendChild(e);
    return e.getContext("2d");
}

function drawChart(ctx, type, labels, datasets, options) {
    return new Chart(ctx, {
        type,
        data: {
            labels,
            datasets
        },
        options
    });
}

function groupData(data, switchkey, month, week) {
    const yearlyData = data.filter(x => x.date.getUTCFullYear() == 2019);
    const monthlyData = [];
    for (let i = 0; i < 13; i++) {
        monthlyData[i] = yearlyData.filter(x => x.date.getUTCMonth() == i);
    }
    const yearvalues = yearlyData.map(x => x.value);
    let monthvalues = [];
    let weekvalues = [];
    switch(month) {
        case 0:
            break;
        case 1:
            monthvalues = monthlyData[0].map(x => x.value);
            break;
        case 2:
            monthvalues = monthlyData[1].map(x => x.value);
            break;
        case 3:
            monthvalues = monthlyData[2].map(x => x.value);
            break;
        case 4:
            monthvalues = monthlyData[3].map(x => x.value);
            break;
        case 5:
            monthvalues = monthlyData[4].map(x => x.value);
            break;
        case 6:
            monthvalues = monthlyData[5].map(x => x.value);
            break;
        case 7:
            monthvalues = monthlyData[6].map(x => x.value);
            break;
        case 8:
            monthvalues = monthlyData[7].map(x => x.value);
            break;
        case 9:
            monthvalues = monthlyData[8].map(x => x.value);
            break;
        case 10:
            monthvalues = monthlyData[9].map(x => x.value);
            break;
        case 11:
            monthvalues = monthlyData[10].map(x => x.value);
            break;
        case 12:
            monthvalues = monthlyData[11].map(x => x.value);
            break;
        default:
            break;
    }

    if(week == 0) {
    } else {
        console.log(monthlyData[month-1]);        
        for(let item of monthlyData[month-1]) {
            if(getNumberOfWeek(item.date) === week) weekvalues.push(item.value);
        }
    }

    switch (switchkey) {
        case 0:
            values = yearvalues;
            resolution = 24 * 7;
            break;
        case 1:
            values = monthvalues;
            resolution = 24;
            break;
        case 2:
            values = weekvalues;
            resolution = 1;
            break;
        default:
            values = yearvalues;
            resolution = 24 * 7;
            break;
    }
    let dataPoints = [];

    for (let i = 0; i < values.length; i += resolution) {
        let total = 0;
        let count = 0;
        for (let j = 0; j < resolution; j++) {
            if (values[i + j] == undefined)
                break;

            total += values[i + j];
            count++;
        }

        dataPoints.push(total);
    }
    return dataPoints;
}

function chartClickEvent(evt, element) {
    if (!element || element.length == 0) return -1;
    const keys = Object.keys(element[0]);
    let pIndex = 0;
    for (let key of keys) {
        let temp = element[0][key];
        if (key == '_index') {
            pIndex = temp;
            break;
        }
    }
    return pIndex;
}

function convertEpochToDate(data) {
    const keys = Object.keys(data);
    for (let key of keys) {
        let d = data[key];
        d = convertBuildingToDate(d);
    }
    return data;
}

async function convertBuildingToDate(building) {
    for (let i = 0; i < building.length; i++) {
        building[i].date = convertToDate(building[i].date);
    }
    return building;
}

function convertToDate(date) {
    const nDate = new Date(date);
    return nDate;
}

async function fetchWaterConsum() {
    const data = await (await fetch("./waterconsum.json")).json();
    return data;
}

async function fetchMetaData() {
    const data = await (await fetch("./meta.json")).json();
    return data;
}

document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit();
});

function changeChartData(value) {
    console.log(value);
    let data;
    switch (value) {
        case "1":
            comparer = "apartments";

            data = generateData();
            updateCharts(data);
            setElementShown(chartDiv, true);
            setElementShown(tableDiv, false);

            break;
        case "2":
            comparer = "volume";

            data = generateData();
            updateCharts(data);
            setElementShown(chartDiv, true);
            setElementShown(tableDiv, false);

            break;
        case "3":
            comparer = "people";

            data = generateData();
            updateCharts(data);
            setElementShown(chartDiv, true);
            setElementShown(tableDiv, false);

            break;

        case "4":
            setElementShown(chartDiv, false);
            setElementShown(tableDiv, true);
            break;
    }

    charts.buildingCharts.forEach(item => {
        item.chart.update();
    })
}

function setElementShown(element, status) {
    element.style.display = (status) ? "block" : "none";
}

function showChart(index) {
    charts.buildingCharts.forEach(item => {
        setElementShown(item.hostDiv, false);
    });

    setElementShown(charts.buildingCharts[Number(index)].hostDiv, true);
}

const barcanvas = document.getElementById("bargraph");
const barctx = barcanvas.getContext("2d");
const bardata = [{
    h: 1,
    p: 26
}, {
    h: 2,
    p: 10
}, {
    h: 3,
    p: 30
}, {
    h: 4,
    p: 10
}, {
    h: 5,
    p: 29
}, {
    h: 6,
    p: 34
}, {
    h: 7,
    p: 20
}, {
    h: 8,
    p: 18
}, {
    h: 9,
    p: 18
}, {
    h: 10,
    p: 28
}, {
    h: 11,
    p: 30
}, {
    h: 12,
    p: 22
}, {
    h: 13,
    p: 39
}]

bardata.sort((a, b) => b.p - a.p);

const barchart = new Chart(barctx, {
    type: "bar",
    data: {
        labels: bardata.map(x => x.h),
        datasets: [{
            label: "Points",
            data: bardata.map(x => x.p),
            backgroundColor: ["rgba(255, 0, 0, 0.4)", "rgba(255, 120, 0, 0.4)", "rgba(0, 255, 0, 0.4)", null, null, null, null, null, null, "rgba(255, 120, 0, 0.4)", "rgba(255, 120, 0, 0.4)", "rgba(255, 0, 0, 0.4)", "rgba(255, 0, 0, 0.4)"]
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    }
})