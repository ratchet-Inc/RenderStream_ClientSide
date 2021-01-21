"use strict";
var TICK_RATE = 1000 / 24; // 24 FPS, about 0.042 seconds of frame time
var URL_SERVER_STREAM = "fetchframe.php";
var FRAME_END_FLAG = "END FRAME";
var STREAM_END_FLAG = "STREAM END";
/**********************************************************************
 *              Global variables
*/
var GLOBAL_INTERVAL_HANDLE = -1;
var GLOBAL_STOP_STREAM_FLAG = false;
var GLOBAL_IS_FETCHING = false;
var GLOBAL_IS_PAUSED = false;
var GLOBAL_STREAM_QUEUE = null;
var GLOBAL_CANVAS_CONTEXT = null;
var GLOBAL_BUFFER_DATA = null;
var FRAME_FETCH_COUNT = 0;
var FrameObj = /** @class */ (function () {
    function FrameObj(b64Encoded, frameNum) {
        this.b64 = b64Encoded;
        this.frameID = frameNum;
        this.imageObj = new Image();
        this.imageObj.src = "data:image/png;base64," + this.b64;
    }
    Object.defineProperty(FrameObj.prototype, "GetFrame", {
        get: function () {
            if (this.imageObj === null) {
                this.imageObj = new Image();
                this.imageObj.src = "data:image/png;base64," + this.b64;
            }
            return this.imageObj;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameObj.prototype, "GetFrameRaw", {
        get: function () {
            return "data:image/png;base64," + this.b64;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameObj.prototype, "GetFrameID", {
        get: function () {
            return this.frameID;
        },
        enumerable: false,
        configurable: true
    });
    return FrameObj;
}());
var StreamQueue = /** @class */ (function () {
    function StreamQueue() {
        this.framesQueue = [];
        this.currentFrame = 0;
    }
    StreamQueue.prototype.AddFrame = function (frame) {
        this.framesQueue.push(frame);
    };
    StreamQueue.prototype.GetNextFrame = function () {
        if (this.currentFrame >= this.framesQueue.length) {
            return null;
        }
        var frame = this.framesQueue[this.currentFrame];
        this.currentFrame++;
        return frame;
    };
    StreamQueue.prototype.SeekFrame = function (frameNum) {
        if (frameNum < this.framesQueue.length) {
            this.currentFrame = frameNum;
            return true;
        }
        return false;
    };
    StreamQueue.prototype.GetLastFrame = function () {
        if (this.framesQueue.length > 0) {
            this.currentFrame = this.framesQueue.length - 1;
            return this.framesQueue[this.currentFrame];
        }
        return null;
    };
    StreamQueue.prototype.GetStreamSeconds = function (all) {
        if (all === void 0) { all = false; }
        var cFrame = this.currentFrame;
        if (all === true) {
            cFrame = this.framesQueue.length - 1;
        }
        var res = Math.round(cFrame / Math.round(1000 / TICK_RATE));
        return res;
    };
    Object.defineProperty(StreamQueue.prototype, "GetFrame", {
        get: function () {
            if (this.currentFrame < this.framesQueue.length) {
                return this.framesQueue[this.currentFrame];
            }
            return null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamQueue.prototype, "GetLastFrameID", {
        get: function () {
            if (this.framesQueue.length > 0) {
                var val = this.framesQueue.length - 1;
                return this.framesQueue[val].GetFrameID;
            }
            return -1;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamQueue.prototype, "GetFramesCount", {
        get: function () {
            return this.framesQueue.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StreamQueue.prototype, "GetCurrentFrame", {
        get: function () {
            return this.currentFrame;
        },
        enumerable: false,
        configurable: true
    });
    return StreamQueue;
}());
/*********************************************************************
**********************************************************************
*                          Playback Functions
*
*/
function SetupCanvas() {
    var ele1 = document.getElementById("renderingCanvas");
    if (ele1 === null) {
        return 1;
    }
    GLOBAL_CANVAS_CONTEXT = ele1.getContext("2d");
    if (GLOBAL_CANVAS_CONTEXT === null) {
        return 1;
    }
    GLOBAL_CANVAS_CONTEXT.fillRect(0, 0, ele1.offsetWidth, ele1.offsetHeight);
    GLOBAL_CANVAS_CONTEXT.translate(ele1.offsetWidth / 2, ele1.offsetHeight / 2);
    GLOBAL_CANVAS_CONTEXT.save();
    console.log("canvas: " + ele1.offsetWidth / 2 + "x" + ele1.offsetHeight / 2);
    GLOBAL_BUFFER_DATA = { "rot": 0, "img": null };
    var ele2 = document.getElementById("bufferingImage");
    if (ele2 !== null) {
        GLOBAL_BUFFER_DATA.img = ele2;
    }
    return 0;
}
function DrawBuffering() {
    if (GLOBAL_BUFFER_DATA === null || GLOBAL_BUFFER_DATA.img === null) {
        return 1;
    }
    var rot = GLOBAL_BUFFER_DATA.rot * Math.PI / 180;
    ;
    GLOBAL_BUFFER_DATA.rot += 12;
    if (GLOBAL_CANVAS_CONTEXT === null) {
        return 1;
    }
    GLOBAL_CANVAS_CONTEXT.rotate(rot);
    var cW = GLOBAL_BUFFER_DATA.img.offsetWidth / 2;
    var cH = GLOBAL_BUFFER_DATA.img.offsetHeight / 2;
    GLOBAL_CANVAS_CONTEXT.drawImage(GLOBAL_BUFFER_DATA.img, -cW, -cH);
    return 0;
}
function DrawFrame() {
    if (GLOBAL_STREAM_QUEUE === null || GLOBAL_CANVAS_CONTEXT === null) {
        return 1;
    }
    GLOBAL_CANVAS_CONTEXT.restore();
    var frame = GLOBAL_STREAM_QUEUE.GetNextFrame();
    if (frame === null) {
        return 0;
    }
    var cW = frame.GetFrame.offsetWidth / 2;
    var cH = frame.GetFrame.offsetHeight / 2;
    console.log("size: " + cW + "x" + cH);
    GLOBAL_CANVAS_CONTEXT.drawImage(frame.GetFrame, -401, -241, 800, 480);
    var ele = document.getElementById("frameCountInfo");
    if (ele !== null) {
        ele.innerHTML = GLOBAL_STREAM_QUEUE.GetCurrentFrame + "/" + GLOBAL_STREAM_QUEUE.GetFramesCount;
    }
    ele = document.getElementById("timeInfo");
    if (ele !== null) {
        var curTime = Math.round(GLOBAL_STREAM_QUEUE.GetCurrentFrame / TICK_RATE);
        var totTime = Math.round(GLOBAL_STREAM_QUEUE.GetFramesCount / TICK_RATE);
        ele.innerHTML = curTime + "/" + totTime;
    }
    return 0;
}
/********************************************************************/
/*********************************************************************
**********************************************************************
*                          Stream Functions
*
*/
function FetchPass(resp) {
    if (resp.status === undefined) {
        console.log("JSON response does not have a status code.");
        return 1;
    }
    if (resp.status !== 200) {
        console.log("Frame error: " + resp.msg + "\n");
        return 1;
    }
    if (resp.msg === STREAM_END_FLAG) {
        return 0;
    }
    if (GLOBAL_STREAM_QUEUE === null || resp.res === undefined || resp.res.length === 0) {
        return 1;
    }
    // frames might be shipped out of order, lets resolve that.
    // sorting twice to arrange each frame and all its segments are in order.
    resp.res.sort(function (a, b) { return a.seg - b.seg; });
    resp.res.sort(function (a, b) { return a._ - b._; });
    // transferring endoded segmens into a frame object
    // then queuing it into the payback stream.
    var encodedFrame = "";
    var frameCounter = 0;
    for (var i = 0; i < resp.res.length; ++i) {
        if (resp.res[i].frm === FRAME_END_FLAG) {
            if (frameCounter !== resp.res[i].seg) {
                console.log("*An incomplete frame was found.");
                var temp = GLOBAL_STREAM_QUEUE.GetLastFrame();
                if (temp !== null) {
                    GLOBAL_STREAM_QUEUE.AddFrame(temp);
                }
                frameCounter = 0;
                encodedFrame = "";
                continue;
            }
            if (resp.res[i]._ > GLOBAL_STREAM_QUEUE.GetLastFrameID) {
                GLOBAL_STREAM_QUEUE.AddFrame(new FrameObj(encodedFrame, resp.res[i]._));
            }
            frameCounter = 0;
            encodedFrame = "";
            continue;
        }
        frameCounter++;
        encodedFrame += resp.res[i].frm;
    }
    FRAME_FETCH_COUNT = GLOBAL_STREAM_QUEUE.GetLastFrameID + 1;
    return 0;
}
function FetchFail(err) {
    console.log("Stream error: " + err.responseText + "\n");
    return 0;
}
function FetchAsyncCallback(data, isValid) {
    GLOBAL_IS_FETCHING = false;
    if (isValid === true) {
        return FetchPass(data);
    }
    return FetchFail(data);
}
function FetchFrames() {
    if (GLOBAL_STOP_STREAM_FLAG) {
        return 1;
    }
    if (GLOBAL_IS_FETCHING) {
        return 0;
    }
    GLOBAL_IS_FETCHING = true;
    jQuery.ajax({
        url: URL_SERVER_STREAM,
        method: 'POST',
        data: { "frame": FRAME_FETCH_COUNT },
        dataType: 'JSON',
        success: function (resp) { FetchAsyncCallback(resp, true); },
        error: function (err) { FetchAsyncCallback(err, false); }
    });
    return 0;
}
/********************************************************************/
/*********************************************************************
**********************************************************************
*                          UI Controls
*
*/
function PausePlayCallback() {
    GLOBAL_IS_PAUSED = !GLOBAL_IS_PAUSED;
    jQuery("#pauseBtn").toggle();
    jQuery("#playBtn").toggle();
}
function SliderSeekCallback() {
    if (GLOBAL_STREAM_QUEUE === null) {
        return 1;
    }
    var val = Number(jQuery("#seekRange").val());
    if (val === undefined) {
        val = GLOBAL_STREAM_QUEUE.GetFramesCount;
    }
    val = (GLOBAL_STREAM_QUEUE.GetFramesCount / 100) * val;
    val = Math.round(val);
    GLOBAL_STREAM_QUEUE.SeekFrame(val);
    return 0;
}
function SetupControls() {
    jQuery(".renderDiv").hover(function () {
        jQuery(".StreamControls").show();
    }, function () {
        jQuery(".StreamControls").hide("fast");
    });
    jQuery(".PausePlayBtn").on("click", PausePlayCallback);
    jQuery("#seekRange").on("change", SliderSeekCallback);
}
/********************************************************************/
function TickCallback() {
    var start = new Date().getTime();
    if (!GLOBAL_IS_PAUSED) {
        DrawFrame();
    }
    FetchFrames();
    var stop = new Date().getTime();
    var sleepTime = TICK_RATE - (stop - start);
    if (sleepTime < 0) {
        sleepTime = 0;
    }
    GLOBAL_INTERVAL_HANDLE = setTimeout(TickCallback, sleepTime);
    return 0;
}
function mainTS() {
    console.log("TypeScript loaded.");
    GLOBAL_STOP_STREAM_FLAG = false;
    GLOBAL_IS_FETCHING = false;
    GLOBAL_STREAM_QUEUE = new StreamQueue();
    SetupCanvas();
    SetupControls();
    GLOBAL_INTERVAL_HANDLE = setTimeout(TickCallback, TICK_RATE);
    // our clean streaming cleanup
    window.addEventListener("beforeunload", function () {
        GLOBAL_STOP_STREAM_FLAG = true;
        if (GLOBAL_INTERVAL_HANDLE !== -1) {
            clearInterval(GLOBAL_INTERVAL_HANDLE);
        }
        // waiting 0.350 seconds to then force close async call.
        var seconds = new Date().getTime();
        while (GLOBAL_IS_FETCHING === true) {
            var cur = new Date().getTime();
            if ((cur - seconds) >= 350) {
                break;
            }
        }
    });
    return 0;
}
document.addEventListener("DOMContentLoaded", mainTS);
