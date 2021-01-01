// JavaScript source code
"use strict";

const TICK_INTERVAL = 0.0334;  // milliseconds, frame time, approx: 30fps
const URL_SERVER_STREAM = "";
var GLOBAL_INTERVAL_HANDLE = null;
var GLOBAL_IS_FETCHING = false;
var GLOBAL_FRAME_QUEUE = null;

class JPEG_Frame {
    constructor() {
        this.b64 = "";
        this.frameid = -1;
    }
}

function DrawFrame() {

}

function CB_FetchFrame_Pass(res) {
    if (res.status !== 200) {
        return 1;
    }
    return 0;
}

function CB_FetchFrame_Fail(err) {
    console.log(`Error on frame fetch:\n ${err.responseText}`);
}

function FetchFrame() {
    if (GLOBAL_IS_FETCHING) {
        return 1;
    }
    GLOBAL_IS_FETCHING = true;
    JQuery.ajax({
        url: URL_SERVER_STREAM,
        method: 'POST',
        data = '{}',
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
    console.log("stream running.");
    return 0;
}

function main(ev) {
    console.log("Stream script started.");
    // starting to ticking loop
    //GLOBAL_INTERVAL_HANDLE = setInterval(CB_RenderStreamLoop, TICK_INTERVAL);
    return 0;
}

document.addEventListener("DOMContentLoaded", function (ev) {
    main(ev);
});

console.log("loaded.");