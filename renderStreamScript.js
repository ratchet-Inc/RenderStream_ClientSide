// JavaScript source code
"use strict";

//const TICK_INTERVAL = 0.0334;  // milliseconds, frame time, approx: 30fps
const TICK_INTERVAL = 34;
const URL_SERVER_STREAM = "fetchframe.php";
const FRAME_END_FLAG = "END FRAME";
var GLOBAL_STOP_STREAM_FLAG = false;
var GLOBAL_INTERVAL_HANDLE = null;
var GLOBAL_IS_FETCHING = false;
var GLOBAL_FRAME_QUEUE = null;
var FRAME_FETCH_INDEX = 0;
// index 0: canvas element, index 1: canvas context, index 2: buffering data storage
var RenderingCanvas = [null, null, { rot: 0, imgSrc: null }];

class JPEG_Frame {
    constructor(encoded, frame) {
        this.b64 = encoded;
        this.frameid = frame;
        this.img = null;
    }
    get GetFrameID() {
        return this.frameid;
    }
    get GetFrame() {
        if (this.img === null) {
            this.img = new Image();
            this.img.src = "data:image/jpg;base64," + this.b64;
        }
        return this.img;
    }
    get IsValid() {
        if (this.img === null) {
            return false;
        }
        return true;
    }
}

class Stream_Queue {
    constructor() {
        this.q = [];
        this.cur_frame = 0;
    }
    GetNextFrame() {
        if ((this.cur_frame + 1) < this.q.length) {
            this.cur_frame++;
            return this.q[this.cur_frame];
        }
        return null;
    }
    SeekFrame(frameID) {
        if (frameID < this.q.length) {
            this.cur_frame = frameID;
            return this.q[this.cur_frame];
        }
        return null;
    }
    AddFrame(frame) {
        this.q.push(frame);
    }
    get LastFrameID() {
        if (this.q.length === 0) {
            return -1;
        }
        return this.q[this.q.length - 1].GetFrameID;
    }
    get GetLastFrame() {
        if (this.q.length === 0) {
            return null;
        }
        return this.q[this.q.length - 1];
    }
    get GetStreamStats() {
        return null;
    }
}

function DrawBuffering(show = true) {
    if (show === false) {
        RenderingCanvas[2].rot = 0;
        RenderingCanvas[1].restore();
        return 0;
    }
    const imageName = "bufferingImage";
    if (RenderingCanvas[2].imgSrc === null) {
        RenderingCanvas[2].imgSrc = document.getElementById(imageName);
    }
    var rot = RenderingCanvas[2].rot * Math.PI / 180;
    RenderingCanvas[1].rotate(rot);
    var center1 = RenderingCanvas[2].imgSrc.width / 2;
    var center2 = RenderingCanvas[2].imgSrc.height / 2;
    RenderingCanvas[1].drawImage(RenderingCanvas[2].imgSrc, -center1, -center2);
    RenderingCanvas[2].rot += 1;
    if (RenderingCanvas[2].rot > 12) {
        RenderingCanvas[2].rot = RenderingCanvas[2].rot - 4;
    }

    return 0;
}

function DrawFrame() {
    if (RenderingCanvas[0] === null) {
        console.log("Canvas pointer is null.");
        return 1;
    }
    if (GLOBAL_FRAME_QUEUE === null) {
        console.log("frame queue is null.");
        return 1;
    }
    if (RenderingCanvas[1] === null) {
        RenderingCanvas[1] = RenderingCanvas[0].getContext("2d");
        RenderingCanvas[1].fillRect(0, 0, 800, 480);
        RenderingCanvas[1].translate(RenderingCanvas[0].width / 2, RenderingCanvas[0].height / 2);
        RenderingCanvas[1].save();
    }
    var ctx = RenderingCanvas[1];
    var img = GLOBAL_FRAME_QUEUE.GetNextFrame();
    if (img === null) {
        DrawBuffering();
        return 0;
    }
    DrawBuffering(false);
    var center1 = img.GetFrame.width / 2;
    var center2 = img.GetFrame.height / 2;
    ctx.drawImage(img.GetFrame, -center1, -center2);
    RenderingCanvas[1].save();
    console.log("drawn.");

    return 0;
}

