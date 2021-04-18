



var agentIPInput = document.querySelector("#agent-ip");
var AGENT_IP = agentIPInput.value;

var connectBtn = document.querySelector("#connect-btn");
var startBtn = document.querySelector("#start-btn");
var stopBtn = document.querySelector("#stop-btn");
var cleanBtn = document.querySelector("#clean-btn");
var downloadBtn = document.querySelector("#download-btn");
var analyzeBtn = document.querySelector("#analyze-btn");

var connStateLabel = document.querySelector('#connect-state');
var runStateLabel = document.querySelector('#running-state');
// var roleLabel = document.querySelector('#role');
var codecLabel = document.querySelector('#codec');
// var bitrateLabel = document.querySelector('#bitrateSpan')

var info_box = document.querySelector('#info');

var RTTBox = document.querySelector('#RTT');
var ThroughputBox = document.querySelector('#Throughput');
var FrameDelayBox = document.querySelector('#frameDelay');

var timeLeftLabel = document.querySelector('#time-left');
var timeLeftBar = document.querySelector('#time-left-bar');
var timeSetBox = document.querySelector('#time-set');

var TRACE_BASE = "./traces/bandwidth/";
var bandwidth = [];
var bandPointer = 2;


connectBtn.disabled = false;
startBtn.disabled = true;
stopBtn.disabled = true;
downloadBtn.disabled = true;
analyzeBtn.disabled = true;

var ws_video;
var ws_agent;

var frame_count = 1;

var buf;

var frame_oneway_delay;
var AvgRTT;
var sending_throughput;

var data_ready_frameDelay = false;
var data_ready_rtt = false;
var data_ready_throughput = false;
var data_ready_bandwidth = false;

var traces;
var videos;

var trace_enable = document.getElementById("trace-enable");
var trace_select = document.getElementById("trace-select");
var method_select = document.getElementById("method-select");
var video_select = document.getElementById("video-select");


var use_trace = false;
var mahimahi_trace;
var video;
var method = 'origin';

//video recording
var mediaRecorder;
var recordedBlobs;
var stream_rendered;
var recordedBlobs;

var video_req;
var running_timer;

// 连接状态
var connected = false;

// 运行状态
var running = false;


//实验倒计时
var timeTotal = 30;
var timeLeft = timeTotal;
timeSetBox.value = "00:00:"+timeTotal;

// var canvas;
// var ctx;
// var videoWidth = 640;
// var videoHeight = 368;

function readBlobAsDataURL(blob, callback) {
    let reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(blob);
}


agentIPInput.onchange = function(event){
    AGENT_IP = this.value;
    console.log(AGENT_IP);
}

timeSetBox.onchange = function(event){

    var buf = this.value.split(":");
    var hourLeft = parseInt(buf[0]);
    var minuteLeft = parseInt(buf[1]);
    var secondLeft = parseInt(buf[2]);

    timeTotal = hourLeft*60*60 + minuteLeft*60 + secondLeft;
    timeLeft = timeTotal;
    // console.log(timeLeft);
    // timeLeft = this.value;
}

function getTraceData(jsonPath) {
    var request = new XMLHttpRequest();
    request.open("get", jsonPath);
    console.log(jsonPath);
    request.send(null);
    request.onload = function() {
        var json = JSON.parse(request.responseText);
        bandwidth = json["trace"];
    }
}

