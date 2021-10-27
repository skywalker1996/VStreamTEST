var connectBtn = document.querySelector("#connect-btn");
var startBtn = document.querySelector("#start-btn");
var stopBtn = document.querySelector("#stop-btn");

var connStateLabel = document.querySelector('#connect-state');
var runStateLabel = document.querySelector('#running-state');
// var roleLabel = document.querySelector('#role');
// var codecLabel = document.querySelector('#codec');
// var bitrateLabel = document.querySelector('#bitrateSpan')


connectBtn.disabled = false;
startBtn.disabled = true;
stopBtn.disabled = true;

var ws_video;
var ws_agent;

var frame_count = 1;


// var canvas;
// var ctx;
// var videoWidth = 640;
// var videoHeight = 368;


connectBtn.onclick = function (event) {

    ws_agent = new WebSocket('ws://192.168.0.164:9002');

    ws_agent.onopen = function (event) {
        console.log("Agent Connected");
        msg = {"cmd": "check-state"}
        ws.send(JSON.stringify(msg));
        connectBtn.disabled = true;
    };


    ws_agent.onmessage = function (event) {
        // console.log("size of recv data is ", event.data.size); 
        // console.log(event.data);

        msg = JSON.parse(event.data);

        if (msg['cmd'] == "start-raw"):
        if (msg['result'] == "success"):


    };

    ws_agent.onclose = function (event) {
        // console.log("size of recv data is ", event.data.size); 
        // console.log(event.data);


    };
}


function initial_stream() {
    ws_video = new WebSocket('ws://192.168.0.164:9001');

    ws.onopen = function (event) {
        console.log("Connected");
        ws.send(frame_count);
        frame_count += 1;
    };


}


var buf;

var frame_oneway_delay;
var AvgRTT;
var sending_throughput;

var data_ready_frameDelay = false;
var data_ready_rtt = false;
var data_ready_throughput = false;

