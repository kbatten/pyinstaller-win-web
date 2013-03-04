/*global $, console*/
/*jslint browser: true*/
/*jslint plusplus: true, vars: true */


// https://github.com/dciccale/jslibraryboilerplate/blob/master/jslibraryboilerplate_vanilla.js
(function (window) {
    "use strict";

    var Uploader = function (url, filter) {
        // auto-create new instance without the 'new' keyword
        return new Uploader.prototype.init(url, filter);
    };

    Uploader.prototype = {
        constructor: Uploader,

        init : function (url, filter) {
            this.url = url;
            this.filter = filter;

            return this;
        },

        monitor_drop : function (selector) {
            $(selector).bind("dragover", false);
            var that = this;
            $(selector).bind("drop", function (evt) {
                evt.stopPropagation();
                evt.preventDefault();

                if (that.stage !== 0 || that.monitor_paused) {
                    return;
                }

                // uploading
                that.stage = 1;

                var dataTransfer = evt.dataTransfer || (evt.originalEvent && evt.originalEvent.dataTransfer);
                var f = dataTransfer.files[0]; // Grab just the first file as a File object
                var reader = new window.FileReader();

                // when file is done loading upload it
                reader.onload = function (e) {
                    var uri = "/upload";

                    var boundary = "----multipartFormBoundary" + Math.random();
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", uri, true);
                    xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

                    if (that.callback_success) {
                        xhr.onreadystatechange = function (evt) {
                            if (evt.target.readyState === 4) {
                                if (evt.target.status === 200) {
                                    that.callback_success(evt.target.responseText);
                                }
                            }
                        };
                    }
                    if (that.callback_progress) {
                        xhr.onprogress = function (evt) {
                            if (evt.lengthComputable) {
                                that.callback_progress(evt.loaded, evt.total);
                            }
                        };
                    }

                    var data = "--" + boundary + "\r\n";
                    data += "Content-Disposition: form-data; name=\"file\"; filename=\"" + f.name + "\"\r\n";
                    data += "Content-Type: application/octet-stream\r\n";
                    data += e.target.result + "\r\n";
                    data += "--" + boundary + "--";

                    xhr.send(data);

                    // finished uploading, reset
                    that.stage = 0;
                };
                reader.readAsText(f);
            });
        },

        success : function (callback_success) {
            this.callback_success = callback_success;
        },

        progress : function (callback_progress) {
            this.callback_progress = callback_progress;
        },

        toggle_monitor : function (state) {
            if (state === undefined) {
                // toggle
                this.monitor_paused = this.monitor_paused ? false : true;
            } else {
                this.monitor_paused = state ? true : false;
            }
        },

        url: "",
        filter: [],
        stage: 0,
        percent: 0,
        monitor_paused: false,
        callback_success: undefined,
        callback_progress: undefined
    };

  // the init method uses Wrangler prototype and constructor
    Uploader.prototype.init.prototype = Uploader.prototype;
    Uploader.prototype.init.prototype.constructor = Uploader;

     // expose to global object
    window.Uploader = Uploader;
}(window));