connectBtn.onclick = function(event){

    ws_agent = new WebSocket('ws://'+AGENT_IP+':9002');

    ws_agent.onopen = function(event) {
        console.log("trying to connect agent...");
        msg = {"cmd":"initialize"}
        ws_agent.send(JSON.stringify(msg));    
    };

    ws_agent.onmessage = function(event) {
        // console.log("size of recv data is ", event.data.size); 
        // console.log(event.data);

        msg = JSON.parse(event.data);
        console.log("============", msg)

        if(msg['cmd']=="initialize" && msg['result']=="success"){
            console.log("agent connect successfully!");
            connectBtn.disabled = true;
            startBtn.disabled = false; 
            switchState("已连接", "success", connStateLabel);
            switchState("VP8", "primary", codecLabel);

            traces = msg["traces"];
            trace_select.options.length=0;
            for(var i=0; i<traces.length; i++){
                trace_select.options.add(new Option(traces[i],i));
            }

            videos = msg["videos"];
            video_select.options.length=0;
            for(var i=0; i<videos.length; i++){
                video_select.options.add(new Option(videos[i],i));
            }

            // console.log('dsadsa');
            // console.log(method_select.options[method_select.selectedIndex].value)
            // console.log(traces[trace_select.options[trace_select.selectedIndex].value])
            mahimahi_trace = traces[trace_select.options[trace_select.selectedIndex].value];
            var jsonPath = TRACE_BASE + mahimahi_trace.split(".")[0] + ".json";
            getTraceData(jsonPath);
            use_trace = trace_enable.options[trace_enable.selectedIndex].value
            method = method_select.options[method_select.selectedIndex].value
            video = videos[video_select.options[video_select.selectedIndex].value];

            info.innerHTML = "Agent连接成功！";
            connected = true;
        }
        if(msg['cmd'] == "start-mahimahi"){
            if(msg['result'] == "success"){
                console.log("initial stream!");
                initial_stream();
                changeState("start");
                
            }else{
                console.log("start fail!");
                info.innerHTML = "程序启动失败！";
            }
        }

        if(msg['cmd'] == "start-raw"){
            if(msg['result'] == "success"){
                console.log("initial stream!");
                initial_stream();
                changeState("start");
            }else{
                console.log("start fail!");
                info.innerHTML = "程序启动失败！";
            }
        }

        if(msg['cmd'] == "stop"){
            if(msg['result'] == "success"){
                console.log("stop!");
                changeState("stop");

            }else{
                console.log("stop fail!");
                info.innerHTML = "程序终止失败！";
            }
        }

        if(msg['cmd'] == "clean"){
            if(msg['result'] == "success"){
                console.log("clean!");
                changeState("stop");
                info.innerHTML = "进程清理成功！";
            }else{
                console.log("stop fail!");
                info.innerHTML = "进程清理失败！";
            }
        }

        if(msg['cmd'] == "analyze"){
            var RTT_average = msg['RTT_average'];
            var throughput_average = msg['throughput_average'];
            var frame_delay_average = msg['frame_delay_average'];

            RTTBox.innerHTML = RTT_average + " ms";
            ThroughputBox.innerHTML = throughput_average + " Mbps";
            FrameDelayBox.innerHTML = frame_delay_average + " ms";
            info.innerHTML = "结果计算完成！";
        }

    };

    ws_agent.onclose = function(event) {
        connectBtn.disabled = false;
        // startBtn.disabled = true;
        // stopBtn.disabled = true;
        switchState("未连接", "default", connStateLabel) ;
        info.innerHTML = "agent连接已断开！";
        connected = false;
    };
}


function changeState(state){
    if(state=="start"){
        startBtn.disabled = true; 
        stopBtn.disabled = false;
        timeSetBox.disabled = true;
        info.innerHTML = "程序启动成功！";
        timeLeftBar.setAttribute("aria-valuenow",0);
        timeLeft = timeTotal;
        running = true;
    }else if(state=="stop"){
        startBtn.disabled = false; 
        stopBtn.disabled = true;
        timeSetBox.disabled = false;
        frame_count = 1;
        info.innerHTML = "程序终止！";
        running = false;
        cleanCharts();
        clearInterval(video_req); 
        clearInterval(running_timer);
    }
}

trace_enable.onchange = function(){
    if(this.selectedIndex>-1){
        if(this.options[this.selectedIndex].value==1){
            use_trace = true;
            // console.log(document.getElementById("trace-select-div").style.display);
            // trace_select.disabled = false;
            DisplayAndHiddenDiv("trace-select-div", "display");
            console.log("use trace!");
        }else{
            use_trace = false;
            // trace_select.disabled = true;
            DisplayAndHiddenDiv("trace-select-div", "hidden");
            console.log("not use trace!"+trace_select.style.display);
        }
    }
}



trace_select.onchange = function(){
    if(this.selectedIndex>-1){
        mahimahi_trace = traces[this.options[this.selectedIndex].value];
        console.log(mahimahi_trace);
        var jsonPath = TRACE_BASE + mahimahi_trace.split(".")[0] + ".json";
        getTraceData(jsonPath);
    }
}

video_select.onchange = function(){
    if(this.selectedIndex>-1){
        video = videos[this.options[this.selectedIndex].value];
        console.log(video);
    }
}

method_select.onchange = function(){
    if(this.selectedIndex>-1){
        method = this.options[this.selectedIndex].value;
        console.log(method);
    }
}


