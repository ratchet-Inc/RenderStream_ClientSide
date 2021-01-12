// JavaScript source code
"use strict";

//const TICK_INTERVAL = 0.0334;  // milliseconds, frame time, approx: 30fps
const TICK_INTERVAL = 34;
const URL_SERVER_STREAM = "fetchframe.php";
var GLOBAL_INTERVAL_HANDLE = null;
var GLOBAL_IS_FETCHING = false;
var GLOBAL_FRAME_QUEUE = null;
// index 0: canvas element, index 1: canvas context, index 2: buffering data storage
var RenderingCanvas = [null, null, { rot: 0, imgSrc: null }];

class JPEG_Frame {
    constructor(encoded, frame) {
        this.b64 = encoded;
        this.frameid = frame;
        this.img = null;
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
        DrawBuffering();
        return 1;
    }
    // frames might be shipped out of order, lets resolve that.
    resp.res.sort((a, b) => a.seq - b.seq);
    if (resp.res[resp.res.length - 1].frm !== "END FRAME") {
        console.log("incomplete frame found.");
        return 1;
    }
    var frame = "";
    for (var i = 0; i < resp.res.length - 1; i++) {
        frame += resp.res[i].frm;
    }
    GLOBAL_FRAME_QUEUE.AddFrame(new JPEG_Frame(frame, resp.res[0]['_']));
    console.log("last frame: " + resp.res[0]['_']);

    return 0;
}

function CB_FetchFrame_Fail(err) {
    console.log(`Error on frame fetch: ${err.responseText}\n`);
}

function FetchFrame() {
    if (GLOBAL_IS_FETCHING) {
        return 1;
    }
    GLOBAL_IS_FETCHING = true;
    jQuery.ajax({
        url: URL_SERVER_STREAM,
        method: 'POST',
        data: {"p": "none"},
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

function main(ev) {
    console.log("Stream script started.");
    RenderingCanvas[0] = document.getElementById("renderingCanvas");
    GLOBAL_FRAME_QUEUE = new Stream_Queue();
    // starting to ticking loop
    GLOBAL_INTERVAL_HANDLE = setInterval(CB_RenderStreamLoop, TICK_INTERVAL);
    return 0;
}

document.addEventListener("DOMContentLoaded", function (ev) {
    main(ev);
});

console.log("loaded.");