function CB_FetchFrame_Pass(resp) {
    if (resp.status !== 200) {
        console.log(`Frame error: ${resp.msg}\n`);
        return 1;
    }
    if (GLOBAL_FRAME_QUEUE === null) {
        console.log(`Frame queue is null.\n`);
        return 1;
    }
    if (resp.res === undefined || resp.res.length === 0) {
        console.log("buffering...");
        /*DrawBuffering();*/
        return 1;
    }
    console.log(`response length: ${resp.res.length}`);
    // frames might be shipped out of order, lets resolve that.
    // sorting twice to arrange each frame and all its segments are in order.
    resp.res.sort((a, b) => a.seg - b.seg);
    resp.res.sort((a, b) => a["_"] - b["_"]);
    var frame = "";
    var frameCount = 0;
    for (var i = 0; i < resp.res.length; i++) {
        if (resp.res[i].frm === FRAME_END_FLAG) {
            if (frameCount !== resp.res[i].seg) {
                console.log("incomplete frame found.");
                var temp = GLOBAL_FRAME_QUEUE.GetNextFrame();
                if (temp !== null) {
                    // requeuing the frame so it appears at a stutter
                    GLOBAL_FRAME_QUEUE.AddFrame(temp);
                }
                frameCount = 0;
                frame = "";
                continue;
            }
            // a safegaurd against placing old frames into the queue.
            // it would be more efficient to skip the entire frame
            // parsing procedure instead of adding this hotfix
            if (resp.res[i]['_'] > GLOBAL_FRAME_QUEUE.LastFrameID) {
                GLOBAL_FRAME_QUEUE.AddFrame(new JPEG_Frame(frame, resp.res[i]['_']));
            }
            frameCount = 0;
            frame = "";
            continue;
        }
        frameCount++;
        frame += resp.res[i].frm;
    }
    // set the next fetched frame count to last fetched frame id + 1
    FRAME_FETCH_INDEX = GLOBAL_FRAME_QUEUE.LastFrameID + 1;

    return 0;
}

function CB_FetchFrame_Fail(err) {
    console.log(`Error on frame fetch: ${err.responseText}\n`);
}

function FetchFrame() {
    if (GLOBAL_STOP_STREAM_FLAG === true) {
        return 0;
    }
    if (GLOBAL_IS_FETCHING) {
        return 1;
    }
    GLOBAL_IS_FETCHING = true;
    jQuery.ajax({
        url: URL_SERVER_STREAM,
        method: 'POST',
        data: { "frame": FRAME_FETCH_INDEX },
        dataType: 'JSON',
        success: function (res) {
            GLOBAL_IS_FETCHING = false;
            CB_FetchFrame_Pass(res);
        },
        error: function (err) {
            GLOBAL_IS_FETCHING = false;
            CB_FetchFrame_Fail(err);
        }
    });
    return 0;
}

function CB_RenderStreamLoop() {
    FetchFrame();
    DrawFrame();
    return 0;
}

function CB_RenderStream() {
    FetchFrame();
    DrawFrame();
    if (GLOBAL_STOP_STREAM_FLAG === false) {
        setTimeout(CB_RenderStream, TICK_INTERVAL);
    }
    //GLOBAL_STOP_STREAM_FLAG = true;
}

function main(ev) {
    console.log("Stream script started.");
    RenderingCanvas[0] = document.getElementById("renderingCanvas");
    GLOBAL_FRAME_QUEUE = new Stream_Queue();
    // starting to ticking loop
    //GLOBAL_INTERVAL_HANDLE = setInterval(CB_RenderStreamLoop, TICK_INTERVAL);
    setTimeout(CB_RenderStream, 500);
    return 0;
}

document.addEventListener("DOMContentLoaded", function (ev) {
    main(ev);
    window.addEventListener("beforeunload", function (e) {
        GLOBAL_STOP_STREAM_FLAG = true;
        clearInterval(GLOBAL_INTERVAL_HANDLE);
        var seconds = new Date().getTime();
        while (GLOBAL_IS_FETCHING) {
            var cur = new Date().getTime();
            if ((cur - seconds) >= 350) {
                break;
            }
        }
    });
});

console.log("loaded.");