startBtn.onclick = function(event){

    if(!connected){
        info.innerHTML = "请先连接 agent！！！";
        return;
    }
    if(use_trace==false){
        msg = {}
        msg["cmd"] = "start-raw";
        msg["method"] = method;
        msg['video'] = video;
    }else{
        msg = {}
        msg["cmd"] = "start-mahimahi";
        msg["method"] = method;
        msg["trace"] = mahimahi_trace;
        msg['video'] = video;
    }
    console.log(JSON.stringify(msg));
    ws_agent.send(JSON.stringify(msg));  
    info.innerHTML = "程序启动中......";
    RTTBox.innerHTML = ""
    ThroughputBox.innerHTML = ""
    FrameDelayBox.innerHTML = ""
}

stopBtn.onclick = function(event){

    msg = {}
    msg["cmd"] = "stop";
    ws_agent.send(JSON.stringify(msg));  
    info.innerHTML = "程序终止中......";

    stopRecording();
    downloadBtn.disabled=false;
    analyzeBtn.disabled=false;
    clearInterval(video_req);
}

cleanBtn.onclick = function(event){
    if(!connected){
        info.innerHTML = "请先连接 agent！！！";
        return;
    }
    msg = {}
    msg["cmd"] = "clean";
    startBtn.disabled = false; 
    stopBtn.disabled = true;
    frame_count = 1;
    ws_agent.send(JSON.stringify(msg));
    clearInterval(video_req);
    info.innerHTML = "清理进程中......";  
}