function readBlobAsDataURL(blob, callback) {
    let reader = new FileReader();
    reader.onload = function (e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(blob);
}

ws.onopen = function (event) {
    console.log("Connected");


    ws.send(frame_count);
    frame_count += 1;
};

ws.onmessage = function (event) {
    // console.log("size of recv data is ", event.data.size); 
    // console.log(event.data);
    setTimeout(function () {
        ws.send(frame_count);
        frame_count += 1;
    }, 40);

    buf = event.data;

    if (event.data.size > 1000) {
        if (event.data instanceof Blob) {
            readBlobAsDataURL(event.data, function (dataURL) {
                let canvas = document.getElementById("canvas");
                let ctx = canvas.getContext("2d");
                let img = new Image();
                img.onload = function () {
                    ctx.drawImage(img, 0, 0, 1280, 720);
                }
                img.src = dataURL;
                // console.log(dataURL);
            });
        }
    } else if (event.data.size > 1) {
        var reader = new FileReader();
        reader.readAsText(event.data, 'utf-8');
        reader.onload = function () {
            var recv_data = JSON.parse(reader.result);
            console.log(recv_data);
            frame_oneway_delay = parseFloat(recv_data['frame_one_way_delay']);
            AvgRTT = parseFloat(recv_data['AvgRTT']);
            sending_throughput = parseFloat(recv_data['sending_throughput']);

            // console.log("AvgRTT = ", AvgRTT);
            data_ready_frameDelay = true;
            data_ready_rtt = true;
            data_ready_throughput = true;

        }
    }

};


ws.onclose = function (event) {
    console.log("Disconnected");
}


Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

function activeLastPointToolip(chart) {
    var points = chart.series[0].points;
    chart.tooltip.refresh(points[points.length - 1]);
}

var chart_RTT = Highcharts.chart('container_rtt', {
    chart: {
        type: 'spline',
        marginRight: 5,
        events: {
            load: function () {
                var series = this.series[0],
                    chart = this;
                activeLastPointToolip(chart);
                setInterval(function () {
                    if (data_ready_rtt) {
                        var x = (new Date()).getTime(); // 当前时间
                        var y = AvgRTT;      // 随机值
                        series.addPoint([x, y], true, true);
                        // activeLastPointToolip(chart);
                        activeLastPointToolip(chart);
                        data_ready_rtt = false;

                    }

                }, 1000);
            }
        }
    },
    title: {
        text: 'RTT (ms)'
    },
    xAxis: {
        type: 'datetime',
        tickPixelInterval: 150,

        // title:{
        //     text:'时间'
        // },

        labels: {

            style: {
                // color: '#fff',
                fontSize: '16px',
                fontFamily: '微软雅黑'
            }
        }

    },
    yAxis: {
        title: {
            text: null
        },
        labels: {
            style: {
                // color: '#fff',
                fontSize: '16px',
                fontFamily: '微软雅黑'
            }
        }
    },

    legend: {
        enabled: false
    },
    series: [{
        // name: '随机数据',
        data: (function () {
            // 生成随机值
            var data = [],
                time = (new Date()).getTime(),
                i;
            for (i = -19; i <= 0; i += 1) {
                data.push({
                    x: time + i * 1000,
                    y: Math.random()
                });
            }
            return data;
        }())
    }]
});


var chart_throughput = Highcharts.chart('container_throughput', {
    chart: {
        type: 'spline',
        marginRight: 5,
        events: {
            load: function () {
                var series = this.series[0],
                    chart = this;
                activeLastPointToolip(chart);
                setInterval(function () {
                    if (data_ready_throughput) {
                        var x = (new Date()).getTime(); // 当前时间
                        var y = sending_throughput;      // 随机值
                        series.addPoint([x, y], true, true);
                        data_ready_throughput = false;
                    }
                    // activeLastPointToolip(chart);
                }, 1000);
            }
        }
    },
    title: {
        text: 'Sending Throughput (Mbps)'
    },
    xAxis: {
        type: 'datetime',
        tickPixelInterval: 150,

        labels: {
            style: {
                // color: '#fff',
                fontSize: '16px',
                fontFamily: '微软雅黑'
            }
        }
    },
    yAxis: {
        title: {
            text: null
        },
        labels: {
            style: {
                // color: '#fff',
                fontSize: '16px',
                fontFamily: '微软雅黑'
            }
        }

    },
    legend: {
        enabled: false
    },
    series: [{
        // name: '随机数据',
        data: (function () {
            // 生成随机值
            var data = [],
                time = (new Date()).getTime(),
                i;
            for (i = -19; i <= 0; i += 1) {
                data.push({
                    x: time + i * 1000,
                    y: Math.random()
                });
            }
            return data;
        }())
    }]
});


var chart_e2eDelay = Highcharts.chart('container_e2eDelay', {
    chart: {
        type: 'spline',
        marginRight: 5,
        events: {
            load: function () {
                var series = this.series[0],
                    chart = this;
                activeLastPointToolip(chart);
                setInterval(function () {
                    if (data_ready_frameDelay) {
                        var x = (new Date()).getTime(); // 当前时间
                        var y = frame_oneway_delay;      // 随机值
                        series.addPoint([x, y], true, true);
                        // activeLastPointToolip(chart);
                        data_ready_frameDelay = false;
                    }

                }, 1000);
            }
        }
    },
    title: {
        text: 'frame-level 端到端时延 (ms)'
    },
    xAxis: {
        type: 'datetime',
        tickPixelInterval: 150,

        labels: {
            style: {
                // color: '#fff',
                fontSize: '16px',
                fontFamily: '微软雅黑'
            }
        }
    },
    yAxis: {
        title: {
            text: null
        },
        labels: {
            style: {
                // color: '#fff',
                fontSize: '16px',
                fontFamily: '微软雅黑'
            }
        }

    },
    legend: {
        enabled: false
    },
    series: [{
        // name: '随机数据',
        data: (function () {
            // 生成随机值
            var data = [],
                time = (new Date()).getTime(),
                i;
            for (i = -19; i <= 0; i += 1) {
                data.push({
                    x: time + i * 1000,
                    y: Math.random()
                });
            }
            return data;
        }())
    }]
});