downloadBtn.onclick = function(event){
  console.log("download clicked");
  const blob = new Blob(recordedBlobs, {type: 'video/'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  var fileName = prompt("请输入保存文件名:");
  if(fileName == "" || fileName == null){
    return 
  }
  a.download = fileName + '.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

analyzeBtn.onclick = function(event){
    msg = {}
    msg["cmd"] = "analyze";
    ws_agent.send(JSON.stringify(msg));
    info.innerHTML = "计算结果中......";  
}

function initial_stream(){
    ws_video = new WebSocket('ws://'+AGENT_IP+':9001');

    ws_video.onopen = function(event) {
        console.log("salsify receiver connected");
        ws_video.send(frame_count);
        frame_count += 1;
        stream_rendered = canvas.captureStream(30);  //30FPS
        startRecording(stream_rendered);
        
        video_req = setInterval(function(){
            ws_video.send(frame_count);
            frame_count += 1;
            // console.log("request a frame!!");
        }, 10);

        running_timer = setInterval(function(){
            if(timeLeft>1){
                timeLeft-=1; 
                // console.log("time left: "+timeLeft);
                timeLeftLabel.innerHTML = Math.round((timeTotal-timeLeft)*100/timeTotal);
                timeLeftBar.setAttribute("style","width: "+timeLeftLabel.innerHTML+"%;");
            }else{
                if(running==true){
                    timeLeftLabel.innerHTML = 100;
                    timeLeftBar.setAttribute("style","width: "+ 100 +"%;");
                    msg = {}
                    msg["cmd"] = "stop";
                    ws_agent.send(JSON.stringify(msg));  
                    info.innerHTML = "程序终止中......";
                    stopRecording();
                    downloadBtn.disabled=false;
                    analyzeBtn.disabled=false;
                    clearInterval(video_req); 
                    clearInterval(running_timer);
                }
            }
        }, 1000);

        // setTimeout(function(){
        //     ws_video.send(frame_count);
        //     frame_count += 1;
        //     console.log("request a frame!!");
        // },40);

    };

    ws_video.onmessage = function(event) {
    // console.log("size of recv data is ", event.data.size); 
    // console.log(event.data);

        buf = event.data;
        // print("recv data!!!");

        if(event.data.size > 1000){
            if (event.data instanceof Blob) {
                readBlobAsDataURL(event.data, function(dataURL) {
                    let canvas = document.getElementById("canvas");
                    let ctx = canvas.getContext("2d");
                    let img = new Image();
                    img.onload = function() {
                        ctx.drawImage(img, 0, 0, 1280, 720);
                    }
                    img.src = dataURL;
                    // console.log(dataURL);
                });
            }
        }else if(event.data.size > 1){
            var reader = new FileReader();
            reader.readAsText(event.data, 'utf-8');
            reader.onload = function () {
                var recv_data = JSON.parse(reader.result);
                // console.log(recv_data);    
                frame_oneway_delay = parseFloat(recv_data['frame_one_way_delay']);
                AvgRTT = parseFloat(recv_data['AvgRTT']);
                sending_throughput = parseFloat(recv_data['sending_throughput']);

                // console.log("AvgRTT = ", AvgRTT);
                data_ready_frameDelay = true;
                data_ready_rtt = true;
                data_ready_throughput = true;
                data_ready_bandwidth = true;
            }
        }

    }; 

    ws_video.onclose = function(event) {
        console.log("Disconnected");
    };

}


// video recording

function handleDataAvailable(event) {
  console.log('handleDataAvailable', event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function startRecording(stream) {
  recordedBlobs = [];
  var options = {mimeType: 'video/webm'};

  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e) {
    console.error('Exception while creating MediaRecorder:', e);
    return;
  }

  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

  downloadBtn.disabled = true;
  mediaRecorder.onstop = (event) => {
    console.log('Recorder stopped: ', event);
    console.log('Recorded Blobs: ', recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  // mediaRecorder.setVideoFrameRate(24);
  mediaRecorder.start();
  console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
}



//bandwidth
// var traces = [];
// function getTraceData(jsonPath) {
//     var request = new XMLHttpRequest();
//     request.open("get", jsonPath);
//     request.send(null);
//     request.onload = function() {
//     if(request.status == 200) {
//     var json = JSON.parse(request.responseText);
//     traces = json["trace"];
// }

// var jsonPath = "../traces/bandwidth/" + mahimahi_trace.split(".")[0] + ".json";
// getTraceData(jsonPath);



//charts

update_interval = 1000;

Highcharts.setOptions({
    global: {
            useUTC: false
    }
});

function activeLastPointToolip(chart) {
    var points = chart.series[0].points;
    chart.tooltip.refresh(points[points.length -1]);
}

var chart_RTT = Highcharts.chart('container_rtt', {
    chart: {
            type: 'spline',
            marginRight: 5,
            events: {
                    load: function () {
                            var series = this.series[0],
                                    chart = this;
                            // activeLastPointToolip(chart);
                            setInterval(function () {
                                    if(data_ready_rtt){
                                        var x = (new Date()).getTime(); // 当前时间
                                        var y = AvgRTT;      // 随机值
                                        series.addPoint([x, y], true, true);
                                        // activeLastPointToolip(chart);
                                        // activeLastPointToolip(chart);
                                        data_ready_rtt = false;
                                    }
                            }, update_interval);
                    }
            }
    },
    title: {
            text: 'RTT (ms)',
            style:{
                      color: '#000',
                      fontSize: '25px'
                  }
    },
    xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,

            // title:{
            //     text:'时间'
            // },

            labels:{

                style:{
                    // color: '#fff',
                    fontSize:'16px',
                    fontFamily:'微软雅黑'
                }
            }

    },
    yAxis: {
            title: {
                    text: null
            },
            labels:{
                style:{
                    // color: '#fff',
                    fontSize:'25px',
                    fontFamily:'微软雅黑'
                }
            }
    },

    legend: {
            enabled: false
    },

    plotOptions: {
        series: {
            marker: {
            enabled: false
            }
        },
        spline: {
            lineWidth: 3,
            lineColor:'#aa0000'
        }
    },
    series: [{
            // name: '随机数据',
            data: (function () {
                    // 生成随机值
                    var data = [],
                            time = (new Date()).getTime(),
                            i;
                    for (i = -50; i <= 0; i += 1) {
                            data.push({
                                    x: time + i * update_interval,
                                    y: 0
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
                            // activeLastPointToolip(chart);
                            setInterval(function () {
                                if(data_ready_throughput){
                                    var x = (new Date()).getTime(); // 当前时间
                                    var y = sending_throughput;      
                                    series.addPoint([x, y], true, true);
                                    data_ready_throughput = false;
                                }          
                                    // activeLastPointToolip(chart);
                            }, update_interval);
                    }
            }
    },
    title: {
            text: 'Sending Rate (Mbps)',
            style:{
                      color: '#000',
                      fontSize: '25px'
                  }
    },
    xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,

            labels:{
                style:{
                    // color: '#fff',
                    fontSize:'16px',
                    fontFamily:'微软雅黑'
                }
            }
    },
    yAxis: {
            title: {
                    text: null
            },
            labels:{
                style:{
                    // color: '#fff',
                    fontSize:'25px',
                    fontFamily:'微软雅黑'
                }
            }

    },
    legend: {
            enabled: false
    },

    plotOptions: {
        series: {
            marker: {
            enabled: false
            }
        },
        spline: {
            lineWidth: 3,
            lineColor:'#aa0000'
        }
    },
    series: [{
            // name: '随机数据',
            data: (function () {
                    // 生成随机值
                    var data = [],
                            time = (new Date()).getTime(),
                            i;
                    for (i = -50; i <= 0; i += 1) {
                            data.push({
                                    x: time + i * update_interval,
                                    y: 0
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
                            // activeLastPointToolip(chart);
                            setInterval(function () {
                                    if(data_ready_frameDelay){
                                        var x = (new Date()).getTime(); // 当前时间
                                        var y = frame_oneway_delay;      
                                        series.addPoint([x, y], true, true);
                                        // activeLastPointToolip(chart);
                                        data_ready_frameDelay = false;
                                    }

                            }, update_interval);
                    }
            }
    },
    title: {
            text: 'frame-level 端到端时延 (ms)',
            style:{
                      color: '#000',
                      fontSize: '25px'
                  }
    },
    xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,

            labels:{
                style:{
                    // color: '#fff',
                    fontSize:'16px',
                    fontFamily:'微软雅黑'
                }
            }
    },
    yAxis: {
            title: {
                    text: null
            },
            labels:{
                style:{
                    // color: '#fff',
                    fontSize:'25px',
                    fontFamily:'微软雅黑'
                }
            }

    },
    legend: {
            enabled: false
    },

    plotOptions: {
        series: {
            marker: {
            enabled: false
            }
        },
        spline: {
            lineWidth: 3,
            lineColor:'#aa0000'
        }
    },
    series: [{
            // name: '随机数据',
            data: (function () {
                    // 生成随机值
                    var data = [],
                            time = (new Date()).getTime(),
                            i;
                    for (i = -50; i <= 0; i += 1) {
                            data.push({
                                    x: time + i * update_interval,
                                    y: 0
                            });
                    }
                    return data;
            }())
    }]
});


var chart_bandwidth = Highcharts.chart('container_bandwidth', {
    chart: {
            type: 'spline',
            marginRight: 5,
            events: {
                    load: function () {
                            var series = this.series[0],
                                    chart = this;
                            // activeLastPointToolip(chart);
                            setInterval(function () {

                                    if(data_ready_bandwidth){
                                        var x = (new Date()).getTime(); // 当前时间

                                        if(bandPointer<bandwidth.length){
                                            var y = bandwidth[bandPointer];
                                        }else{
                                            bandPointer = 0;
                                            var y = bandwidth[bandPointer];
                                        }
                                              
                                        series.addPoint([x, y], true, true);
                                        // activeLastPointToolip(chart);
                                        // data_ready_frameDelay = false;
                                        bandPointer+=1;
                                        data_ready_bandwidth = false;
                                    }

                            }, update_interval);
                    }
            }
    },
    title: {
            text: 'Bandwidth (Mbps)',
            style:{
                      color: '#000',
                      fontSize: '25px'
                  }
    },
    xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,

            labels:{
                style:{
                    // color: '#fff',
                    fontSize:'16px',
                    fontFamily:'微软雅黑'
                }
            }
    },
    yAxis: {
            title: {
                    text: null
            },
            labels:{
                style:{
                    // color: '#fff',
                    fontSize:'25px',
                    fontFamily:'微软雅黑'
                }
            }

    },
    legend: {
            enabled: false
    },

    plotOptions: {
        series: {
            marker: {
            enabled: false
            }
        },
        spline: {
            lineWidth: 3,
            lineColor:'#aa0000'
        }
    },
    series: [{
            // name: '随机数据',
            data: (function () {
                    // 生成随机值
                    var data = [],
                            time = (new Date()).getTime(),
                            i;
                    for (i = -50; i <= 0; i += 1) {
                            data.push({
                                    x: time + i * update_interval,
                                    y: 0
                            });
                    }
                    return data;
            }())
    }]
});



function cleanCharts(){

    // for(var i = 0;i<chart_RTT.series.length;i++)
    // {
    //      chart_RTT.series[i].data = function () {
    //                 // 生成随机值
    //                 var data = [],
    //                         time = (new Date()).getTime(),
    //                         i;
    //                 for (i = -50; i <= 0; i += 1) {
    //                         data.push({
    //                                 x: time + i * update_interval,
    //                                 y: 0
    //                         });
    //                 }
    //                 return data;
    //         }
    // }
}











